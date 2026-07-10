import { supabaseAdmin } from "@/lib/supabase";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registra a ciência (LGPD) do aluno sobre o monitoramento de atividade.
export async function POST(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;
  if (!supabaseAdmin) {
    return oraculoJson({ success: false, message: "Serviço indisponível." }, 503);
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("oraculo_profissionais")
    .update({ telemetria_ciente_em: nowIso })
    .eq("id", auth.context.oraculoId);

  if (error) {
    return oraculoJson({ success: false, message: "Falha ao registrar ciência." }, 500);
  }
  return oraculoJson({ success: true, cienteEm: nowIso });
}
