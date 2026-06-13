import crypto from "node:crypto";

import {
  canDeleteSmartDoc,
  classifySmartDocument,
  completeSmartDocUpload,
  hasValidSmartDocOrigin,
  notifySmartDocBalance,
  recordSmartDocAudit,
  refundSmartDocUpload,
  requireSmartDocAccess,
  reserveSmartDocUpload,
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import {
  resolveSmartDocStorageTarget,
  validateSmartDocUpload,
} from "@/lib/lawyerSmartDocs/smartDocValidation";
import {
  isClientUuid,
  normalizeClientText,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCUMENT_FIELDS =
  "id, request_id, client_id, lawyer_id, file_name, file_url, storage_bucket, storage_path, doc_type, tags, is_blindado, hash_sha512, file_size_bytes, created_at, updated_at, crm_clients(name)";

function normalizeQuery(searchParams) {
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
  const protection = ["protected", "standard"].includes(
    searchParams.get("protection"),
  )
    ? searchParams.get("protection")
    : "all";
  return { page, pageSize, search, type, protection };
}

function serializeDocument(document, access, memberMap = new Map()) {
  return {
    id: document.id,
    fileName: document.file_name || "Documento",
    fileUrl: `/api/advogado/smartdoc/${document.id}/arquivo`,
    documentType: document.doc_type || "Outros",
    tags: Array.isArray(document.tags) ? document.tags : [],
    protected: Boolean(document.is_blindado),
    hash: document.hash_sha512 || null,
    fileSizeBytes: Number(document.file_size_bytes || 0),
    clientId: document.client_id || null,
    clientName: document.crm_clients?.name || null,
    lawyerId: document.lawyer_id,
    lawyerName: memberMap.get(document.lawyer_id)?.name || "Advogado",
    canDelete: canDeleteSmartDoc(access, document.lawyer_id),
    createdAt: document.created_at,
    updatedAt: document.updated_at || document.created_at,
  };
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
    .eq("lawyer_id", access.user.id);
  if (isClientUuid(documentId)) query = query.eq("id", documentId);
  if (isClientUuid(requestId)) query = query.eq("request_id", requestId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

function operationError(message, status = 409, code = "SMARTDOC_OPERATION_INVALID") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function GET(request) {
  try {
    const access = await requireSmartDocAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { page, pageSize, search, type, protection } = normalizeQuery(searchParams);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let documentsQuery = access.db
      .from("crm_documents")
      .select(DOCUMENT_FIELDS, { count: "exact" });
    documentsQuery = scopeSmartDocQuery(documentsQuery, access.lawyerIds);
    if (search) {
      documentsQuery = documentsQuery.or(
        `file_name.ilike.%${search}%,doc_type.ilike.%${search}%`,
      );
    }
    if (type && type !== "all") documentsQuery = documentsQuery.eq("doc_type", type);
    if (protection === "protected") documentsQuery = documentsQuery.eq("is_blindado", true);
    if (protection === "standard") documentsQuery = documentsQuery.eq("is_blindado", false);
    documentsQuery = documentsQuery
      .order("created_at", { ascending: false })
      .range(from, to);

    let totalQuery = access.db
      .from("crm_documents")
      .select("id", { count: "exact", head: true });
    totalQuery = scopeSmartDocQuery(totalQuery, access.lawyerIds);
    let protectedQuery = access.db
      .from("crm_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_blindado", true);
    protectedQuery = scopeSmartDocQuery(protectedQuery, access.lawyerIds);
    let linkedQuery = access.db
      .from("crm_documents")
      .select("id", { count: "exact", head: true })
      .not("client_id", "is", null);
    linkedQuery = scopeSmartDocQuery(linkedQuery, access.lawyerIds);
    let clientsQuery = access.db
      .from("crm_clients")
      .select("id, name, lawyer_id")
      .order("name", { ascending: true })
      .limit(300);
    clientsQuery = scopeSmartDocQuery(clientsQuery, access.lawyerIds);

    const [documents, total, protectedDocs, linkedDocs, clients] =
      await Promise.all([
        documentsQuery,
        totalQuery,
        protectedQuery,
        linkedQuery,
        clientsQuery,
      ]);
    for (const result of [documents, total, protectedDocs, linkedDocs, clients]) {
      if (result.error) throw result.error;
    }

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    const storageLimitMb = Number(access.planLimits?.maxStorageMb || 0);
    const usedStorageMb = Number(access.profile.uso_storage_mb || 0);

    return smartDocJson({
      success: true,
      data: (documents.data || []).map((document) =>
        serializeDocument(document, access, memberMap),
      ),
      clients: (clients.data || []).map((client) => ({
        id: client.id,
        name: client.name || "Cliente",
      })),
      plan: {
        type: access.planType,
        balance: Number(access.profile.balance || 0),
        protectCost: access.planType === "START" ? 3 : 0,
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
        total: total.count || 0,
        protected: protectedDocs.count || 0,
        linked: linkedDocs.count || 0,
        standard: Math.max((total.count || 0) - (protectedDocs.count || 0), 0),
      },
      pagination: {
        page,
        pageSize,
        total: documents.count || 0,
        totalPages: Math.max(1, Math.ceil((documents.count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/SmartDoc][GET] Erro:", error);
    const failure = smartDocFailure(error, "Não foi possível carregar os documentos.");
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function POST(request) {
  let access = null;
  let reservation = null;
  let uploadedPath = "";
  let insertedDocumentId = "";
  let operationCompleted = false;
  const storageBucket = "smart-docs";

  try {
    if (!hasValidSmartDocOrigin(request)) {
      return smartDocJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    access = await requireSmartDocAccess(request);
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const file = formData.get("file");
    const clientId = String(formData.get("clientId") || "");
    const protect = formData.get("protect") === "true";
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
    const validation = validateSmartDocUpload(file, bytes);
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
    const hashSha512 = protect
      ? crypto.createHash("sha512").update(bytes).digest("hex")
      : null;

    reservation = await reserveSmartDocUpload(access, {
      requestId,
      fileSizeBytes: validation.size,
      protect,
      fileName: validation.fileName,
      mimeType: validation.mimeType,
      fileSha256,
    });
    if (!reservation.success) {
      return smartDocJson(
        {
          success: false,
          code: reservation.code,
          message: reservation.message,
          processing: reservation.code === "OPERATION_IN_PROGRESS",
          insufficientJuris: reservation.code === "INSUFFICIENT_JURIS",
          storageExceeded: reservation.code === "STORAGE_LIMIT_REACHED",
          upgradeRequired: reservation.code === "UPGRADE_REQUIRED",
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
        message: "Documento já processado por esta solicitação.",
        data: serializeDocument(completedDocument, access, memberMap),
      });
    }

    const operationId = String(reservation.operationId || "");
    if (!isClientUuid(operationId)) {
      throw operationError("A reserva do upload retornou um identificador inválido.");
    }

    const documentId = operationId;
    uploadedPath = `${access.user.id}/${documentId}.${validation.extension}`;
    const { error: uploadError } = await access.db.storage
      .from(storageBucket)
      .upload(uploadedPath, bytes, {
        contentType: validation.mimeType,
        cacheControl: "0",
        upsert: Boolean(reservation.retryAllowed),
      });
    if (uploadError) throw uploadError;

    let document = await getOwnedDocument(access, { requestId });
    if (!document) {
      const aiData = await classifySmartDocument(validation.fileName);
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
            file_url: `/api/advogado/smartdoc/${documentId}/arquivo`,
            storage_bucket: storageBucket,
            storage_path: uploadedPath,
            file_size_bytes: validation.size,
            doc_type: aiData.type,
            tags: aiData.tags,
            is_blindado: protect,
            hash_sha512: hashSha512,
            upload_ip: null,
            user_agent: protect ? request.headers.get("user-agent") || null : null,
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
      throw operationError("Não foi possível concluir a reserva do documento.");
    }
    operationCompleted = true;

    try {
      await notifySmartDocBalance(access, reservation);
    } catch (notificationError) {
      console.error("[SmartDoc] Falha não bloqueante ao notificar saldo:", notificationError);
    }
    try {
      await recordSmartDocAudit(access, request, {
        requestId,
        documentId: document.id,
        action: protect ? "PROTECT_DOCUMENT" : "UPLOAD_DOCUMENT",
        metadata: {
          file_size_bytes: validation.size,
          document_type: document.doc_type,
          client_id: client?.id || null,
          juris_charged: Number(reservation.jurisCharged || 0),
          file_sha256: fileSha256,
        },
      });
    } catch (auditError) {
      console.error("[SmartDoc] Falha não bloqueante na auditoria:", auditError);
    }

    return smartDocJson(
      {
        success: true,
        idempotent: Boolean(reservation.idempotent),
        message:
          Number(reservation.jurisCharged || 0) > 0
            ? `Documento blindado. ${reservation.jurisCharged} Juris utilizados.`
            : protect
              ? "Documento blindado e armazenado com segurança."
              : "Documento organizado no IA Smart Docs.",
        data: serializeDocument(
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
          .from(storageBucket)
          .remove([uploadedPath]);
        rollbackFailed = rollbackFailed || Boolean(storageError);
      }
    }
    const refund =
      !operationCompleted && access && reservation?.operationId
        ? await refundSmartDocUpload(
            access,
            reservation.operationId,
            error?.code || "UPLOAD_FAILED",
          )
        : null;
    const wasRefunded = refund?.status === "REFUNDED";
    console.error("[Advogado/SmartDoc][POST] Erro:", error);
    const failure = smartDocFailure(error, "Não foi possível enviar o documento.");
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

export async function DELETE(request) {
  try {
    if (!hasValidSmartDocOrigin(request)) {
      return smartDocJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    const access = await requireSmartDocAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const documentId = String(body?.documentId || "");
    const requestId = String(body?.requestId || "");
    if (!isClientUuid(documentId) || !isClientUuid(requestId)) {
      return smartDocJson(
        { success: false, message: "Solicitação de exclusão inválida." },
        400,
      );
    }

    let query = access.db
      .from("crm_documents")
      .select(
        "id, lawyer_id, client_id, file_url, storage_bucket, storage_path, file_size_bytes, file_name",
      )
      .eq("id", documentId);
    query = scopeSmartDocQuery(query, access.lawyerIds);
    const { data: document, error: documentError } = await query.maybeSingle();
    if (documentError) throw documentError;
    if (!document) {
      return smartDocJson(
        { success: false, message: "Documento não encontrado." },
        404,
      );
    }
    if (!canDeleteSmartDoc(access, document.lawyer_id)) {
      return smartDocJson(
        {
          success: false,
          permissionDenied: true,
          message: "Somente o responsável ou um gestor pode excluir este documento.",
        },
        403,
      );
    }

    const storageTarget = resolveSmartDocStorageTarget(document);
    if (!storageTarget) {
      return smartDocJson(
        {
          success: false,
          message: "O caminho privado do documento é inválido e a exclusão foi bloqueada.",
        },
        409,
      );
    }

    const { data: deleted, error: deleteError } = await access.db.rpc(
      "delete_smartdoc_document",
      {
        p_document_id: document.id,
        p_lawyer_id: document.lawyer_id,
      },
    );
    if (deleteError) throw deleteError;
    if (!deleted?.success) {
      throw operationError(
        deleted?.message || "Não foi possível excluir o registro do documento.",
        409,
        deleted?.code || "DELETE_FAILED",
      );
    }

    const { error: storageError } = await access.db.storage
      .from(storageTarget.bucket)
      .remove([storageTarget.path]);
    let cleanupPending = false;
    if (storageError) {
      cleanupPending = true;
      const { error: queueError } = await access.db
        .from("smartdoc_storage_cleanup")
        .upsert(
          [
            {
              document_id: document.id,
              storage_bucket: storageTarget.bucket,
              storage_path: storageTarget.path,
              reason: String(storageError.message || "STORAGE_DELETE_FAILED").slice(0, 500),
              status: "PENDING",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "storage_bucket,storage_path" },
        );
      if (queueError) {
        console.error("[SmartDoc] Falha ao registrar limpeza pendente:", queueError);
      }
      console.error("[SmartDoc] Arquivo aguardando limpeza do Storage:", storageError);
    }

    try {
      await recordSmartDocAudit(access, request, {
        requestId,
        documentId: null,
        lawyerId: document.lawyer_id,
        action: "DELETE_DOCUMENT",
        metadata: {
          deleted_document_id: document.id,
          file_name: document.file_name,
          file_size_bytes: Number(document.file_size_bytes || 0),
          cleanup_pending: cleanupPending,
        },
      });
    } catch (auditError) {
      console.error("[SmartDoc] Falha não bloqueante na auditoria:", auditError);
    }

    return smartDocJson(
      {
        success: true,
        cleanupPending,
        message: cleanupPending
          ? "Documento excluído. A limpeza do arquivo foi registrada para nova tentativa."
          : "Documento excluído.",
      },
      cleanupPending ? 202 : 200,
    );
  } catch (error) {
    console.error("[Advogado/SmartDoc][DELETE] Erro:", error);
    const failure = smartDocFailure(error, "Não foi possível excluir o documento.");
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
