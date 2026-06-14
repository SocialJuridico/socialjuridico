import { createClient } from "@/lib/supabaseServer";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import { NextResponse } from "next/server";

function buildRecoveryPageUrl(request, status) {
  const url = new URL(
    "/atualizar-senha",
    resolvePublicAppOrigin(request),
  );
  url.searchParams.set("type", "recovery");
  url.searchParams.set("status", status);
  return url;
}

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");

  if (!tokenHash) {
    return NextResponse.redirect(buildRecoveryPageUrl(request, "error"));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    return NextResponse.redirect(buildRecoveryPageUrl(request, "error"));
  }

  return NextResponse.redirect(buildRecoveryPageUrl(request, "success"));
}
