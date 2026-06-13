import crypto from "node:crypto";

import {
  applySignatureScope,
  generateSignatureVerificationCode,
  getSignaturePublicStorageUrl,
  hasValidSignatureMutationOrigin,
  isOwnedSignatureUploadPath,
  readSignatureStorageFile,
  recordSignatureAudit,
  requireDigitalSignatureAccess,
  serializeDashboardSignature,
  signatureJson,
  signatureServerFailure,
} from "@/lib/digitalSignatures/signatureServer";
import {
  normalizeSignatureQuery,
  validateCreateSignaturePayload,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function scopedCount(db, lawyerIds, status = null) {
  let query = db
    .from("assinaturas_digitais")
    .select("id", { count: "exact", head: true });
  query = applySignatureScope(query, lawyerIds);
  if (status) query = query.eq("status", status);
  return query;
}

async function findAccessibleClient(access, clientId) {
  if (!clientId) return null;
  let query = access.db
    .from("crm_clients")
    .select("id, name, email, lawyer_id")
    .eq("id", clientId);
  query =
    access.lawyerIds.length === 1
      ? query.eq("lawyer_id", access.lawyerIds[0])
      : query.in("lawyer_id", access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function generateUniqueCode(db) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateSignatureVerificationCode();
    const { count, error } = await db
      .from("assinaturas_digitais")
      .select("id", { count: "exact", head: true })
      .eq("verification_code", code);
    if (error) throw error;
    if (!count) return code;
  }
  throw new Error("Não foi possível gerar um código único de validação.");
}

export async function GET(request) {
  try {
    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { page, pageSize, status, search } = normalizeSignatureQuery(searchParams);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = access.db
      .from("assinaturas_digitais")
      .select(
        "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at, updated_at",
        { count: "exact" },
      );
    query = applySignatureScope(query, access.lawyerIds);
    if (status !== "all") query = query.eq("status", status);
    if (search) {
      query = query.or(
        `document_name.ilike.%${search}%,verification_code.ilike.%${search}%`,
      );
    }
    query = query.order("created_at", { ascending: false }).range(from, to);

    let clientsQuery = access.db
      .from("crm_clients")
      .select("id, name, email, lawyer_id")
      .order("name", { ascending: true })
      .limit(250);
    clientsQuery =
      access.lawyerIds.length === 1
        ? clientsQuery.eq("lawyer_id", access.lawyerIds[0])
        : clientsQuery.in("lawyer_id", access.lawyerIds);

    const [listResult, clientsResult, totalResult, signedResult, partialResult] =
      await Promise.all([
        query,
        clientsQuery,
        scopedCount(access.db, access.lawyerIds),
        scopedCount(access.db, access.lawyerIds, "signed"),
        scopedCount(access.db, access.lawyerIds, "partially_signed"),
      ]);

    for (const result of [
      listResult,
      clientsResult,
      totalResult,
      signedResult,
      partialResult,
    ]) {
      if (result.error) throw result.error;
    }

    const total = totalResult.count || 0;
    const signed = signedResult.count || 0;
    const partiallySigned = partialResult.count || 0;

    return signatureJson({
      success: true,
      data: (listResult.data || []).map(serializeDashboardSignature),
      clients: (clientsResult.data || []).map((client) => ({
        id: client.id,
        name: client.name || "",
        email: client.email || "",
      })),
      profile: {
        name: access.profile.name || "",
        email: access.profile.email || "",
        planType: access.planType,
      },
      metrics: {
        total,
        signed,
        partiallySigned,
        pending: Math.max(0, total - signed - partiallySigned),
      },
      pagination: {
        page,
        pageSize,
        total: listResult.count || 0,
        totalPages: Math.max(1, Math.ceil((listResult.count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/Assinaturas][GET] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível carregar seus processos de assinatura.",
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

    const validation = validateCreateSignaturePayload(await request.json());
    if (!validation.valid) {
      return signatureJson(
        {
          success: false,
          message: "Revise os dados antes de iniciar a assinatura.",
          errors: validation.errors,
        },
        400,
      );
    }

    const payload = validation.data;
    if (!isOwnedSignatureUploadPath(payload.uploadPath, access.user.id)) {
      return signatureJson(
        { success: false, message: "O PDF informado não pertence a este usuário." },
        403,
      );
    }

    const { data: existing, error: existingError } = await access.db
      .from("assinaturas_digitais")
      .select(
        "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at, updated_at",
      )
      .eq("lawyer_id", access.user.id)
      .eq("request_id", payload.requestId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return signatureJson({
        success: true,
        idempotent: true,
        data: serializeDashboardSignature(existing),
      });
    }

    const accessibleClient = await findAccessibleClient(access, payload.clientId);
    if (payload.clientId && !accessibleClient) {
      return signatureJson(
        { success: false, message: "Cliente do CRM não encontrado ou sem acesso." },
        404,
      );
    }

    const fileBuffer = await readSignatureStorageFile(payload.uploadPath);
    if (!fileBuffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return signatureJson(
        { success: false, message: "O arquivo armazenado não é um PDF válido." },
        400,
      );
    }

    const originalHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");
    const verificationCode = await generateUniqueCode(access.db);
    const now = new Date().toISOString();
    const documentUrl = getSignaturePublicStorageUrl(payload.uploadPath);
    const lawyerEmail = String(access.profile.email || "").toLowerCase().trim();

    if (!lawyerEmail) {
      return signatureJson(
        {
          success: false,
          message: "Seu perfil não possui um e-mail autenticado para assinar.",
        },
        400,
      );
    }

    const metadata = {
      request_id: payload.requestId,
      storage: { original_path: payload.uploadPath, signed_path: null },
      lawyer: {
        name: access.profile.name || "Advogado",
        email: lawyerEmail,
        signed: false,
        signed_at: null,
        ip: null,
        user_agent: null,
        otp_hash: null,
        otp_expires: null,
        otp_attempts: 0,
        otp_last_sent_at: null,
      },
      client: {
        name: payload.clientName,
        email: payload.clientEmail,
        signed: false,
        signed_at: null,
        ip: null,
        user_agent: null,
        otp_hash: null,
        otp_expires: null,
        otp_attempts: 0,
        otp_last_sent_at: null,
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
          request_id: payload.requestId,
          lawyer_id: access.user.id,
          client_id: accessibleClient?.id || null,
          document_name: payload.documentName,
          document_type: payload.documentType,
          document_url: documentUrl,
          original_storage_path: payload.uploadPath,
          original_hash: originalHash,
          verification_code: verificationCode,
          status: "pending",
          metadata,
          updated_at: now,
        },
      ])
      .select(
        "id, document_name, document_type, verification_code, status, original_hash, signed_hash, metadata, created_at, updated_at",
      )
      .single();
    if (error) throw error;

    await recordSignatureAudit(access, request, {
      requestId: payload.requestId,
      signatureId: data.id,
      action: "CREATE",
      metadata: {
        document_type: payload.documentType,
        client_id: accessibleClient?.id || null,
        original_hash: originalHash,
      },
    });

    return signatureJson(
      {
        success: true,
        message: "Processo de assinatura iniciado com segurança.",
        data: serializeDashboardSignature(data),
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Assinaturas][POST] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível iniciar o processo de assinatura.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
