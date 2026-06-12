import { cookies } from "next/headers";

import { parseAdvertiserSessionToken } from "@/lib/anuncianteAuth";
import { supabaseAdmin } from "@/lib/supabase";

export async function getActiveAdvertiserSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sj_anunciante_session");

  if (!sessionCookie?.value || !supabaseAdmin) {
    return null;
  }

  const session = parseAdvertiserSessionToken(sessionCookie.value);

  if (!session?.id) {
    return null;
  }

  const { data: advertiser, error } = await supabaseAdmin
    .from("anunciantes")
    .select("id, username, nome_empresa, ativo")
    .eq("id", session.id)
    .maybeSingle();

  if (error || !advertiser || advertiser.ativo === false) {
    return null;
  }

  return {
    ...session,
    username: advertiser.username,
    nome_empresa: advertiser.nome_empresa,
    ativo: true,
  };
}
