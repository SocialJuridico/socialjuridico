import { NextResponse } from "next/server";

import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import { createSignatureClient } from "@/lib/signatureSupabaseServer";

export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "signup";
  const target = new URL("/assinatura/entrar", resolvePublicAppOrigin(request));

  if (!tokenHash) {
    target.searchParams.set("erro", "link-invalido");
    return NextResponse.redirect(target);
  }

  try {
    const supabase = createSignatureClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (error) {
      console.error("[Signature confirmation] Erro:", error.message);
      target.searchParams.set("erro", "link-expirado");
      return NextResponse.redirect(target);
    }

    if (type === "magiclink") {
      const activationTarget = new URL("/assinatura/ativar", resolvePublicAppOrigin(request));
      return NextResponse.redirect(activationTarget);
    }

    await supabase.auth.signOut();
    target.searchParams.set("confirmado", "true");
    return NextResponse.redirect(target);
  } catch (error) {
    console.error("[Signature confirmation] Erro inesperado:", error);
    target.searchParams.set("erro", "falha-interna");
    return NextResponse.redirect(target);
  }
}
