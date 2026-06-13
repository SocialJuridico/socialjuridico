import {
  classifyReferralForLawyer,
  CONFIRMED_AFFILIATE_TRANSACTION_STATUSES,
  isAffiliateGovernanceMissing,
  maskAffiliateEmail,
  normalizeAffiliateEmail,
  summarizeLawyerReferrals,
} from "@/lib/affiliates/referralPresentation";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

const MAX_REFERRALS = 500;
const configuredCommissionJuris = Number(
  process.env.AFFILIATE_COMMISSION_JURIS || 35,
);
const DEFAULT_COMMISSION_JURIS = Number.isFinite(configuredCommissionJuris)
  ? Math.max(1, Math.min(1000, configuredCommissionJuris))
  : 35;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function createReferralUrl(userId) {
  const configuredBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.socialjuridico.com.br";

  try {
    const url = new URL("/cadastro", configuredBase);
    url.searchParams.set("ref", userId);
    url.searchParams.set("perfil", "advogado");
    return url.toString();
  } catch {
    return `https://www.socialjuridico.com.br/cadastro?ref=${encodeURIComponent(
      userId,
    )}&perfil=advogado`;
  }
}

async function loadReferrals(userId) {
  const currentResult = await supabaseAdmin
    .from("indicacoes")
    .select(
      "id, indicador_id, nome_indicado, email_indicado, status, valor_comissao, created_at, indicado_advogado_id, commissioned_at, review_status, risk_level, updated_at",
    )
    .eq("indicador_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_REFERRALS);

  if (!currentResult.error) {
    return {
      referrals: currentResult.data || [],
      governanceAvailable: true,
    };
  }

  if (!isAffiliateGovernanceMissing(currentResult.error)) {
    throw currentResult.error;
  }

  const legacyResult = await supabaseAdmin
    .from("indicacoes")
    .select(
      "id, indicador_id, nome_indicado, email_indicado, status, valor_comissao, created_at",
    )
    .eq("indicador_id", userId)
    .order("created_at", { ascending: false })
    .limit(MAX_REFERRALS);

  if (legacyResult.error) throw legacyResult.error;

  return {
    referrals: (legacyResult.data || []).map((item) => ({
      ...item,
      indicado_advogado_id: null,
      commissioned_at: null,
      review_status: "PENDING",
      risk_level: "STANDARD",
      updated_at: item.created_at,
    })),
    governanceAvailable: false,
  };
}

async function loadRelatedProfiles(referrals) {
  const lawyerIds = [
    ...new Set(
      referrals.map((item) => item.indicado_advogado_id).filter(Boolean),
    ),
  ];
  const emails = [
    ...new Set(
      referrals
        .map((item) => normalizeAffiliateEmail(item.email_indicado))
        .filter(Boolean),
    ),
  ];

  const [lawyersByIdResult, lawyersByEmailResult, clientsByEmailResult] =
    await Promise.all([
      lawyerIds.length
        ? supabaseAdmin
            .from("advogados")
            .select("id, name, email, plan_type, is_premium, created_at")
            .in("id", lawyerIds)
        : Promise.resolve({ data: [], error: null }),
      emails.length
        ? supabaseAdmin
            .from("advogados")
            .select("id, name, email, plan_type, is_premium, created_at")
            .in("email", emails)
        : Promise.resolve({ data: [], error: null }),
      emails.length
        ? supabaseAdmin
            .from("clientes")
            .select("id, name, email, created_at")
            .in("email", emails)
        : Promise.resolve({ data: [], error: null }),
    ]);

  for (const result of [
    lawyersByIdResult,
    lawyersByEmailResult,
    clientsByEmailResult,
  ]) {
    if (result.error) throw result.error;
  }

  return {
    lawyersById: new Map(
      (lawyersByIdResult.data || []).map((profile) => [profile.id, profile]),
    ),
    lawyersByEmail: new Map(
      (lawyersByEmailResult.data || []).map((profile) => [
        normalizeAffiliateEmail(profile.email),
        profile,
      ]),
    ),
    clientsByEmail: new Map(
      (clientsByEmailResult.data || []).map((profile) => [
        normalizeAffiliateEmail(profile.email),
        profile,
      ]),
    ),
  };
}

async function loadTransactions(lawyerIds) {
  if (!lawyerIds.length) return new Map();

  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("id, advogado_id, status, created_at")
    .in("advogado_id", lawyerIds)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .in("status", CONFIRMED_AFFILIATE_TRANSACTION_STATUSES)
    .gt("valor", 0)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) throw error;

  return (data || []).reduce((map, transaction) => {
    const current = map.get(transaction.advogado_id) || [];
    current.push(transaction);
    map.set(transaction.advogado_id, current);
    return map;
  }, new Map());
}

