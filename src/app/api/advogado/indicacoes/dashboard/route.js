import { NextResponse } from "next/server";

import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";

import { getLawyerReferrals } from "../referralRead";

export const dynamic = "force-dynamic";

function getReferralCode(value) {
  try {
    return new URL(String(value || "")).searchParams.get("ref") || "";
  } catch {
    return "";
  }
}

export async function GET(request) {
  const response = await getLawyerReferrals();
  const payload = await response.json().catch(() => null);

  if (!payload || !response.ok || !payload.success || !payload.data) {
    return NextResponse.json(
      payload || {
        success: false,
        message: "Não foi possível carregar suas indicações.",
      },
      {
        status: response.status || 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const origin = resolvePublicAppOrigin(request);
  const referralUrl = new URL("/cadastro", origin);
  referralUrl.searchParams.set(
    "ref",
    getReferralCode(payload.data.referralUrl),
  );
  referralUrl.searchParams.set("perfil", "advogado");

  const normalizedReferralUrl = referralUrl.toString();

  return NextResponse.json(
    {
      ...payload,
      data: {
        ...payload.data,
        referralUrl: normalizedReferralUrl,
        shareText: `Conheça o Social Jurídico e crie sua conta profissional pelo meu link: ${normalizedReferralUrl}`,
      },
    },
    {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
