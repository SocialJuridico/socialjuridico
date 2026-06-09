import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://socialjuridico.com.br";

function buildConfirmPageUrl(status, message) {
  const url = new URL("/confirmar-email", SITE_URL);
  url.searchParams.set("status", status);
  if (message) {
    url.searchParams.set("message", message);
  }
  return url;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  if (!token_hash) {
    return NextResponse.redirect(
      buildConfirmPageUrl("error", "Link de confirmação inválido ou incompleto."),
    );
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error("[confirm-email] Erro ao confirmar e-mail:", {
        message: error.message,
        status: error.status,
        name: error.name,
      });

      return NextResponse.redirect(
        buildConfirmPageUrl(
          "error",
          "Não foi possível confirmar o e-mail. O link pode ter expirado ou já ter sido utilizado.",
        ),
      );
    }

    return NextResponse.redirect(
      buildConfirmPageUrl("success", "E-mail confirmado com sucesso!"),
    );
  } catch (error) {
    console.error("[confirm-email] Erro inesperado:", error);
    return NextResponse.redirect(
      buildConfirmPageUrl("error", "Erro interno ao confirmar o e-mail."),
    );
  }
}