export async function getLawyerReferrals() {
  try {
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
        { success: false, message: "Serviço de indicações indisponível." },
        503,
      );
    }

    const { data: lawyer, error: lawyerError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, oab_verification_status")
      .eq("id", user.id)
      .maybeSingle();

    if (lawyerError || !lawyer) {
      return json(
        { success: false, message: "Perfil de advogado não encontrado." },
        404,
      );
    }

    if (lawyer.oab_verification_status === "ERROR") {
      return json(
        {
          success: false,
          message: "Acesso restrito devido a pendências na OAB.",
        },
        403,
      );
    }

    const referralResult = await loadReferrals(user.id);
    const referrals = referralResult.referrals;
    const profiles = await loadRelatedProfiles(referrals);

    const referredLawyers = referrals
      .map((referral) => {
        const email = normalizeAffiliateEmail(referral.email_indicado);
        return (
          profiles.lawyersById.get(referral.indicado_advogado_id) ||
          profiles.lawyersByEmail.get(email) ||
          null
        );
      })
      .filter(Boolean);

    const transactionMap = await loadTransactions([
      ...new Set(referredLawyers.map((profile) => profile.id)),
    ]);

    const items = referrals.map((referral) => {
      const email = normalizeAffiliateEmail(referral.email_indicado);
      const referredLawyer =
        profiles.lawyersById.get(referral.indicado_advogado_id) ||
        profiles.lawyersByEmail.get(email) ||
        null;
      const referredClient = profiles.clientsByEmail.get(email) || null;
      const referralCreatedAt = new Date(referral.created_at || 0).getTime();
      const qualifyingTransaction = referredLawyer
        ? (transactionMap.get(referredLawyer.id) || []).find(
            (transaction) =>
              new Date(transaction.created_at || 0).getTime() >=
              referralCreatedAt,
          ) || null
        : null;
      const presentationStatus = classifyReferralForLawyer({
        referral,
        referredLawyer,
        referredClient,
        qualifyingTransaction,
      });

      return {
        id: referral.id,
        createdAt: referral.created_at,
        updatedAt: referral.updated_at || referral.created_at,
        referred: {
          name:
            referredLawyer?.name ||
            referredClient?.name ||
            referral.nome_indicado ||
            "Pessoa indicada",
          maskedEmail: maskAffiliateEmail(referral.email_indicado),
          profileType: referredLawyer
            ? "LAWYER"
            : referredClient
              ? "CLIENT"
              : "UNREGISTERED",
        },
        status: presentationStatus,
        reward: {
          amount:
            presentationStatus.code === "COMMISSIONED"
              ? Number(referral.valor_comissao || 0)
              : 0,
          creditedAt: referral.commissioned_at || null,
        },
      };
    });

    const referralUrl = createReferralUrl(user.id);

    return json({
      success: true,
      data: {
        referralUrl,
        shareText: `Conheça o Social Jurídico e crie sua conta profissional pelo meu link: ${referralUrl}`,
        referrals: items,
        summary: summarizeLawyerReferrals(items),
        policy: {
          defaultCommissionJuris: DEFAULT_COMMISSION_JURIS,
          rewardType: "FIXED_JURIS",
          requiresProfessionalRegistration: true,
          requiresConfirmedPaidSubscription: true,
          validationTimeLabel: "após validação administrativa",
          cashWithdrawalsSupported: false,
        },
        schema: {
          governanceAvailable: referralResult.governanceAvailable,
          resultLimit: MAX_REFERRALS,
          truncated: referrals.length >= MAX_REFERRALS,
        },
        privacy: {
          emailsMasked: true,
          paymentReferencesReturned: false,
        },
      },
    });
  } catch (error) {
    console.error("[Advogado/Indicacoes] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar suas indicações." },
      500,
    );
  }
}
