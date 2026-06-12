import { createClient } from "@/lib/supabaseServer";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { json, requireCaseUser } from "./caseRouteUtils";

export async function getCases(request) {
  try {
    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const supabase = createClient();
    const db = access.db || supabase;
    const role = (await getRoleFromDatabase(db, access.user.id)) || "CLIENT";

    if (role === "LAWYER") {
      const { data, error } = await db
        .from("casos")
        .select("*")
        .or(
          `advogado_id.eq.${access.user.id},and(status.eq.ABERTO,advogado_id.is.null),and(status.eq.NEGOCIANDO,advogado_id.is.null)`,
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return json({ success: true, data: data || [] });
    }

    const { data, error } = await db
      .from("casos")
      .select("*")
      .eq("cliente_id", access.user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    if ((data || []).length === 0 && access.user.email) {
      const { data: profile } = await db
        .from("clientes")
        .select("id")
        .eq("email", access.user.email)
        .maybeSingle();

      if (profile && profile.id !== access.user.id) {
        const { data: emailData, error: emailError } = await db
          .from("casos")
          .select("*")
          .eq("cliente_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (emailError) throw emailError;
        if (emailData?.length) {
          return json({ success: true, data: emailData });
        }
      }
    }

    return json({ success: true, data: data || [] });
  } catch (error) {
    console.error("[Casos][GET] Erro:", error);
    return json(
      { success: false, message: "Erro ao carregar os casos." },
      500,
    );
  }
}
