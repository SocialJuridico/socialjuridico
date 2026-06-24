import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";
import { NextResponse } from "next/server";

function buildConfirmPageUrl(request, status, message) {
  const url = new URL(
    "/confirmar-email",
    resolvePublicAppOrigin(request),
  );
  url.searchParams.set("status", status);
  if (message) {
    url.searchParams.set("message", message);
  }
  return url;
}

/**
 * Para advogados ainda não verificados, cria uma sessão na API de
 * verificação de OAB e devolve a URL pra onde o navegador deve ser
 * redirecionado. Retorna null em qualquer cenário em que o fluxo padrão
 * (ir direto para /confirmar-email) deve ser seguido.
 */
async function criarSessaoDeVerificacao(request, userId) {
  if (!supabaseAdmin) return null;

  const { data: advogado, error } = await supabaseAdmin
    .from("advogados")
    .select("id, name, email, oab, estado, role, oab_verification_status")
    .eq("id", userId)
    .single();

  if (error || !advogado) return null;
  if (advogado.role !== "LAWYER") return null;
  if (advogado.oab_verification_status === "VERIFIED") return null;
  if (!advogado.oab || !advogado.estado) return null;

  const apiUrl = process.env.VERIFICACAO_API_URL;
  const apiKey = process.env.VERIFICACAO_API_KEY;
  if (!apiUrl || !apiKey) {
    console.error("[confirm-email] VERIFICACAO_API_URL/VERIFICACAO_API_KEY não configuradas.");
    return null;
  }

  try {
    const callbackUrl = new URL(
      "/api/webhooks/verificacao-oab",
      resolvePublicAppOrigin(request),
    ).toString();

    const response = await fetch(`${apiUrl}/api/sessoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        advogado_id: advogado.id,
        nome: advogado.name,
        oab: advogado.oab,
        uf: advogado.estado,
        callback_url: callbackUrl,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success || !data?.url) {
      console.error("[confirm-email] Falha ao criar sessão de verificação:", data);
      return null;
    }

    return data.url;
  } catch (err) {
    console.error("[confirm-email] Erro ao chamar API de verificação:", err);
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  if (!token_hash) {
    return NextResponse.redirect(
      buildConfirmPageUrl(
        request,
        "error",
        "Link de confirmação inválido ou incompleto.",
      ),
    );
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
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
          request,
          "error",
          "Não foi possível confirmar o e-mail. O link pode ter expirado ou já ter sido utilizado.",
        ),
      );
    }

    const userId = data?.user?.id;
    const sessaoUrl = userId
      ? await criarSessaoDeVerificacao(request, userId)
      : null;

    if (sessaoUrl) {
      return NextResponse.redirect(sessaoUrl);
    }

    return NextResponse.redirect(
      buildConfirmPageUrl(
        request,
        "success",
        "E-mail confirmado com sucesso!",
      ),
    );
  } catch (error) {
    console.error("[confirm-email] Erro inesperado:", error);
    return NextResponse.redirect(
      buildConfirmPageUrl(
        request,
        "error",
        "Erro interno ao confirmar o e-mail.",
      ),
    );
  }
}
