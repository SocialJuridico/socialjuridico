import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { supervisorJson } from "@/lib/oraculo/staff/supervisorContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ativa o Dashboard do Supervisor Jurídico na conta já logada: liga
// advogado_user_id (auth_user_id) a todo vínculo oraculo_supervisores
// APROVADO com o mesmo e-mail. Nunca cria conta nova — só ativa em cima de
// uma sessão autenticada existente (mesmo padrão de /assinatura/entrar).
export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return supervisorJson({ success: false, message: "Não autenticado." }, 401);
  }

  const email = String(user.email || "").trim().toLowerCase();
  const { data: pending, error } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select("id")
    .eq("email", email)
    .eq("status", "APROVADO")
    .is("advogado_user_id", null);

  if (error) {
    return supervisorJson({ success: false, message: "Não foi possível ativar." }, 500);
  }
  if (!pending?.length) {
    return supervisorJson(
      {
        success: false,
        message: "Nenhum vínculo de supervisor aprovado encontrado para este e-mail.",
      },
      404,
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("oraculo_supervisores")
    .update({ advogado_user_id: user.id })
    .in(
      "id",
      pending.map((row) => row.id),
    );

  if (updateError) {
    return supervisorJson({ success: false, message: "Não foi possível ativar." }, 500);
  }

  return supervisorJson({
    success: true,
    message: "Serviço ativado. Redirecionando...",
    redirectTo: "/dashboard/oraculoacademico/supervisor",
  });
}
