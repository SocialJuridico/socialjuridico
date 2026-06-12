import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "pendente",
  "aprovado",
  "rejeitado",
  "arquivado",
]);
const ALLOWED_URGENCY = new Set(["baixa", "media", "alta"]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function validateMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getSourceType(source, originalUrl) {
  const value = `${source || ""} ${originalUrl || ""}`.toLowerCase();
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("reddit")) return "Reddit";
  if (value.includes("twitter") || value.includes("x.com")) return "X";
  if (value.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}

function isRetentionMigrationMissing(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42883" ||
    error?.code === "PGRST202" ||
    message.includes("delete_radar_opportunity")
  );
}

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço administrativo indisponível." },
        503,
      );
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID inválido." }, 400);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ success: false, message: "Dados inválidos." }, 400);
    }

    const updates = {};

    if (body.titulo !== undefined) {
      const title = String(body.titulo || "").trim();
      if (!title) {
        return json({ success: false, message: "Título obrigatório." }, 400);
      }
      updates.titulo = title.slice(0, 240);
    }

    if (body.categoria !== undefined) {
      const category = String(body.categoria || "").trim();
      if (!category) {
        return json({ success: false, message: "Categoria obrigatória." }, 400);
      }
      updates.categoria = category.slice(0, 100);
    }

    if (body.fonte !== undefined) {
      const source = String(body.fonte || "").trim();
      if (!source) {
        return json({ success: false, message: "Fonte obrigatória." }, 400);
      }
      updates.fonte = source.slice(0, 100);
    }

    if (body.url_original !== undefined) {
      const url = normalizeUrl(body.url_original);
      if (!url) {
        return json({ success: false, message: "URL original inválida." }, 400);
      }
      updates.url_original = url;
    }

    if (body.trecho_publico !== undefined) {
      const excerpt = String(body.trecho_publico || "").trim();
      if (excerpt.length > 500) {
        return json(
          { success: false, message: "Trecho público excede 500 caracteres." },
          400,
        );
      }
      updates.trecho_publico = excerpt || null;
    }

    if (body.cidade !== undefined) {
      const city = String(body.cidade || "").trim();
      updates.cidade = city ? city.slice(0, 120) : null;
    }

    if (body.estado !== undefined) {
      const state = String(body.estado || "").trim().toUpperCase();
      updates.estado = state ? state.slice(0, 2) : null;
    }

    if (body.score_intencao !== undefined) {
      const score = Number(body.score_intencao);
      if (!Number.isInteger(score) || score < 0 || score > 100) {
        return json(
          { success: false, message: "Score deve estar entre 0 e 100." },
          400,
        );
      }
      updates.score_intencao = score;
    }

    if (body.urgencia !== undefined) {
      const urgency = String(body.urgencia || "").toLowerCase();
      if (!ALLOWED_URGENCY.has(urgency)) {
        return json({ success: false, message: "Urgência inválida." }, 400);
      }
      updates.urgencia = urgency;
    }

    if (body.resumo_ia !== undefined) {
      const summary = String(body.resumo_ia || "").trim();
      updates.resumo_ia = summary ? summary.slice(0, 2000) : null;
    }

    if (body.status !== undefined) {
      const status = String(body.status || "").toLowerCase();
      if (!ALLOWED_STATUS.has(status)) {
        return json({ success: false, message: "Status inválido." }, 400);
      }
      updates.status = status;
      if (status === "aprovado") {
        updates.publicado_em = new Date().toISOString();
        updates.aprovado_por = auth.user.id;
      }
    }

    if (!Object.keys(updates).length) {
      return json(
        { success: false, message: "Nenhum campo válido para atualizar." },
        400,
      );
    }

    if (updates.fonte !== undefined || updates.url_original !== undefined) {
      updates.fonte_tipo = getSourceType(
        updates.fonte ?? body.fonte,
        updates.url_original ?? body.url_original,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return json(
          {
            success: false,
            message: "Esta URL já está cadastrada no Radar.",
            isDuplicate: true,
          },
          409,
        );
      }
      throw new Error(`Falha ao atualizar oportunidade: ${error.message}`);
    }

    if (!data) {
      return json(
        { success: false, message: "Oportunidade não encontrada." },
        404,
      );
    }

    return json({
      success: true,
      data,
      message: "Oportunidade atualizada com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Radar/:id][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar a oportunidade." },
      500,
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço administrativo indisponível." },
        503,
      );
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID inválido." }, 400);
    }

    const body = await request.json().catch(() => null);
    const reason = String(body?.reason || "").trim().slice(0, 1000);

    if (reason.length < 10) {
      return json(
        {
          success: false,
          message: "Informe uma justificativa com pelo menos 10 caracteres.",
        },
        400,
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "delete_radar_opportunity",
      {
        p_opportunity_id: id,
        p_admin_id: auth.admin.id,
        p_mode: "MANUAL",
        p_reason: reason,
      },
    );

    if (error) {
      if (isRetentionMigrationMissing(error)) {
        return json(
          {
            success: false,
            code: "RADAR_RETENTION_MIGRATION_REQUIRED",
            message:
              "Execute a migração de retenção do Radar antes de excluir oportunidades.",
          },
          503,
        );
      }

      const message = String(error.message || "").toLowerCase();
      if (message.includes("only approved opportunities")) {
        return json(
          {
            success: false,
            message: "Somente oportunidades aprovadas podem ser apagadas.",
          },
          409,
        );
      }

      throw new Error(`Falha ao apagar oportunidade: ${error.message}`);
    }

    if (!data?.deleted) {
      return json(
        { success: false, message: "Oportunidade não encontrada." },
        404,
      );
    }

    return json({
      success: true,
      message: "Oportunidade aprovada apagada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[Admin/Radar/:id][DELETE] Erro:", error);
    return json(
      { success: false, message: "Não foi possível apagar a oportunidade." },
      500,
    );
  }
}
