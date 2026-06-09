import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.socialjuridico.com.br";

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");

  if (!tokenHash) {
    return NextResponse.redirect(`${SITE_URL}/atualizar-senha?type=recovery&status=error`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(`${SITE_URL}/atualizar-senha?type=recovery&status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/atualizar-senha?type=recovery&status=success`);
}
