import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  getScopedClient,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storagePathFromPublicUrl(value) {
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

function safeFileName(value) {
  return (
    String(value || "documento")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._ -]/g, "")
      .trim()
      .slice(0, 150) || "documento"
  );
}

function contentType(fileName) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (["jpg", "jpeg"].includes(extension)) return "image/jpeg";
  if (extension === "doc") return "application/msword";
  if (extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function GET(request, context) {
  try {
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { id, documentId } = await context.params;
    if (!isClientUuid(id) || !isClientUuid(documentId)) {
      return clientJson(
        { success: false, message: "Documento inválido." },
        400,
      );
    }

    const client = await getScopedClient(access, id, "id, lawyer_id");
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const { data: document, error } = await access.db
      .from("crm_documents")
      .select(
        "id, client_id, lawyer_id, file_name, file_url, storage_bucket, storage_path",
      )
      .eq("id", documentId)
      .eq("client_id", client.id)
      .maybeSingle();
    if (error) throw error;
    if (!document) {
      return clientJson(
        { success: false, message: "Documento não encontrado." },
        404,
      );
    }

    const bucket = document.storage_bucket || "crm_documents";
    const storagePath =
      document.storage_path || storagePathFromPublicUrl(document.file_url);
    if (!storagePath || storagePath.includes("..")) {
      return clientJson(
        { success: false, message: "Arquivo não localizado." },
        404,
      );
    }

    const { data: file, error: downloadError } = await access.db.storage
      .from(bucket)
      .download(storagePath);
    if (downloadError || !file) {
      throw downloadError || new Error("Arquivo não localizado no storage.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());

    await recordClientAudit(access, request, {
      requestId: crypto.randomUUID(),
      clientId: client.id,
      action: "DOWNLOAD_DOCUMENT",
      metadata: {
        document_id: document.id,
        storage_bucket: bucket,
      },
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType(document.file_name),
        "Content-Disposition": `inline; filename="${safeFileName(document.file_name)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Advogado/Clientes/Documento/Arquivo] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar o documento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
