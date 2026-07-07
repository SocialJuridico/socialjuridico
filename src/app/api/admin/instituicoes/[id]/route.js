import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { buildInstitutionPayload } from "@/lib/oraculoInstitutionPayload";
import {
  syncInstitutionMainSupervisor,
  syncInstitutionPeople,
} from "@/lib/oraculoInstitutionSync";
import {
  validateInstitutionDossier,
  validateInstitutionStatusTransition,
} from "@/lib/oraculoInstitutionRules";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request, { params }) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const payload = buildInstitutionPayload(body);

    if (payload.nome.length < 3) {
      return json(
        { success: false, message: "Informe o nome da instituição." },
        400,
      );
    }

    const { data: current, error: fetchError } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Falha ao consultar instituição: ${fetchError.message}`);
    }
    if (!current) {
      return json(
        { success: false, message: "Instituição não encontrada." },
        404,
      );
    }

    const statusChanged = current.status !== payload.status;
    if (statusChanged) {
      const transitionError = validateInstitutionStatusTransition(
        current.status,
        payload.status,
      );
      if (transitionError) {
        return json({ success: false, message: transitionError }, 400);
      }
      if (!String(body?.motivo || "").trim()) {
        return json(
          {
            success: false,
            message: "Informe o motivo da alteração de status.",
          },
          400,
        );
      }
    }

    const dossierForValidation = {
      ...current,
      ...payload,
      supervisor_principal: body?.supervisor_principal || {},
    };
    const validationErrors = validateInstitutionDossier(dossierForValidation);
    if (validationErrors.length) {
      return json({ success: false, message: validationErrors[0] }, 400);
    }

    const { error: updateError } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      throw new Error(`Falha ao atualizar instituição: ${updateError.message}`);
    }

    await syncInstitutionPeople(supabaseAdmin, id, body?.pessoas || {});
    await syncInstitutionMainSupervisor(
      supabaseAdmin,
      id,
      body?.supervisor_principal || {},
    );

    if (statusChanged) {
      const { error: historyError } = await supabaseAdmin
        .from("oraculo_instituicao_status_history")
        .insert([
          {
            instituicao_id: id,
            de_status: current.status,
            para_status: payload.status,
            motivo: String(body?.motivo || "").trim(),
            alterado_por: auth.user.id,
          },
        ]);

      if (historyError) {
        throw new Error(`Falha ao registrar histórico: ${historyError.message}`);
      }
    }

    return json({
      success: true,
      message: statusChanged
        ? "Dossiê atualizado e histórico de status registrado."
        : "Dossiê institucional atualizado.",
    });
  } catch (error) {
    console.error("[Admin/Instituicoes][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar a instituição." },
      500,
    );
  }
}
