import { NextResponse } from "next/server";

import { normalizeBillingAddress, billingAddressValidationError } from "@/lib/billing/billingAddress";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function authenticatedUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

async function profileState(userId) {
  if (!supabaseAdmin || !userId) return "";

  const { data } = await supabaseAdmin
    .from("advogados")
    .select("estado")
    .eq("id", userId)
    .maybeSingle();

  return String(data?.estado || "").trim().toUpperCase();
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return json({ success: false, message: "Não autorizado." }, 401);

    const fallbackState = await profileState(user.id);
    const address = normalizeBillingAddress(
      user.user_metadata?.billing_address || {},
      fallbackState,
    );

    return json({ success: true, address });
  } catch (error) {
    console.error("[Checkout/MercadoPago/BillingProfile][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar o endereço de cobrança." },
      500,
    );
  }
}

export async function PUT(request) {
  try {
    if (!supabaseAdmin) {
      return json({ success: false, message: "Serviço indisponível." }, 503);
    }

    const user = await authenticatedUser();
    if (!user) return json({ success: false, message: "Não autorizado." }, 401);

    const body = await request.json().catch(() => null);
    const fallbackState = await profileState(user.id);
    const address = normalizeBillingAddress(body?.address || {}, fallbackState);
    const validationError = billingAddressValidationError(address);

    if (validationError) {
      return json({ success: false, message: validationError }, 422);
    }

    const metadata = {
      ...(user.user_metadata || {}),
      billing_address: address,
    };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    });

    if (error) throw error;

    return json({ success: true, address });
  } catch (error) {
    console.error("[Checkout/MercadoPago/BillingProfile][PUT] Erro:", error);
    return json(
      { success: false, message: "Não foi possível salvar o endereço de cobrança." },
      500,
    );
  }
}
