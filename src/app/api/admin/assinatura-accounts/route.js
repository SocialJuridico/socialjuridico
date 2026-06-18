import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo não configurado no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET — list all signature accounts with org + subscription + usage data
// ──────────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;

    // 1. All signature accounts
    const { data: accounts, error: accErr } = await db
      .from("signature_accounts")
      .select("user_id, email, full_name, phone, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (accErr) {
      throw new Error(`Falha ao consultar contas: ${accErr.message}`);
    }

    if (!accounts || accounts.length === 0) {
      return json({ success: true, data: [] });
    }

    const userIds = accounts.map((a) => a.user_id);

    // 2. Organizations owned by these users (each user owns 1 org)
    const { data: orgs, error: orgErr } = await db
      .from("signature_organizations")
      .select("id, owner_user_id, name, slug, status, created_at")
      .in("owner_user_id", userIds);

    if (orgErr) {
      console.warn("[Admin/AssinaturaAccounts][GET] Orgs indisponíveis:", orgErr.message);
    }

    const orgsByOwner = new Map((orgs || []).map((o) => [o.owner_user_id, o]));
    const orgIds = (orgs || []).map((o) => o.id);

    // 3. Subscriptions
    const { data: subscriptions, error: subErr } = await db
      .from("signature_subscriptions")
      .select(
        "organization_id, plan_code, status, documents_limit, certificates_limit, price_cents, current_period_start, current_period_end, created_at, updated_at",
      )
      .in("organization_id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

    if (subErr) {
      console.warn("[Admin/AssinaturaAccounts][GET] Subs indisponíveis:", subErr.message);
    }

    const subsByOrg = new Map((subscriptions || []).map((s) => [s.organization_id, s]));

    // 4. Current usage periods
    const today = new Date().toISOString().slice(0, 10);
    const { data: usagePeriods, error: usageErr } = await db
      .from("signature_usage_periods")
      .select("organization_id, documents_used, certificates_used, ai_generations_used, extrajudicial_notifications_used, period_start, period_end, updated_at")
      .in("organization_id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"])
      .lte("period_start", today)
      .gte("period_end", today);

    if (usageErr) {
      console.warn("[Admin/AssinaturaAccounts][GET] Uso indisponível:", usageErr.message);
    }

    const usageByOrg = new Map((usagePeriods || []).map((u) => [u.organization_id, u]));

    // 5. Compose enriched records
    const data = accounts.map((account) => {
      const org = orgsByOwner.get(account.user_id) || null;
      const sub = org ? subsByOrg.get(org.id) || null : null;
      const usage = org ? usageByOrg.get(org.id) || null : null;

      return {
        user_id: account.user_id,
        email: account.email,
        full_name: account.full_name,
        phone: account.phone || null,
        account_status: account.status,
        created_at: account.created_at,
        updated_at: account.updated_at,
        org_id: org?.id || null,
        org_name: org?.name || null,
        org_slug: org?.slug || null,
        org_status: org?.status || null,
        plan_code: sub?.plan_code || "FREE",
        sub_status: sub?.status || null,
        documents_limit: sub?.documents_limit ?? null,
        certificates_limit: sub?.certificates_limit ?? null,
        price_cents: sub?.price_cents ?? 0,
        period_start: sub?.current_period_start || null,
        period_end: sub?.current_period_end || null,
        documents_used: usage?.documents_used ?? 0,
        certificates_used: usage?.certificates_used ?? 0,
        ai_generations_used: usage?.ai_generations_used ?? 0,
        extrajudicial_notifications_used: usage?.extrajudicial_notifications_used ?? 0,
      };
    });

    return json({ success: true, data });
  } catch (error) {
    console.error("[Admin/AssinaturaAccounts][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar as contas de assinatura." },
      500,
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT — admin actions: SUSPEND, ACTIVATE, CHANGE_PLAN
// ──────────────────────────────────────────────────────────────────────────────
const ALLOWED_ACTIONS = new Set(["SUSPEND_ACCOUNT", "ACTIVATE_ACCOUNT", "SUSPEND_ORG", "ACTIVATE_ORG", "CHANGE_PLAN"]);

const PLAN_LIMITS = {
  FREE:         { documents_limit: 3,   certificates_limit: 0,   price_cents: 0 },
  ESSENTIAL:    { documents_limit: 10,  certificates_limit: 10,  price_cents: 1000 },
  PROFESSIONAL: { documents_limit: 50,  certificates_limit: 50,  price_cents: 4500 },
  BUSINESS:     { documents_limit: 100, certificates_limit: 100, price_cents: 8500 },
  UNLIMITED:    { documents_limit: null, certificates_limit: null, price_cents: 30000 },
};

export async function PUT(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const body = await request.json().catch(() => null);

    const { userId, orgId, action, value } = body || {};

    if (!action || !ALLOWED_ACTIONS.has(action)) {
      return json({ success: false, message: "Ação inválida." }, 400);
    }

    if (action === "CHANGE_PLAN") {
      const planCode = String(value?.plan_code || "").toUpperCase();
      if (!PLAN_LIMITS[planCode]) {
        return json({ success: false, message: "Plano inválido." }, 400);
      }

      if (!orgId) {
        return json({ success: false, message: "ID da organização não informado." }, 400);
      }

      const limits = PLAN_LIMITS[planCode];
      const { error } = await db
        .from("signature_subscriptions")
        .update({
          plan_code: planCode,
          documents_limit: limits.documents_limit,
          certificates_limit: limits.certificates_limit,
          price_cents: limits.price_cents,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", orgId);

      if (error) throw new Error(`Falha ao alterar plano: ${error.message}`);

      return json({ success: true, message: `Plano alterado para ${planCode} com sucesso.` });
    }

    if (action === "SUSPEND_ACCOUNT" || action === "ACTIVATE_ACCOUNT") {
      if (!userId) return json({ success: false, message: "ID do usuário não informado." }, 400);

      const newStatus = action === "SUSPEND_ACCOUNT" ? "SUSPENDED" : "ACTIVE";
      const { error } = await db
        .from("signature_accounts")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (error) throw new Error(`Falha ao atualizar conta: ${error.message}`);

      return json({
        success: true,
        message: newStatus === "SUSPENDED" ? "Conta suspensa com sucesso." : "Conta reativada com sucesso.",
      });
    }

    if (action === "SUSPEND_ORG" || action === "ACTIVATE_ORG") {
      if (!orgId) return json({ success: false, message: "ID da organização não informado." }, 400);

      const newStatus = action === "SUSPEND_ORG" ? "SUSPENDED" : "ACTIVE";
      const { error } = await db
        .from("signature_organizations")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orgId);

      if (error) throw new Error(`Falha ao atualizar organização: ${error.message}`);

      return json({
        success: true,
        message: newStatus === "SUSPENDED" ? "Organização suspensa com sucesso." : "Organização reativada com sucesso.",
      });
    }

    return json({ success: false, message: "Ação não implementada." }, 400);
  } catch (error) {
    console.error("[Admin/AssinaturaAccounts][PUT] Erro:", error);
    return json({ success: false, message: "Erro ao executar ação administrativa." }, 500);
  }
}
