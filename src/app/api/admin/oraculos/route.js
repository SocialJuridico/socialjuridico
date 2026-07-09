import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  try {
    const { data: oraculos, error } = await supabaseAdmin
      .from("oraculo_profissionais")
      .select(
        "id, name, email, whatsapp, cpf, cidade, estado, tipo, status, instituicao_id, instituicao_ensino, periodo_atual, previsao_conclusao, numero_matricula, participa_nucleo_pratica, fez_estagio_juridico, oab_estagiario_numero, oab_estagiario_uf, comprovante_matricula_url, comprovante_estagiario_url, areas_interesse, experiencia_pratica, disponibilidade_semanal, bio, motivo_participacao, termos_aceitos_em, aprovado_em, reprovado_em, motivo_reprovacao, suspenso_em, motivo_suspensao, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      // Erro mais comum em produção: migration ainda não aplicada no
      // Supabase — a tabela não existe.
      if (/does not exist|schema cache/i.test(error.message || "")) {
        return json(
          {
            success: false,
            message:
              "As tabelas do Oráculo Acadêmico ainda não existem no banco. Rode a migration 20260706_oraculo_groundwork.sql no SQL Editor do Supabase.",
          },
          503,
        );
      }
      throw new Error(`Falha ao consultar Oráculos: ${error.message}`);
    }

    const oraculoIds = (oraculos || []).map((item) => item.id);
    const institutionIds = [
      ...new Set((oraculos || []).map((item) => item.instituicao_id).filter(Boolean)),
    ];
    let supervisorsByOraculo = new Map();
    let institutionsById = new Map();

    if (oraculoIds.length) {
      const { data: supervisors, error: supervisorsError } = await supabaseAdmin
        .from("oraculo_supervisores")
        .select("oraculo_id, nome, email, oab_numero, oab_uf, relacao, status, respondido_em")
        .in("oraculo_id", oraculoIds);

      if (supervisorsError) {
        throw new Error(
          `Falha ao consultar supervisores: ${supervisorsError.message}`,
        );
      }

      supervisorsByOraculo = (supervisors || []).reduce((map, item) => {
        const current = map.get(item.oraculo_id) || [];
        current.push(item);
        map.set(item.oraculo_id, current);
        return map;
      }, new Map());
    }

    if (institutionIds.length) {
      const { data: institutions, error: institutionsError } = await supabaseAdmin
        .from("oraculo_instituicoes")
        .select("id, nome, status")
        .in("id", institutionIds);

      if (institutionsError) {
        throw new Error(
          `Falha ao consultar instituicoes: ${institutionsError.message}`,
        );
      }

      institutionsById = (institutions || []).reduce((map, item) => {
        map.set(item.id, item);
        return map;
      }, new Map());
    }

    const data = (oraculos || []).map((item) => ({
      ...item,
      instituicao: item.instituicao_id
        ? institutionsById.get(item.instituicao_id) || null
        : null,
      alerta_instituicao: !item.instituicao_id
        ? "Instituicao nao cadastrada"
        : institutionsById.get(item.instituicao_id)?.status !== "ATIVA"
          ? "Instituicao ainda nao ativa"
          : null,
      supervisores: supervisorsByOraculo.get(item.id) || [],
    }));

    return json({ success: true, data });
  } catch (error) {
    console.error("[Admin/Oraculos][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar os cadastros." },
      500,
    );
  }
}
