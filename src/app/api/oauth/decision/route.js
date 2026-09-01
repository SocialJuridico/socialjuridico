import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const formData = await request.formData();
  const decision = formData.get("decision");
  const authorizationId = formData.get("authorization_id");

  if (typeof authorizationId !== "string" || !authorizationId) {
    return NextResponse.json(
      { error: "authorization_id ausente." },
      { status: 400 },
    );
  }

  if (decision !== "approve" && decision !== "deny") {
    return NextResponse.json(
      { error: "Decisão OAuth inválida." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    const loginUrl = new URL("/oauth/login", request.url);
    loginUrl.searchParams.set("authorization_id", authorizationId);
    return NextResponse.redirect(loginUrl, 303);
  }

  const result =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);

  if (result.error || !result.data?.redirect_url) {
    console.error("[OAuth Decision] Falha ao processar autorização:", {
      decision,
      authorizationId,
      error: result.error?.message || "redirect_url ausente",
    });

    const consentUrl = new URL("/oauth/consent", request.url);
    consentUrl.searchParams.set("authorization_id", authorizationId);
    consentUrl.searchParams.set("oauth_error", "true");
    return NextResponse.redirect(consentUrl, 303);
  }

  return NextResponse.redirect(result.data.redirect_url, 303);
}
