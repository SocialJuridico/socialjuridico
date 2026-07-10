import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { getOraculoAcademicContext } from "@/lib/oraculo/oraculoAcademicContext";

export function oraculoJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Resolve o estudante Oráculo autenticado para rotas de API.
 * Sempre valida no servidor (nunca confia em oraculo_id do frontend).
 *
 * Retorna { ok:true, context, user } ou { ok:false, response }.
 * Passe requireActive=true para exigir vínculo acadêmico ATIVO.
 */
export async function requireOraculoStudent(request, { requireActive = false } = {}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: oraculoJson({ success: false, message: "Não autenticado." }, 401),
    };
  }

  const context = await getOraculoAcademicContext({ authUserId: user.id });
  if (!context?.oraculoId) {
    return {
      ok: false,
      response: oraculoJson(
        { success: false, message: "Perfil de Oráculo não encontrado." },
        403,
      ),
    };
  }

  if (requireActive && context.studentStatus !== "ATIVO") {
    return {
      ok: false,
      response: oraculoJson(
        {
          success: false,
          message: "Seu vínculo acadêmico precisa estar ativo para esta ação.",
        },
        403,
      ),
    };
  }

  return { ok: true, context, user };
}
