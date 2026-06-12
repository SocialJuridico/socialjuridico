import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import {
  couponPublicPayload,
  normalizeCouponType,
  validateCouponAvailability,
} from "@/lib/coupons/couponServer";

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
      return json({ success: false, message: "Origem não autorizada." }, 403);
    }
  } catch {
    return json({ success: false, message: "Origem inválida." }, 403);
  }

  return null;
}

export async function POST(request) {
  try {
    const originResponse = validateOrigin(request);
    if (originResponse) return originResponse;

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço de cupons indisponível." },
        503,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const body = await request.json().catch(() => null);
    const expectedType = normalizeCouponType(body?.tipo);

    if (!body?.codigo || !expectedType) {
      return json(
        {
          success: false,
          message: "Informe o código e o produto em que o cupom será utilizado.",
        },
        400,
      );
    }

    const coupon = await validateCouponAvailability(supabaseAdmin, {
      code: body.codigo,
      userId: user.id,
      expectedType,
    });

    return json({
      success: true,
      status: "success",
      message: "Cupom válido.",
      ...couponPublicPayload(coupon),
    });
  } catch (error) {
    console.error("[Checkout/ValidateCoupon] Erro:", error);
    const status = Number(error?.status) || 500;

    return json(
      {
        success: false,
        status: "error",
        message:
          status < 500
            ? error.message
            : "Não foi possível validar o cupom no momento.",
        error:
          status < 500
            ? error.message
            : "Não foi possível validar o cupom no momento.",
        code: error?.code || "COUPON_VALIDATION_FAILED",
      },
      status,
    );
  }
}
