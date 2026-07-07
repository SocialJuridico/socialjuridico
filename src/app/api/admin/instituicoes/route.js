import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { buildInstitutionPayload } from "@/lib/oraculoInstitutionPayload";
import {
  syncInstitutionMainSupervisor,
  syncInstitutionPeople,
} from "@/lib/oraculoInstitutionSync";
import { validateInstitutionDossier } from "@/lib/oraculoInstitutionRules";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function emptyRelatedRows(setupWarning = null) {
  return {
    pessoasByInstitution: new Map(),
    supervisorsByInstitution: new Map(),
    historyByInstitution: new Map(),
    setupWarning,
  };
}

async function loadRelatedRows(instituicaoIds) {
  if (!instituicaoIds.length) {
    return emptyRelatedRows();
  }

  const [pessoasResult, supervisorsResult, historyResult] = await Promise.all([
    supabaseAdmin
      .from("oraculo_instituicao_pessoas")
      .select("id, instituicao_id, papel, nome, cpf, cargo, email, telefone, detalhes")
      .in("instituicao_id", instituicaoIds),
    supabaseAdmin
      .from("oraculo_supervisores_formais")
      .select("*")
      .in("instituicao_id", instituicaoIds),
    supabaseAdmin
      .from("oraculo_instituicao_status_history")
      .select("id, instituicao_id, de_status, para_status, motivo, alterado_por, created_at")
      .in("instituicao_id", instituicaoIds)
      .order("created_at", { ascending: false }),
  ]);

  for (const result of [pessoasResult, supervisorsResult, historyResult]) {
    if (result.error) {
      if (/does not exist|schema cache/i.test(result.error.message || "")) {
        return emptyRelatedRows(
          "As tabelas de onboarding institucional ainda nao estao completas. Rode a migration 20260707_oraculo_instituicoes_onboarding.sql no Supabase.",
        );
      }
      throw new Error(result.error.message);
    }
  }

  const groupByInstitution = (rows = []) =>
    rows.reduce((map, row) => {
      const current = map.get(row.instituicao_id) || [];
      current.push(row);
      map.set(row.instituicao_id, current);
      return map;
    }, new Map());

  return {
    pessoasByInstitution: groupByInstitution(pessoasResult.data),
    supervisorsByInstitution: groupByInstitution(supervisorsResult.data),
    historyByInstitution: groupByInstitution(historyResult.data),
    setupWarning: null,
  };
}

export async function GET() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .select("*")
      .order("nome", { ascending: true });

    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) {
        return json(
          {
            success: false,
            message:
              "A tabela oraculo_instituicoes ainda nao esta completa. Rode a migration 20260707_oraculo_instituicoes_onboarding.sql no Supabase.",
          },
          503,
        );
      }
      throw new Error(`Falha ao listar instituicoes: ${error.message}`);
    }

    const ids = (data || []).map((item) => item.id);
    const {
      pessoasByInstitution,
      supervisorsByInstitution,
      historyByInstitution,
      setupWarning,
    } = await loadRelatedRows(ids);

    const institutions = (data || []).map((item) => ({
      ...item,
      pessoas: pessoasByInstitution.get(item.id) || [],
      supervisores_formais: supervisorsByInstitution.get(item.id) || [],
      historico_status: historyByInstitution.get(item.id) || [],
    }));

    return json({ success: true, data: institutions, setupWarning });
  } catch (error) {
    console.error("[Admin/Instituicoes][GET] Erro:", error);
    return json(
      {
        success: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Nao foi possivel listar as instituicoes.",
      },
      500,
    );
  }
}

export async function POST(request) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  try {
    const body = await request.json().catch(() => null);
    const payload = buildInstitutionPayload(body);

    if (payload.nome.length < 3) {
      return json(
        { success: false, message: "Informe o nome da instituicao." },
        400,
      );
    }

    const validationErrors = validateInstitutionDossier({
      ...payload,
      supervisor_principal: body?.supervisor_principal || {},
    });
    if (validationErrors.length) {
      return json({ success: false, message: validationErrors[0] }, 400);
    }

    const { data: existente } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .select("id, nome, status")
      .ilike("nome", payload.nome)
      .maybeSingle();

    if (existente) {
      return json(
        {
          success: false,
          message: `"${existente.nome}" ja existe no onboarding institucional.`,
          id: existente.id,
        },
        409,
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .insert([{ ...payload, criado_por: auth.user.id }])
      .select("id, nome, status")
      .single();

    if (insertError) {
      throw new Error(`Falha ao cadastrar instituicao: ${insertError.message}`);
    }

    await syncInstitutionPeople(supabaseAdmin, inserted.id, body?.pessoas || {});
    await syncInstitutionMainSupervisor(
      supabaseAdmin,
      inserted.id,
      body?.supervisor_principal || {},
    );

    await supabaseAdmin.from("oraculo_instituicao_status_history").insert([
      {
        instituicao_id: inserted.id,
        de_status: null,
        para_status: inserted.status,
        motivo: body?.motivo || "Cadastro institucional criado.",
        alterado_por: auth.user.id,
      },
    ]);

    return json({
      success: true,
      id: inserted.id,
      message: `"${inserted.nome}" cadastrada como dossie institucional.`,
    });
  } catch (error) {
    console.error("[Admin/Instituicoes][POST] Erro:", error);
    return json(
      {
        success: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Nao foi possivel cadastrar a instituicao.",
      },
      500,
    );
  }
}
