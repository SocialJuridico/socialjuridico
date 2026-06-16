import { NextResponse } from "next/server";

import {
  ADMIN_SIGNATURE_CONFIRMATION,
  ADMIN_SIGNABLE_DOCUMENTS,
  buildAdminSignaturePayload,
  generateUniqueAdminSignatureCode,
  getAdminSignableDocument,
  getAdminSignatureStatement,
  readAdminSignableDocument,
  serializeAdminSignature,
} from "@/lib/adminDocumentSignatures";
import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import {
  getAuditRequestContext,
  hashAuditValue,
  recordSecurityAuditEvent,
} from "@/lib/audit/securityAuditLog";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isMissingTable(error) {
  return ["42P01", "PGRST205"].includes(error?.code) ||
    String(error?.message || "").toLowerCase().includes("does not exist");
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    const error = new Error(auth.message);
    error.status = auth.status;
    throw error;
  }
  return auth;
}

async function loadSignatures(db) {
  const { data, error } = await db
    .from("admin_document_signatures")
    .select(
      "id, document_id, document_title, document_category, document_path, document_hash, signature_hash, verification_code, signer_name, signer_role, signature_statement, status, signed_at, created_at",
    )
    .order("signed_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTable(error)) {
      return { rows: [], migrationRequired: true };
    }
    throw error;
  }

  return { rows: data || [], migrationRequired: false };
}

function latestByDocument(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.document_id)) map.set(row.document_id, row);
  }
  return map;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    const { rows, migrationRequired } = await loadSignatures(auth.db);
    const signedByDocument = latestByDocument(rows);

    const documents = await Promise.all(
      ADMIN_SIGNABLE_DOCUMENTS.map(async (document) => {
        try {
          const file = await readAdminSignableDocument(document);
          return {
            ...document,
            document_hash: file.hash,
            modified_at: file.modifiedAt,
            size: file.size,
            statement: getAdminSignatureStatement(document),
            latest_signature: serializeAdminSignature(signedByDocument.get(document.id)),
          };
        } catch {
          return {
            ...document,
            document_hash: null,
            modified_at: null,
            size: 0,
            statement: getAdminSignatureStatement(document),
            latest_signature: serializeAdminSignature(signedByDocument.get(document.id)),
            unavailable: true,
          };
        }
      }),
    );

    return json({
      success: true,
      data: {
        documents,
        signatures: rows.map(serializeAdminSignature),
        migrationRequired,
        confirmationPhrase: ADMIN_SIGNATURE_CONFIRMATION,
      },
    });
  } catch (error) {
    console.error("[Admin/Assinaturas][GET]", error);
    return json(
      {
        success: false,
        message: error.status ? error.message : "Nao foi possivel carregar assinaturas.",
      },
      error.status || 500,
    );
  }
}

export async function POST(request) {
  try {
    if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
      return json(
        { success: false, message: "Origem da requisicao nao autorizada." },
        403,
      );
    }

    const auth = await requireAdmin();
    const body = await request.json().catch(() => null);
    const documentId = String(body?.documentId || "").trim();
    const confirmation = String(body?.confirmation || "").trim().toUpperCase();
    const document = getAdminSignableDocument(documentId);

    if (!document) {
      return json({ success: false, message: "Documento nao encontrado." }, 404);
    }

    if (confirmation !== ADMIN_SIGNATURE_CONFIRMATION) {
      return json(
        {
          success: false,
          message: `Digite "${ADMIN_SIGNATURE_CONFIRMATION}" para assinar.`,
        },
        400,
      );
    }

    const file = await readAdminSignableDocument(document);
    const signedAt = new Date().toISOString();
    const requestContext = getAuditRequestContext(request);
    let verificationCode = "";
    try {
      verificationCode = await generateUniqueAdminSignatureCode(auth.db);
    } catch (codeError) {
      if (isMissingTable(codeError)) {
        return json(
          {
            success: false,
            message:
              "A migration docs/compliance/sql/20260616_admin_document_signatures.sql precisa ser aplicada no Supabase.",
          },
          503,
        );
      }
      throw codeError;
    }
    const userAgentHash = hashAuditValue(requestContext.userAgent, "user-agent");
    const { payload, statement, signatureHash } = buildAdminSignaturePayload({
      document,
      documentHash: file.hash,
      documentModifiedAt: file.modifiedAt,
      admin: auth.admin,
      requestContext: {
        requestIpHash: requestContext.requestIpHash,
        userAgentHash,
      },
      verificationCode,
      signedAt,
    });

    const { data, error } = await auth.db
      .from("admin_document_signatures")
      .insert([
        {
          document_id: document.id,
          document_title: document.title,
          document_category: document.category,
          document_path: document.path,
          document_hash: file.hash,
          document_hash_algorithm: "SHA-256",
          document_modified_at: file.modifiedAt,
          signature_hash: signatureHash,
          signature_payload: payload,
          signature_statement: statement,
          verification_code: verificationCode,
          signer_admin_id: auth.admin.id,
          signer_name: auth.admin.name || "Administrador",
          signer_email_hash: hashAuditValue(auth.admin.email, "email"),
          signer_role: auth.admin.role || "ADMIN",
          request_ip_hash: requestContext.requestIpHash,
          user_agent_hash: userAgentHash,
          signed_at: signedAt,
          status: "SIGNED",
        },
      ])
      .select(
        "id, document_id, document_title, document_category, document_path, document_hash, signature_hash, verification_code, signer_name, signer_role, signature_statement, status, signed_at, created_at",
      )
      .single();

    if (error) {
      if (isMissingTable(error)) {
        return json(
          {
            success: false,
            message:
              "A migration docs/compliance/sql/20260616_admin_document_signatures.sql precisa ser aplicada no Supabase.",
          },
          503,
        );
      }
      throw error;
    }

    await recordSecurityAuditEvent({
      db: auth.db,
      eventType: "ADMIN_DOCUMENT_SIGNED",
      actorId: auth.admin.id,
      actorType: "admin",
      actorEmail: auth.admin.email,
      targetType: "internal_document",
      request,
      outcome: "SUCCESS",
      statusCode: 201,
      metadata: {
        document_id: document.id,
        document_title: document.title,
        document_hash: file.hash,
        signature_hash: signatureHash,
        verification_code: verificationCode,
      },
    });

    return json({
      success: true,
      data: serializeAdminSignature(data),
    }, 201);
  } catch (error) {
    console.error("[Admin/Assinaturas][POST]", error);
    return json(
      {
        success: false,
        message: error.status ? error.message : "Nao foi possivel assinar o documento.",
      },
      error.status || 500,
    );
  }
}
