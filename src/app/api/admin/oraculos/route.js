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
        "id, name, email, whatsapp, cpf, cidade, estado, tipo, status, instituicao_ensino, periodo_atual, previsao_conclusao, numero_matricula, ano_conclusao, prestou_exame_oab, aprovado_exame_fase, atuou_area_juridica, participa_nucleo_pratica, fez_estagio_juridico, oab_estagiario_numero, oab_estagiario_uf, comprovante_matricula_url, diploma_url, comprovante_estagiario_url, areas_interesse, experiencia_pratica, disponibilidade_semanal, bio, motivo_participacao, termos_aceitos_em, aprovado_em, reprovado_em, motivo_reprovacao, suspenso_em, motivo_suspensao, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(`Falha ao consultar Oráculos: ${error.message}`);

    const oraculoIds = (oraculos || []).map((item) => item.id);
    let supervisorsByOraculo = new Map();

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

    const data = (oraculos || []).map((item) => ({
      ...item,
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
