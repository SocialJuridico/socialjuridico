import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
  scopeClientQuery,
  serializeClientListItem,
} from "@/lib/lawyerClients/clientServer";
import { getCrmAiCapturePolicy } from "@/lib/lawyerClients/crmAiCaptureServer";
import {
  normalizeClientQuery,
  validateClientPayload,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function countScopedClients(db, lawyerIds, options = {}) {
  let query = db.from("crm_clients").select("id", { count: "exact", head: true });
  query = scopeClientQuery(query, lawyerIds);
  if (options.status) query = query.eq("status", options.status);
  if (options.riskMin) query = query.gte("risk_score", options.riskMin);
  return query;
}

async function findDuplicate(access, field, value) {
  if (!value) return null;
  const { data, error } = await access.db
    .from("crm_clients")
    .select("id")
    .eq("lawyer_id", access.user.id)
    .eq(field, value)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function GET(request) {
  try {
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { page, pageSize, status, scope, search } = normalizeClientQuery(searchParams);
    const activeLawyerIds = scope === "mine" ? [access.user.id] : access.lawyerIds;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let listQuery = access.db
      .from("crm_clients")
      .select(
        "id, lawyer_id, name, type, email, phone, cpf_cnpj, profession, status, risk_score, created_at, updated_at",
        { count: "exact" },
      );
    listQuery = scopeClientQuery(listQuery, activeLawyerIds);
    if (status !== "all") listQuery = listQuery.eq("status", status);
    if (search) {
      listQuery = listQuery.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,profession.ilike.%${search}%`,
      );
    }
    listQuery = listQuery.order("created_at", { ascending: false }).range(from, to);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    let financeQuery = access.db
      .from("crm_finance")
      .select("amount, status, due_date, lawyer_id")
      .gte("due_date", monthStart)
      .lt("due_date", nextMonth);
    financeQuery = scopeClientQuery(financeQuery, activeLawyerIds);

    const [
      listResult,
      totalResult,
      activeResult,
      highRiskResult,
      ownClientsResult,
      financeResult,
    ] = await Promise.all([
      listQuery,
      countScopedClients(access.db, activeLawyerIds),
      countScopedClients(access.db, activeLawyerIds, { status: "Ativo" }),
      countScopedClients(access.db, activeLawyerIds, { riskMin: 70 }),
      countScopedClients(access.db, [access.user.id]),
      financeQuery,
    ]);

    for (const result of [
      listResult,
      totalResult,
      activeResult,
      highRiskResult,
      ownClientsResult,
      financeResult,
    ]) {
      if (result.error) throw result.error;
    }

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    const finance = financeResult.data || [];
    const expected = finance.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const received = finance
      .filter((item) => item.status === "PAGO")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const aiPolicy = getCrmAiCapturePolicy(access);
    const maxClients = Number.isFinite(access.planLimits?.maxCrmClients)
      ? access.planLimits.maxCrmClients
      : null;

    return clientJson({
      success: true,
      data: (listResult.data || []).map((client) =>
        serializeClientListItem(client, memberMap),
      ),
      members: access.members.map((member) => ({
        id: member.id,
        name: member.name || "Membro",
        cargo: member.cargo || "advogado",
      })),
      permissions: {
        canDelegate: access.canDelegate,
        canUseAiCapture: aiPolicy.canUse,
      },
      plan: {
        type: access.planType,
        maxClients,
      },
      usage: {
        crmClients: {
          used: ownClientsResult.count || 0,
          limit: maxClients,
          remaining:
            maxClients === null
              ? null
              : Math.max(maxClients - (ownClientsResult.count || 0), 0),
        },
        aiCapture: aiPolicy,
      },
      metrics: {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        highRisk: highRiskResult.count || 0,
        expected,
        received,
      },
      pagination: {
        page,
        pageSize,
        total: listResult.count || 0,
        totalPages: Math.max(1, Math.ceil((listResult.count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/Clientes][GET] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar os clientes.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function POST(request) {
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const validation = validateClientPayload(await request.json());
    if (!validation.valid) {
      return clientJson(
        {
          success: false,
          message: "Revise os dados do cliente.",
          errors: validation.errors,
        },
        400,
      );
    }
    const payload = validation.data;

    const { data: existing, error: existingError } = await access.db
      .from("crm_clients")
      .select(
        "id, lawyer_id, name, type, email, phone, cpf_cnpj, profession, status, risk_score, created_at, updated_at",
      )
      .eq("lawyer_id", access.user.id)
      .eq("request_id", payload.requestId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      const memberMap = new Map(access.members.map((member) => [member.id, member]));
      return clientJson({
        success: true,
        idempotent: true,
        message: "Cliente já cadastrado por esta solicitação.",
        data: serializeClientListItem(existing, memberMap),
      });
    }

    const { count, error: countError } = await access.db
      .from("crm_clients")
      .select("id", { count: "exact", head: true })
      .eq("lawyer_id", access.user.id);
    if (countError) throw countError;
    if (
      Number.isFinite(access.planLimits?.maxCrmClients) &&
      (count || 0) >= access.planLimits.maxCrmClients
    ) {
      return clientJson(
        {
          success: false,
          quotaExceeded: true,
          message: "Você atingiu o limite de clientes do seu plano.",
        },
        403,
      );
    }

    const [emailDuplicate, documentDuplicate] = await Promise.all([
      findDuplicate(access, "email", payload.email),
      findDuplicate(access, "cpf_cnpj", payload.cpfCnpj),
    ]);
    if (emailDuplicate || documentDuplicate) {
      return clientJson(
        {
          success: false,
          message: "Já existe um cliente com este e-mail ou documento.",
        },
        409,
      );
    }

    const now = new Date().toISOString();
    const clientId = crypto.randomUUID();
    const riskScore = crypto.randomInt(15, 86);
    const { data, error } = await access.db
      .from("crm_clients")
      .insert([
        {
          id: clientId,
          request_id: payload.requestId,
          lawyer_id: access.user.id,
          name: payload.name,
          type: payload.type,
          cpf_cnpj: payload.cpfCnpj || null,
          rg: payload.rg || null,
          civil_status: payload.civilStatus || null,
          profession: payload.profession || null,
          phone: payload.phone || null,
          address: payload.address || null,
          email: payload.email || null,
          notes: payload.notes || null,
          status: payload.status,
          risk_score: riskScore,
          created_at: now,
          updated_at: now,
        },
      ])
      .select(
        "id, lawyer_id, name, type, email, phone, cpf_cnpj, profession, status, risk_score, created_at, updated_at",
      )
      .single();
    if (error) throw error;

    await recordClientAudit(access, request, {
      requestId: payload.requestId,
      clientId,
      action: "CREATE_CLIENT",
      metadata: { type: payload.type, status: payload.status },
    });

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    return clientJson(
      {
        success: true,
        message: "Cliente cadastrado com sucesso.",
        data: serializeClientListItem(data, memberMap),
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Clientes][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível cadastrar o cliente.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
