import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { isRsLawyer, applyRsDiscountCents } from "@/lib/lawyerDiscount";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const withCountryCode = digits.startsWith("55") ? digits : `55${digits}`;
  return `+${withCountryCode.slice(0, 15)}`;
}

// Valores em centavos. Mantidos em sincronia com o catálogo (planCatalog.js) e
// com o webhook (api/webhook/infinitepay) que reconhece estes mesmos valores.
function resolveProduct({ planType, jurisAmount, isPromoEligible, billingCycle, isRs }) {
  const normalizedPlan = String(planType || "").toUpperCase();
  const normalizedJuris = Number(jurisAmount || 0);
  const cycle = String(billingCycle || "MONTHLY").toUpperCase();

  if ([10, 20, 50].includes(normalizedJuris)) {
    const prices = { 10: 990, 20: 1690, 50: 3990 };

    return {
      priceInCents: prices[normalizedJuris],
      description: `Pacote ${normalizedJuris} Juris`,
    };
  }

  // Desconto de parceria OAB/RS: só nos preços regulares do plano (não na
  // promoção de 1º mês nem em Juris). O webhook reconhece os valores com
  // desconto para ativar o plano automaticamente.
  const withRs = (cents, plan) => (isRs ? applyRsDiscountCents(cents, plan) : cents);
  const rsTag = isRs ? " (desconto OAB/RS)" : "";

  if (normalizedPlan === "PRO") {
    if (cycle === "AVULSO") {
      return { priceInCents: withRs(21000, "PRO"), description: `Plano Pro Avulso 30 dias${rsTag}` };
    }
    if (cycle === "ANNUAL") {
      return { priceInCents: withRs(144000, "PRO"), description: `Plano Pro Anual${rsTag}` };
    }
    if (isPromoEligible) {
      return { priceInCents: 3999, description: "Plano Pro Promocional 30 dias" };
    }
    return { priceInCents: withRs(15000, "PRO"), description: `Plano Pro Mensal${rsTag}` };
  }

  if (normalizedPlan === "START") {
    if (cycle === "AVULSO") {
      return { priceInCents: withRs(4990, "START"), description: `Plano Start Avulso 30 dias${rsTag}` };
    }
    if (cycle === "ANNUAL") {
      return { priceInCents: withRs(43188, "START"), description: `Plano Start Anual${rsTag}` };
    }
    if (isPromoEligible) {
      return { priceInCents: 1099, description: "Plano Start Promocional 30 dias" };
    }
    return { priceInCents: withRs(4099, "START"), description: `Plano Start Mensal${rsTag}` };
  }

  return null;
}

export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de pagamento indisponível." },
        503,
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("advogados")
      .select(
        "id, name, email, phone, estado, oab, oab_verification_status, promo_start_used, promo_pro_used",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return json(
        { success: false, message: "Perfil do advogado não localizado." },
        404,
      );
    }

    if (profile.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          message: "Acesso restrito devido a pendências na OAB.",
        },
        403,
      );
    }

    const body = await request.json().catch(() => null);
    const planType = String(body?.planType || "").toUpperCase();
    const billingCycle = String(body?.billingCycle || "MONTHLY").toUpperCase();
    const jurisAmount = Number(body?.jurisAmount || 0);
    const requestedPromo = Boolean(body?.isPromoEligible);
    const promoAlreadyUsed =
      planType === "PRO"
        ? Boolean(profile.promo_pro_used)
        : Boolean(profile.promo_start_used);
    const product = resolveProduct({
      planType,
      jurisAmount,
      billingCycle,
      isPromoEligible: requestedPromo && !promoAlreadyUsed,
      isRs: isRsLawyer(profile),
    });

    if (!product) {
      return json(
        {
          success: false,
          message: "Não foi possível determinar o produto solicitado.",
        },
        400,
      );
    }

    const checkoutHandle =
      process.env.INFINITEPAY_HANDLE || "plataforma-social";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br";
    const orderReference = `sj_${user.id}_${Date.now()}`;

    const payload = {
      handle: checkoutHandle,
      items: [
        {
          quantity: 1,
          price: product.priceInCents,
          description: product.description,
        },
      ],
      redirect_url: `${siteUrl}/dashboard/advogado?payment_status=success`,
      webhook_url: `${siteUrl}/api/webhook/infinitepay`,
      order_nsu: orderReference,
      customer: {
        name: profile.name || "Cliente Social Jurídico",
        email: profile.email || user.email,
        phone_number: normalizePhone(profile.phone),
      },
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data = {};

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }

    if (!response.ok || !data.url) {
      console.error("[Checkout InfinitePay] Falha ao gerar link:", {
        status: response.status,
        hasResponseBody: Boolean(responseText),
      });

      return json(
        {
          success: false,
          message: "Não foi possível gerar o link de pagamento.",
        },
        502,
      );
    }

    return json({
      success: true,
      url: data.url,
      provider: "INFINITEPAY",
    });
  } catch (error) {
    console.error("[Checkout InfinitePay][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível iniciar o pagamento pela InfinitePay.",
      },
      500,
    );
  }
}
