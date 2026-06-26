import crypto from "node:crypto";

import OpenAI from "openai";

import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import {
  clientFailure,
  clientJson,
  getScopedClient,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  isClientUuid,
  validateClientDocument,
} from "@/lib/lawyerClients/clientValidation";
import { incrementUsage } from "@/lib/planUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

function pathFromPublicUrl(value) {
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/crm_documents/";
    const index = url.pathname.indexOf(marker);
    return index >= 0
      ? decodeURIComponent(url.pathname.slice(index + marker.length))
      : "";
  } catch {
    return "";
  }
}

async function classifyDocument(fileName) {
  if (!openai) return { type: "Outros", tags: ["Documento"] };
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Classifique nomes de arquivos jurídicos brasileiros. Responda apenas JSON válido.",
        },
        {
          role: "user",
          content: `Classifique o arquivo "${fileName}" em Petição, Contrato, Sentença, Procuração ou Outros e gere até 3 tags. Formato: {"type":"Outros","tags":["Documento"]}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return {
      type: String(parsed.type || "Outros").slice(0, 60),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.slice(0, 3).map((tag) => String(tag).slice(0, 40))
        : ["Documento"],
    };
  } catch (error) {
    console.error("[CRM/Documentos] Classificação AI:", error);
    return { type: "Outros", tags: ["Documento"] };
  }
}

export async function POST(request, context) {
  let uploadedPath = null;
  let access = null;
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const client = await getScopedClient(access, id, "id, lawyer_id, name");
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const protect = formData.get("protect") === "true";
    const requestId = String(formData.get("requestId") || "");
    const validation = validateClientDocument(file);
    if (!validation.valid) {
      return clientJson(
        { success: false, message: validation.errors.file },
        400,
      );
    }

    const fileSizeMb = validation.size / 1024 / 1024;
    if (!access.planLimits?.canUploadDocs(fileSizeMb)) {
      return clientJson(
        {
          success: false,
          storageExceeded: true,
          message: "O limite de armazenamento do seu plano foi atingido.",
        },
        403,
      );
    }
    if (
      protect &&
      access.planType !== "PRO" &&
      Number(access.profile.balance || 0) < 3
    ) {
      return clientJson(
        {
          success: false,
          insufficientCredits: true,
          message: "A blindagem requer 3 Juris no plano START.",
        },
        402,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = protect
      ? crypto.createHash("sha512").update(bytes).digest("hex")
      : null;
    uploadedPath = `${access.user.id}/${client.id}/${crypto.randomUUID()}.${validation.extension}`;
    const { error: uploadError } = await access.db.storage
      .from("crm_documents")
      .upload(uploadedPath, bytes, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = access.db.storage
      .from("crm_documents")
      .getPublicUrl(uploadedPath);
    const aiData = await classifyDocument(validation.fileName);
    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await access.db
      .from("crm_documents")
      .insert([
        {
          id: documentId,
          client_id: client.id,
          lawyer_id: access.user.id,
          file_name: validation.fileName,
          file_url: publicData.publicUrl,
          doc_type: aiData.type,
          tags: aiData.tags,
          is_blindado: protect,
          hash_sha512: hash,
          upload_ip: protect
            ? request.headers.get("cf-connecting-ip") ||
              request.headers.get("x-real-ip") ||
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
              "unknown"
            : null,
          user_agent: protect ? request.headers.get("user-agent") || null : null,
          created_at: now,
        },
      ])
      .select(
        "id, file_name, doc_type, tags, is_blindado, hash_sha512, created_at",
      )
      .single();
    if (error) throw error;

    await incrementUsage(access.db, access.user.id, "uso_storage_mb", fileSizeMb);
    if (protect && access.planType !== "PRO") {
      const oldBalance = Number(access.profile.balance || 0);
      const newBalance = oldBalance - 3;
      await access.db
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", access.user.id);
      await checkAndNotifyLowBalance(access.user.id, oldBalance, newBalance);
    }

    await recordClientAudit(access, request, {
      requestId,
      clientId: client.id,
      action: protect ? "PROTECT_DOCUMENT" : "ADD_DOCUMENT",
      metadata: {
        document_id: documentId,
        file_size_mb: Number(fileSizeMb.toFixed(3)),
        document_type: aiData.type,
      },
    });

    return clientJson(
      {
        success: true,
        message: protect
          ? "Documento blindado e anexado."
          : "Documento anexado com sucesso.",
        data: {
          id: data.id,
          fileName: data.file_name,
          fileUrl: `/api/advogado/clientes/${client.id}/documentos/${data.id}/arquivo`,
          documentType: data.doc_type,
          tags: data.tags || [],
          protected: Boolean(data.is_blindado),
          hash: data.hash_sha512 || null,
          createdAt: data.created_at,
        },
      },
      201,
    );
  } catch (error) {
    if (uploadedPath && access?.db) {
      await access.db.storage
        .from("crm_documents")
        .remove([uploadedPath])
        .catch(() => null);
    }
    console.error("[Advogado/Clientes/Documentos][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível anexar o documento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function DELETE(request, context) {
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const client = await getScopedClient(access, id, "id, lawyer_id");
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const body = await request.json();
    const documentId = String(body.documentId || "");
    if (!isClientUuid(documentId)) {
      return clientJson(
        { success: false, message: "Documento inválido." },
        400,
      );
    }

    const { data: document, error: documentError } = await access.db
      .from("crm_documents")
      .select(
        "id, lawyer_id, client_id, file_url, storage_bucket, storage_path, file_size_bytes",
      )
      .eq("id", documentId)
      .eq("client_id", client.id)
      .maybeSingle();
    if (documentError) throw documentError;
    if (!document) {
      return clientJson(
        { success: false, message: "Documento não encontrado." },
        404,
      );
    }

    const bucket = document.storage_bucket || "crm_documents";
    const storagePath = document.storage_path || pathFromPublicUrl(document.file_url);
    if (storagePath && !storagePath.includes("..")) {
      const { error: storageError } = await access.db.storage
        .from(bucket)
        .remove([storagePath]);
      if (storageError) throw storageError;
    }

    const { error } = await access.db
      .from("crm_documents")
      .delete()
      .eq("id", document.id)
      .eq("client_id", client.id);
    if (error) throw error;

    const fileSizeMb = Number(document.file_size_bytes || 0) / 1024 / 1024;
    if (fileSizeMb > 0) {
      const { error: usageError } = await access.db.rpc(
        "release_smartdoc_storage",
        {
          p_lawyer_id: document.lawyer_id,
          p_file_size_mb: fileSizeMb,
        },
      );
      if (usageError) {
        console.error("[CRM/Documentos] Falha ao liberar armazenamento:", usageError);
      }
    }

    await recordClientAudit(access, request, {
      requestId: body.requestId,
      clientId: client.id,
      action: "DELETE_DOCUMENT",
      metadata: {
        document_id: document.id,
        storage_bucket: bucket,
        file_size_mb: Number(fileSizeMb.toFixed(4)),
      },
    });

    return clientJson({ success: true, message: "Documento excluído." });
  } catch (error) {
    console.error("[Advogado/Clientes/Documentos][DELETE] Erro:", error);
    const failure = clientFailure(error, "Não foi possível excluir o documento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
