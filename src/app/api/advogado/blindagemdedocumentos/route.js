import crypto from "node:crypto";

import {
  classifySmartDocument,
  completeSmartDocUpload,
  hasValidSmartDocOrigin,
  notifySmartDocBalance,
  recordSmartDocAudit,
  refundSmartDocUpload,
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import {
  requireDocumentProtectionAccess,
  reserveDocumentProtectionUpload,
  serializeProtectedDocument,
} from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import {
  normalizeDocumentProtectionType,
  validateDocumentProtectionUpload,
} from "@/lib/lawyerDocumentProtection/documentProtectionValidation";
import {
  isClientUuid,
  normalizeClientText,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "smart-docs";
const LEGACY_TABLES = Object.freeze([
  "blindagem_contratos",
  "blindagem_procuracoes",
  "blindagem_provas",
  "blindagem_notificacoes",
]);
const DOCUMENT_FIELDS =
  "id, request_id, client_id, lawyer_id, file_name, file_url, storage_bucket, storage_path, doc_type, tags, is_blindado, hash_sha512, file_size_bytes, created_at, updated_at, crm_clients(name)";

export function normalizeProtectionQuery(searchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    30,
    Math.max(1, Number.parseInt(searchParams.get("pageSize") || "18", 10) || 18),
  );
  const search = normalizeClientText(searchParams.get("search"), 80).replace(
    /[^\p{L}\p{N}\s._-]/gu,
    "",
  );
  const type = normalizeClientText(searchParams.get("type"), 60);
  return { page, pageSize, search, type };
}

async function getScopedClient(access, clientId) {
  if (!isClientUuid(clientId)) return null;
  let query = access.db
    .from("crm_clients")
    .select("id, name, lawyer_id")
    .eq("id", clientId);
  query = scopeSmartDocQuery(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getOwnedDocument(access, { documentId = "", requestId = "" }) {
  let query = access.db
    .from("crm_documents")
    .select(DOCUMENT_FIELDS)
    .eq("lawyer_id", access.user.id)
    .eq("is_blindado", true);
  if (isClientUuid(documentId)) query = query.eq("id", documentId);
  if (isClientUuid(requestId)) query = query.eq("request_id", requestId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findProtectedDuplicate(access, hashSha512) {
  let query = access.db
    .from("crm_documents")
    .select(DOCUMENT_FIELDS)
    .eq("is_blindado", true)
    .eq("hash_sha512", hashSha512)
    .limit(1);
  query = scopeSmartDocQuery(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function loadLegacyCount(access) {
  const results = await Promise.all(
    LEGACY_TABLES.map(async (table) => {
      try {
        let query = access.db.from(table).select("id", { count: "exact", head: true });
        query = scopeSmartDocQuery(query, access.lawyerIds);
        const result = await query;
        if (result.error) {
          if (["42P01", "PGRST205"].includes(result.error.code)) return 0;
          throw result.error;
        }
        return result.count || 0;
      } catch (error) {
        console.warn(`[Blindagem] Falha ao contar legado ${table}:`, error);
        return 0;
      }
    }),
  );
  return results.reduce((total, value) => total + value, 0);
}

function operationError(message, status = 409, code = "DOCUMENT_PROTECTION_INVALID") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function GET(request) {
  try {
    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { page, pageSize, search, type } = normalizeProtectionQuery(searchParams);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let documentsQuery = access.db
      .from("crm_documents")
      .select(DOCUMENT_FIELDS, { count: "exact" })
      .eq("is_blindado", true);
    documentsQuery = scopeSmartDocQuery(documentsQuery, access.lawyerIds);
    if (search) {
      documentsQuery = documentsQuery.or(
        `file_name.ilike.%${search}%,doc_type.ilike.%${search}%`,
      );
    }
    if (type && type !== "all") documentsQuery = documentsQuery.eq("doc_type", type);
    documentsQuery = documentsQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    let protectedQuery = access.db
      .from("crm_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_blindado", true);
    protectedQuery = scopeSmartDocQuery(protectedQuery, access.lawyerIds);

    let linkedQuery = access.db
      .from("crm_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_blindado", true)
      .not("client_id", "is", null);
    linkedQuery = scopeSmartDocQuery(linkedQuery, access.lawyerIds);

    let clientsQuery = access.db
      .from("crm_clients")
      .select("id, name, lawyer_id")
      .order("name", { ascending: true })
      .limit(300);
    clientsQuery = scopeSmartDocQuery(clientsQuery, access.lawyerIds);

    const [documents, protectedDocs, linkedDocs, clients, legacyCount] =
      await Promise.all([
        documentsQuery,
        protectedQuery,
        linkedQuery,
        clientsQuery,
        loadLegacyCount(access),
      ]);
    for (const result of [documents, protectedDocs, linkedDocs, clients]) {
      if (result.error) throw result.error;
    }

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    const storageLimitMb = Number(access.planLimits?.maxStorageMb || 0);
    const usedStorageMb = Number(access.profile.uso_storage_mb || 0);

    return smartDocJson({
      success: true,
      data: (documents.data || []).map((document) =>
        serializeProtectedDocument(document, access, memberMap),
      ),
      clients: (clients.data || []).map((client) => ({
        id: client.id,
        name: client.name || "Cliente",
      })),
      plan: {
        type: access.planType,
        balance: Number(access.profile.balance || 0),
        protectCost: access.planType === "START" ? 3 : 0,
        included: access.planType !== "START",
      },
      usage: {
        usedStorageMb,
        storageLimitMb,
        remainingStorageMb: Math.max(storageLimitMb - usedStorageMb, 0),
        percentage:
          storageLimitMb > 0
            ? Math.min(100, (usedStorageMb / storageLimitMb) * 100)
            : 0,
      },
      metrics: {
        protected: protectedDocs.count || 0,
        linked: linkedDocs.count || 0,
        legacy: legacyCount,
      },
      pagination: {
        page,
        pageSize,
        total: documents.count || 0,
        totalPages: Math.max(1, Math.ceil((documents.count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/Blindagem][GET] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível carregar os documentos blindados.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function POST(request) {
  let access = null;
  let reservation = null;
  let uploadedPath = "";
  let insertedDocumentId = "";
  let operationCompleted = false;

  try {
    if (!hasValidSmartDocOrigin(request)) {
      return smartDocJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const clientId = String(formData.get("clientId") || "");
    const requestedType = String(formData.get("type") || "");
    const requestId = String(formData.get("requestId") || "");

    if (!isClientUuid(requestId)) {
      return smartDocJson(
        { success: false, message: "Identificador da solicitação inválido." },
        400,
      );
    }
    if (!file || typeof file.arrayBuffer !== "function") {
      return smartDocJson(
        { success: false, message: "Selecione um arquivo válido." },
        400,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const validation = validateDocumentProtectionUpload(file, bytes);
    if (!validation.valid) {
      return smartDocJson(
        { success: false, message: validation.errors.file },
        400,
      );
    }

    let client = null;
    if (clientId) {
      client = await getScopedClient(access, clientId);
      if (!client) {
        return smartDocJson(
          { success: false, message: "Cliente vinculado não encontrado." },
          404,
        );
      }
    }

    const fileSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const hashSha512 = crypto.createHash("sha512").update(bytes).digest("hex");

    reservation = await reserveDocumentProtectionUpload(access, {
      requestId,
      fileSizeBytes: validation.size,
      fileName: validation.fileName,
      mimeType: validation.mimeType,
      fileSha256,
    });
    if (!reservation.success) {
      let duplicate = null;
      if (reservation.code === "ALREADY_PROTECTED" && reservation.documentId) {
        duplicate = await findProtectedDuplicate(access, hashSha512);
        if (duplicate) {
          try {
            await recordSmartDocAudit(access, request, {
              requestId,
              documentId: duplicate.id,
              lawyerId: duplicate.lawyer_id,
              action: "PROTECT_DOCUMENT",
              metadata: {
                refused: true,
                reason: "ALREADY_PROTECTED",
                hash_algorithm: "SHA-512",
                charged: false,
              },
            });
          } catch (auditError) {
            console.error(
              "[Blindagem] Falha não bloqueante na auditoria da recusa:",
              auditError,
            );
          }
        }
      }
      return smartDocJson(
        {
          success: false,
          code: reservation.code,
          message: reservation.message,
          alreadyProtected: reservation.code === "ALREADY_PROTECTED",
          processing: reservation.code === "OPERATION_IN_PROGRESS",
          insufficientJuris: reservation.code === "INSUFFICIENT_JURIS",
          storageExceeded: reservation.code === "STORAGE_LIMIT_REACHED",
          upgradeRequired: reservation.code === "UPGRADE_REQUIRED",
          data: duplicate
            ? serializeProtectedDocument(
                duplicate,
                access,
                new Map(access.members.map((member) => [member.id, member])),
              )
            : null,
          usage: {
            usedStorageMb: Number(reservation.usedStorageMb || 0),
            storageLimitMb: Number(reservation.storageLimitMb || 0),
            balance: Number(reservation.balance || 0),
            jurisCost: Number(reservation.jurisCost || 0),
          },
        },
        reservation.httpStatus,
      );
    }

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    if (reservation.status === "COMPLETED") {
      const completedDocument = await getOwnedDocument(access, {
        documentId: reservation.documentId,
        requestId,
      });
      if (!completedDocument) {
        throw operationError(
          "A operação foi concluída, mas o documento não pôde ser localizado.",
        );
      }
      return smartDocJson({
        success: true,
        idempotent: true,
        message: "Documento já blindado por esta solicitação.",
        data: serializeProtectedDocument(completedDocument, access, memberMap),
      });
    }

    const duplicate = await findProtectedDuplicate(access, hashSha512);
    if (duplicate) {
      const refund = await refundSmartDocUpload(
        access,
        reservation.operationId,
        "ALREADY_PROTECTED",
      );
      try {
        await recordSmartDocAudit(access, request, {
          requestId,
          documentId: duplicate.id,
          lawyerId: duplicate.lawyer_id,
          action: "PROTECT_DOCUMENT",
          metadata: {
            refused: true,
            reason: "ALREADY_PROTECTED",
            hash_algorithm: "SHA-512",
          },
        });
      } catch (auditError) {
        console.error("[Blindagem] Falha não bloqueante na auditoria:", auditError);
      }
      return smartDocJson(
        {
          success: false,
          code: "ALREADY_PROTECTED",
          alreadyProtected: true,
          refunded: refund?.status === "REFUNDED",
          message:
            "Este conteúdo já possui uma blindagem registrada. Nenhuma nova cobrança foi mantida.",
          data: serializeProtectedDocument(duplicate, access, memberMap),
        },
        409,
      );
    }

    const operationId = String(reservation.operationId || "");
    if (!isClientUuid(operationId)) {
      throw operationError("A reserva retornou um identificador inválido.");
    }

    const documentId = operationId;
    uploadedPath = `${access.user.id}/${documentId}.${validation.extension}`;
    const { error: uploadError } = await access.db.storage
      .from(STORAGE_BUCKET)
      .upload(uploadedPath, bytes, {
        contentType: validation.mimeType,
        cacheControl: "0",
        upsert: Boolean(reservation.retryAllowed),
      });
    if (uploadError) throw uploadError;

    let document = await getOwnedDocument(access, { requestId });
    if (!document) {
      const aiData = requestedType
        ? {
            type: normalizeDocumentProtectionType(requestedType),
            tags: ["Blindagem documental"],
          }
        : await classifySmartDocument(validation.fileName);
      const createdAt = new Date().toISOString();
      const { data, error } = await access.db
        .from("crm_documents")
        .insert([
          {
            id: documentId,
            request_id: requestId,
            client_id: client?.id || null,
            lawyer_id: access.user.id,
            file_name: validation.fileName,
            file_url: `/api/advogado/blindagemdedocumentos/${documentId}/arquivo`,
            storage_bucket: STORAGE_BUCKET,
            storage_path: uploadedPath,
            file_size_bytes: validation.size,
            doc_type: aiData.type,
            tags: aiData.tags,
            is_blindado: true,
            hash_sha512: hashSha512,
            protection_scope_id: access.officeId || access.user.id,
            protection_actor_id: access.user.id,
            protection_algorithm: "SHA-512",
            protected_at: createdAt,
            upload_ip: null,
            user_agent: request.headers.get("user-agent") || null,
            created_at: createdAt,
            updated_at: createdAt,
          },
        ])
        .select(DOCUMENT_FIELDS)
        .single();
      if (error) throw error;
      document = data;
    }
    insertedDocumentId = document.id;

    const completion = await completeSmartDocUpload(
      access,
      reservation.operationId,
      document.id,
    );
    if (!completion?.success || completion.status !== "COMPLETED") {
      throw operationError("Não foi possível concluir a reserva da blindagem.");
    }
    operationCompleted = true;

    try {
      await notifySmartDocBalance(access, reservation);
    } catch (notificationError) {
      console.error("[Blindagem] Falha não bloqueante ao notificar saldo:", notificationError);
    }
    try {
      await recordSmartDocAudit(access, request, {
        requestId,
        documentId: document.id,
        action: "PROTECT_DOCUMENT",
        metadata: {
          file_size_bytes: validation.size,
          document_type: document.doc_type,
          client_id: client?.id || null,
          juris_charged: Number(reservation.jurisCharged || 0),
          file_sha256: fileSha256,
          hash_algorithm: "SHA-512",
        },
      });
    } catch (auditError) {
      console.error("[Blindagem] Falha não bloqueante na auditoria:", auditError);
    }

    return smartDocJson(
      {
        success: true,
        idempotent: Boolean(reservation.idempotent),
        message:
          Number(reservation.jurisCharged || 0) > 0
            ? `Documento blindado. ${reservation.jurisCharged} Juris utilizados.`
            : "Documento blindado e armazenado de forma privada.",
        data: serializeProtectedDocument(
          { ...document, crm_clients: client ? { name: client.name } : null },
          access,
          memberMap,
        ),
        usage: {
          usedStorageMb: Number(reservation.usedStorageMb || 0),
          storageLimitMb: Number(reservation.storageLimitMb || 0),
          balance: Number(reservation.balance || 0),
          jurisCharged: Number(reservation.jurisCharged || 0),
        },
      },
      reservation.idempotent ? 200 : 201,
    );
  } catch (error) {
    let rollbackFailed = false;
    if (!operationCompleted && access?.db) {
      if (insertedDocumentId) {
        const { error: deleteError } = await access.db
          .from("crm_documents")
          .delete()
          .eq("id", insertedDocumentId)
          .eq("lawyer_id", access.user.id);
        rollbackFailed = rollbackFailed || Boolean(deleteError);
      }
      if (uploadedPath) {
        const { error: storageError } = await access.db.storage
          .from(STORAGE_BUCKET)
          .remove([uploadedPath]);
        rollbackFailed = rollbackFailed || Boolean(storageError);
      }
    }
    const refund =
      !operationCompleted && access && reservation?.operationId
        ? await refundSmartDocUpload(
            access,
            reservation.operationId,
            error?.code || "PROTECTION_FAILED",
          )
        : null;
    const wasRefunded = refund?.status === "REFUNDED";
    console.error("[Advogado/Blindagem][POST] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível blindar o documento.",
    );
    return smartDocJson(
      {
        success: false,
        refunded: wasRefunded,
        rollbackFailed,
        message:
          wasRefunded && Number(reservation?.jurisCharged || 0) > 0
            ? `${failure.message} Os Juris e o armazenamento reservados foram devolvidos.`
            : failure.message,
      },
      failure.status,
    );
  }
}
