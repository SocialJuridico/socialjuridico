import crypto from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase";

import {
  applySignatureScope,
  generateSignatureVerificationCode,
  getSignaturePublicStorageUrl,
  hasValidSignatureMutationOrigin,
  isOwnedSignatureUploadPath,
  readSignatureStorageFile,
  requireDigitalSignatureAccess,
  serializeDashboardSignature,
  serializePublicSigningSignature,
  serializePublicValidationSignature,
  signatureJson,
  signatureServerFailure,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureEmail,
  isValidSignatureUuid,
  isValidVerificationCode,
  normalizeSignatureEmail,
  normalizeSignatureRole,
  normalizeSignatureText,
  sanitizeSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

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

async function uniqueVerificationCode(db) {
  for (let index = 0; index < 8; index += 1) {
    const code = generateSignatureVerificationCode();
    const { count, error } = await db
      .from("assinaturas_digitais")
      .select("id", { count: "exact", head: true })
      .eq("verification_code", code);
    if (error) throw error;
    if (!count) return code;
  }
  throw new Error("Não foi possível gerar um código de verificação.");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const code = String(searchParams.get("code") || "").toUpperCase().trim();
    const role = normalizeSignatureRole(searchParams.get("role"));

    if (code) {
      if (!isValidVerificationCode(code)) {
        return signatureJson(
          { success: false, message: "Código de validação inválido." },
          400,
        );
      }
      const { data, error } = await supabaseAdmin
        .from("assinaturas_digitais")
        .select(
          "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at",
        )
        .eq("verification_code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return signatureJson(
          { success: false, message: "Documento não encontrado." },
          404,
        );
      }
      return signatureJson({
        success: true,
        data: serializePublicValidationSignature(data),
      });
    }

    if (id) {
      if (!isValidSignatureUuid(id)) {
        return signatureJson(
          { success: false, message: "Link de assinatura inválido." },
          400,
        );
      }
      const { data, error } = await supabaseAdmin
        .from("assinaturas_digitais")
        .select(
          "id, document_name, document_type, verification_code, status, metadata, created_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return signatureJson(
          { success: false, message: "Assinatura não encontrada." },
          404,
        );
      }
      const publicData = role
        ? serializePublicSigningSignature(data, role)
        : {
            id: data.id,
            document_name: data.document_name,
            document_type: data.document_type,
            verification_code: data.verification_code,
            status: data.status,
            created_at: data.created_at,
            metadata: sanitizeSignatureMetadata(data.metadata, {
              maskSensitive: true,
            }),
            document_url: `/api/crm/assinatura/proxy-pdf?id=${data.id}`,
          };
      return signatureJson({ success: true, data: publicData });
    }

    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;
    let query = access.db
      .from("assinaturas_digitais")
      .select(
        "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at, updated_at",
      );
    query = applySignatureScope(query, access.lawyerIds);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return signatureJson({
      success: true,
      data: (data || []).map(serializeDashboardSignature),
    });
  } catch (error) {
    console.error("[CRM/Assinatura][GET] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível consultar a assinatura.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}

export async function POST(request) {
  try {
    if (!hasValidSignatureMutationOrigin(request)) {
      return signatureJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json();
    const documentName = normalizeSignatureText(body.document_name, 180);
    const documentType = ["contrato", "procuracao", "outro"].includes(
      body.document_type,
    )
      ? body.document_type
      : "contrato";
    const clientName = normalizeSignatureText(body.client_name, 140);
    const clientEmail = normalizeSignatureEmail(body.client_email);
    const clientId = isValidSignatureUuid(body.client_id) ? body.client_id : null;
    const uploadPath = storagePathFromPublicUrl(body.document_url);

    if (
      documentName.length < 3 ||
      clientName.length < 2 ||
      !isValidSignatureEmail(clientEmail)
    ) {
      return signatureJson(
        { success: false, message: "Campos obrigatórios ausentes ou inválidos." },
        400,
      );
    }
    if (!isOwnedSignatureUploadPath(uploadPath, access.user.id)) {
      return signatureJson(
        { success: false, message: "Documento enviado não autorizado." },
        403,
      );
    }

    const fileBuffer = await readSignatureStorageFile(uploadPath);
    if (!fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return signatureJson(
        { success: false, message: "Documento PDF inválido." },
        400,
      );
    }
    const originalHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");
    const verificationCode = await uniqueVerificationCode(access.db);
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    const metadata = {
      request_id: requestId,
      storage: { original_path: uploadPath, signed_path: null },
      lawyer: {
        name: access.profile.name || "Advogado",
        email: access.profile.email,
        signed: false,
        signed_at: null,
        ip: null,
        user_agent: null,
        otp_hash: null,
        otp_expires: null,
        otp_attempts: 0,
      },
      client: {
        name: clientName,
        email: clientEmail,
        signed: false,
        signed_at: null,
        ip: null,
        user_agent: null,
        otp_hash: null,
        otp_expires: null,
        otp_attempts: 0,
      },
      history: [
        {
          event: "created",
          timestamp: now,
          details: "Processo de assinatura digital iniciado.",
        },
      ],
    };

    const { data, error } = await access.db
      .from("assinaturas_digitais")
      .insert([
        {
          request_id: requestId,
          lawyer_id: access.user.id,
          client_id: clientId,
          document_name: documentName,
          document_url: getSignaturePublicStorageUrl(uploadPath),
          original_storage_path: uploadPath,
          original_hash: originalHash,
          verification_code: verificationCode,
          status: "pending",
          document_type: documentType,
          metadata,
          updated_at: now,
        },
      ])
      .select(
        "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at, updated_at",
      )
      .single();
    if (error) throw error;

    return signatureJson(
      { success: true, data: serializeDashboardSignature(data) },
      201,
    );
  } catch (error) {
    console.error("[CRM/Assinatura][POST] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível criar o processo de assinatura.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
