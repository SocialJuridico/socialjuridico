import {
  SENSITIVE_ACCESS_PURPOSES,
  isValidUuid,
  json,
  normalizeText,
  recordCaseAudit,
  requireAdminCaseAccess,
} from "../adminCases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 50).map((item, index) => ({
    id: item?.id || `attachment-${index + 1}`,
    name: normalizeText(
      typeof item === "string"
        ? `Anexo ${index + 1}`
        : item?.name || item?.file_name || `Anexo ${index + 1}`,
      180,
    ),
    url:
      typeof item === "string"
        ? item
        : item?.url || item?.file_url || item?.secure_url || "",
    type:
      typeof item === "string"
        ? "unknown"
        : normalizeText(item?.type || item?.mime_type || "unknown", 100),
  }));
}

async function getCase(db, caseId) {
  const complete = await db
    .from("casos")
    .select(
      "id, titulo, descricao, area_atuacao, status, cliente_id, advogado_id, created_at, updated_at, anexos, cidade, estado, video_link, video_url, audio_url",
    )
    .eq("id", caseId)
    .maybeSingle();

  if (!complete.error) return complete;

  return db
    .from("casos")
    .select(
      "id, titulo, descricao, area_atuacao, status, cliente_id, advogado_id, created_at, updated_at, anexos, cidade, estado",
    )
    .eq("id", caseId)
    .maybeSingle();
}

export async function POST(request) {
  try {
    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    const purpose = String(body?.purpose || "").trim().toUpperCase();
    const justification = normalizeText(body?.justification, 1000);

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    if (!SENSITIVE_ACCESS_PURPOSES.has(purpose)) {
      return json({ success: false, message: "Finalidade inválida." }, 400);
    }

    if (justification.length < 10) {
      return json(
        { success: false, message: "Informe uma justificativa válida." },
        400,
      );
    }

    const { data: caseItem, error: caseError } = await getCase(
      access.db,
      caseId,
    );

    if (caseError) {
      throw new Error(`Falha ao consultar caso: ${caseError.message}`);
    }

    if (!caseItem) {
      return json({ success: false, message: "Caso não encontrado." }, 404);
    }

    const auditRecorded = await recordCaseAudit(access.db, request, {
      adminId: access.auth.user.id,
      caseId,
      action: "SENSITIVE_CASE_VIEWED",
      purpose,
      justification,
      metadata: { accessProfile: "FULL_CASE_DETAIL" },
    });

    if (!auditRecorded) {
      return json(
        {
          success: false,
          message: "Não foi possível registrar a auditoria do acesso.",
        },
        503,
      );
    }

    const [clientResult, lawyerResult] = await Promise.all([
      access.db
        .from("clientes")
        .select("id, name, email, phone")
        .eq("id", caseItem.cliente_id)
        .maybeSingle(),
      caseItem.advogado_id
        ? access.db
            .from("advogados")
            .select("id, name, email, oab")
            .eq("id", caseItem.advogado_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (clientResult.error || lawyerResult.error) {
      throw new Error("Falha ao consultar os perfis relacionados ao caso.");
    }

    return json({
      success: true,
      data: {
        id: caseItem.id,
        title: caseItem.titulo || "Caso sem título",
        description: caseItem.descricao || "",
        area: caseItem.area_atuacao || "Não informada",
        status: caseItem.status || "ABERTO",
        city: caseItem.cidade || "",
        state: caseItem.estado || "",
        createdAt: caseItem.created_at,
        updatedAt: caseItem.updated_at,
        client: clientResult.data
          ? {
              id: clientResult.data.id,
              name: clientResult.data.name || "Cliente",
              email: clientResult.data.email || "",
              phone: clientResult.data.phone || "",
            }
          : null,
        hiredLawyer: lawyerResult.data
          ? {
              id: lawyerResult.data.id,
              name: lawyerResult.data.name || "Advogado",
              email: lawyerResult.data.email || "",
              oab: lawyerResult.data.oab || "",
            }
          : null,
        attachments: normalizeAttachments(caseItem.anexos),
        media: {
          videoLink: caseItem.video_link || "",
          videoUrl: caseItem.video_url || "",
          audioUrl: caseItem.audio_url || "",
        },
        accessContext: {
          purpose,
          justification,
          accessedAt: new Date().toISOString(),
          accessedBy: access.auth.user.id,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Casos/DetalhesSeguros][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível liberar os detalhes do caso.",
      },
      500,
    );
  }
}
