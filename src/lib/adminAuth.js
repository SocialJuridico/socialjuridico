import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export async function getAuthenticatedAdmin() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      status: 401,
      message: "Não autorizado",
      supabase,
      db: supabaseAdmin || supabase,
      user: null,
      admin: null,
    };
  }

  const db = supabaseAdmin || supabase;
  const { data: admin, error: adminError } = await db
    .from("admins")
    .select("id, name, email, role, created_at, google_sync_enabled")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (adminError || !admin) {
    return {
      ok: false,
      status: 403,
      message: "Acesso restrito a administradores",
      supabase,
      db,
      user,
      admin: null,
    };
  }

  return {
    ok: true,
    status: 200,
    message: null,
    supabase,
    db,
    user,
    admin,
  };
}
