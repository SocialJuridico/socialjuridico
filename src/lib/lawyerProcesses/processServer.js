import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  getScopedClient,
  recordClientAudit,
  scopeClientQuery,
} from "@/lib/lawyerClients/clientServer";
import { normalizeClientDigits } from "@/lib/lawyerClients/clientValidation";
import { presentLawyerProcessMovement } from "./movementPresentation";
import {
  formatProcessNumber,
  normalizePartyPayload,
  normalizeProcessNumber,
  normalizeProcessText,
  partyToCrmPayload,
} from "./processValidation";

const PROCESS_TABLE = "lawyer_processes";
const PARTIES_TABLE = "lawyer_process_parties";
const MOVEMENTS_TABLE = "lawyer_process_movements";
const WARNINGS_TABLE = "lawyer_process_warnings";

function externalBaseUrl() {
  return String(process.env.API_SOCIAL_JURIDICO_BASE_URL || "https://n8n.socialjuridico.com.br")
    .trim()
    .replace(/\/+$/, "");
}

function externalApiKey() {
  return (
    process.env.API_SOCIAL_JURIDICO_KEY ||
    process.env.API_SOCIAL_JURIDICO_SECRET_KEY ||
    process.env.SOCIAL_JURIDICO_API_KEY ||
    process.env.DATAJUD_PROXY_API_KEY ||
    ""
  );
}

export async function callExternalProcessApi(path, body) {
  const apiKey = externalApiKey();

  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      payload: {
        success: false,
        message:
          "API key da API Social Jurídico não configurada no servidor. Configure API_SOCIAL_JURIDICO_KEY.",
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch(`${externalBaseUrl()}${path}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      payload: payload || {
        success: false,
        message: "A API Social Jurídico retornou uma resposta inválida.",
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: error?.name === "AbortError" ? 504 : 502,
      payload: {
        success: false,
        message:
          error?.name === "AbortError"
            ? "Tempo limite excedido ao consultar a API Social Jurídico."
            : "Não foi possível conectar à API Social Jurídico.",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function processApiErrorMessage(status, payload = {}) {
  if (status === 400) return payload.message || "Número do processo ou payload inválido.";
  if (status === 401) {
    return "Falha de configuração interna da API key da API Social Jurídico.";
  }
  if (status === 404) {
    return "Processo não encontrado no DataJud para o tribunal identificado.";
  }
  if (status === 504) return payload.message || "A consulta demorou demais para responder.";
  return payload.message || "Não foi possível processar a solicitação.";
}

export function serializeProcessListItem(row, clientMap = new Map()) {
  const client = clientMap.get(row.client_id);
  return {
    id: row.id,
    numeroCnj: row.numero_cnj,
    numeroFormatado: formatProcessNumber(row.numero_cnj),
    tribunalCodigo: row.tribunal_codigo,
    tribunalNome: row.tribunal_nome,
    classe: row.classe,
    orgaoJulgador: row.orgao_julgador,
    sistema: row.sistema,
    formato: row.formato,
    dataAjuizamento: row.data_ajuizamento,
    dataUltimaAtualizacao: row.data_ultima_atualizacao,
    resumoIa: row.resumo_ia,
    clientId: row.client_id,
    clientName: client?.name || row.cliente_nome_snapshot || "Cliente não identificado",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findLocalProcess(access, numeroProcesso) {
  const numeroCnj = normalizeProcessNumber(numeroProcesso);
  let query = access.db
    .from(PROCESS_TABLE)
    .select("*")
    .eq("numero_cnj", numeroCnj)
    .limit(1);
  query = scopeClientQuery(query, access.lawyerIds || [access.user.id]);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findDuplicateClient(access, crmPayload) {
  const cpfCnpj = normalizeClientDigits(crmPayload.cpfCnpj, 14);
  const email = normalizeProcessText(crmPayload.email, 254).toLowerCase();

  if (cpfCnpj) {
    const { data, error } = await access.db
      .from("crm_clients")
      .select("*")
      .eq("lawyer_id", access.user.id)
      .eq("cpf_cnpj", cpfCnpj)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  if (email) {
    const { data, error } = await access.db
      .from("crm_clients")
      .select("*")
      .eq("lawyer_id", access.user.id)
      .eq("email", email)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  return null;
}

export async function resolveProcessClient(access, request, payload) {
  if (payload.existingClientId) {
    const client = await getScopedClient(access, payload.existingClientId);
    if (!client) {
      const error = new Error("Cliente selecionado não encontrado no CRM.");
      error.status = 404;
      throw error;
    }
    return { client, created: false, source: "existing" };
  }

  const sourceParty = payload.clienteManual?.nome
    ? payload.clienteManual
    : payload.selectedDatajudParty;
  const crmPayload = partyToCrmPayload(sourceParty);

  if (!crmPayload.name || crmPayload.name.length < 2) {
    const error = new Error("Informe o nome do cliente antes de importar o processo.");
    error.status = 400;
    throw error;
  }

  const duplicate = await findDuplicateClient(access, crmPayload);
  if (duplicate) return { client: duplicate, created: false, source: "duplicate" };

  const now = new Date().toISOString();
  const clientId = crypto.randomUUID();
  const requestId = crypto.randomUUID();

  const { data, error } = await access.db
    .from("crm_clients")
    .insert([
      {
        id: clientId,
        request_id: requestId,
        lawyer_id: access.user.id,
        name: crmPayload.name,
        type: crmPayload.type,
        cpf_cnpj: normalizeClientDigits(crmPayload.cpfCnpj, 14) || null,
        email: crmPayload.email || null,
        phone: normalizeProcessText(crmPayload.phone, 30) || null,
        notes:
          crmPayload.notes ||
          "Cliente criado automaticamente a partir da importação de processo DataJud.",
        status: "Ativo",
        risk_score: crypto.randomInt(15, 86),
        created_at: now,
        updated_at: now,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;

  try {
    await recordClientAudit(access, request, {
      requestId,
      clientId,
      action: "CREATE_CLIENT",
      metadata: { numero_cnj: payload.numeroProcesso, source: "process_import" },
    });
  } catch (auditError) {
    console.warn("[resolveProcessClient][Audit] Falha ao registrar log de criação de cliente:", auditError);
  }

  return { client: data, created: true, source: "created" };
}

function pickProcessData(externalPayload = {}) {
  return externalPayload.data?.processo || externalPayload.data || externalPayload.processo || {};
}

function pickExternalRegistro(externalPayload = {}) {
  return externalPayload.data?.registro || externalPayload.registro || null;
}

function serializeMovimento(item = {}, index = 0) {
  const presentation = presentLawyerProcessMovement(item);
  const description = [presentation.title, presentation.detail].filter(Boolean).join(" — ");
  const parsedDate = presentation.date ? new Date(presentation.date) : null;
  const movementDate = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? parsedDate.toISOString()
    : null;

  return {
    id: crypto.randomUUID(),
    movement_date: movementDate,
    description: normalizeProcessText(description, 3000),
    movement_type: normalizeProcessText(presentation.code, 120) || null,
    sort_order: index + 1,
    raw_payload: item,
    created_at: new Date().toISOString(),
  };
}

function extractParties(processData = {}) {
  const parts = Array.isArray(processData.partes) ? processData.partes : [];
  if (parts.length) return parts;
  const fallback = [];
  if (processData.parte_principal) fallback.push(processData.parte_principal);
  if (Array.isArray(processData.demais_partes)) fallback.push(...processData.demais_partes);
  return fallback.filter(Boolean);
}

export async function saveLocalProcessFromExternal(access, request, payload, externalPayload) {
  const processData = pickProcessData(externalPayload);
  const numeroCnj = normalizeProcessNumber(processData.numero_cnj || payload.numeroProcesso);
  const existing = await findLocalProcess(access, numeroCnj);
  if (existing) {
    const error = new Error("Este processo já foi importado para o seu CRM.");
    error.status = 409;
    error.process = existing;
    throw error;
  }

  const { client, created: clientCreated, source: clientSource } = await resolveProcessClient(
    access,
    request,
    payload,
  );

  const capa = processData.capa || {};
  const tribunal = processData.tribunal || {};
  const registro = pickExternalRegistro(externalPayload);
  const now = new Date().toISOString();
  const processId = crypto.randomUUID();

  const processRow = {
    id: processId,
    request_id: payload.requestId,
    lawyer_id: access.user.id,
    client_id: client.id,
    numero_cnj: numeroCnj,
    tribunal_codigo: normalizeProcessText(tribunal.codigo, 40) || null,
    tribunal_nome: normalizeProcessText(tribunal.nome, 180) || null,
    tribunal_alias_datajud: normalizeProcessText(tribunal.alias_datajud, 80) || null,
    classe: normalizeProcessText(capa.classe, 180) || null,
    classe_codigo: capa.classe_codigo || null,
    area: normalizeProcessText(capa.area, 120) || null,
    grau: normalizeProcessText(capa.grau, 30) || null,
    sistema: normalizeProcessText(capa.sistema, 80) || null,
    formato: normalizeProcessText(capa.formato, 80) || null,
    orgao_julgador: normalizeProcessText(capa.orgao_julgador, 220) || null,
    orgao_julgador_codigo: capa.orgao_julgador_codigo || null,
    data_ajuizamento: capa.data_ajuizamento || null,
    data_ultima_atualizacao: capa.data_ultima_atualizacao || null,
    nivel_sigilo: capa.nivel_sigilo ?? null,
    assuntos: Array.isArray(capa.assuntos) ? capa.assuntos : [],
    resumo_ia: processData.resumo_ia || null,
    resumo_ia_gerado: Boolean(processData.resumo_ia_gerado),
    raw_payload: externalPayload,
    external_registro_id: registro?.id || null,
    cliente_nome_snapshot: client.name,
    parte_contraria_snapshot: payload.parteContrariaManual?.nome || null,
    created_at: now,
    updated_at: now,
  };

  const { data: savedProcess, error: processError } = await access.db
    .from(PROCESS_TABLE)
    .insert([processRow])
    .select("*")
    .single();

  if (processError) throw processError;

  const parties = extractParties(processData).map((item, index) => {
    const normalized = normalizePartyPayload(item);
    return {
      id: crypto.randomUUID(),
      process_id: processId,
      lawyer_id: access.user.id,
      client_id: client.id,
      name: normalized.nome || normalizeProcessText(item.nome || item.name, 180) || "Parte não identificada",
      party_type: normalized.tipo,
      document: normalized.documento || null,
      role: normalizeProcessText(item.polo || item.role || item.tipo_parte || item.tipoParte, 120) || null,
      is_client: false,
      is_opposing_party: false,
      source: "datajud",
      raw_payload: item,
      sort_order: index + 1,
      created_at: now,
    };
  });

  const selectedClientParty = payload.selectedDatajudParty?.nome
    ? normalizePartyPayload(payload.selectedDatajudParty)
    : payload.clienteManual?.nome
      ? normalizePartyPayload(payload.clienteManual)
      : null;
  if (selectedClientParty?.nome) {
    parties.push({
      id: crypto.randomUUID(),
      process_id: processId,
      lawyer_id: access.user.id,
      client_id: client.id,
      name: selectedClientParty.nome,
      party_type: selectedClientParty.tipo,
      document: selectedClientParty.documento || null,
      role: "Cliente",
      is_client: true,
      is_opposing_party: false,
      source: payload.clienteManual?.nome ? "manual" : "datajud_selected",
      raw_payload: selectedClientParty,
      sort_order: parties.length + 1,
      created_at: now,
    });
  }

  const opposing = payload.parteContrariaManual?.nome
    ? normalizePartyPayload(payload.parteContrariaManual)
    : null;
  if (opposing?.nome) {
    parties.push({
      id: crypto.randomUUID(),
      process_id: processId,
      lawyer_id: access.user.id,
      client_id: client.id,
      name: opposing.nome,
      party_type: opposing.tipo,
      document: opposing.documento || null,
      role: "Parte contrária",
      is_client: false,
      is_opposing_party: true,
      source: "manual",
      raw_payload: opposing,
      sort_order: parties.length + 1,
      created_at: now,
    });
  }

  if (parties.length) {
    const { error } = await access.db.from(PARTIES_TABLE).insert(parties);
    if (error) throw error;
  }

  const movements = (Array.isArray(processData.ultimas_movimentacoes)
    ? processData.ultimas_movimentacoes
    : []
  ).map((item, index) => ({
    ...serializeMovimento(item, index),
    process_id: processId,
    lawyer_id: access.user.id,
  }));

  if (movements.length) {
    const { error } = await access.db.from(MOVEMENTS_TABLE).insert(movements);
    if (error) throw error;
  }

  const warnings = (Array.isArray(processData.avisos) ? processData.avisos : []).map(
    (message) => ({
      id: crypto.randomUUID(),
      process_id: processId,
      lawyer_id: access.user.id,
      message: normalizeProcessText(message, 1000),
      created_at: now,
    }),
  );

  if (warnings.length) {
    const { error } = await access.db.from(WARNINGS_TABLE).insert(warnings);
    if (error) throw error;
  }

  await access.db.from("crm_interactions").insert([
    {
      id: crypto.randomUUID(),
      lawyer_id: access.user.id,
      client_id: client.id,
      content: `Processo ${formatProcessNumber(numeroCnj)} importado do DataJud e vinculado ao CRM.`,
      type: "auditoria",
      created_at: now,
    },
  ]);

  try {
    await recordClientAudit(access, request, {
      requestId: payload.requestId,
      clientId: client.id,
      action: "UPDATE_CLIENT",
      metadata: {
        process_id: processId,
        numero_cnj: numeroCnj,
        client_source: clientSource,
        client_created: clientCreated,
        action_detail: "IMPORT_PROCESS_DATAJUD",
      },
    });
  } catch (auditError) {
    console.warn("[saveLocalProcessFromExternal][Audit] Falha ao registrar log de importação de processo:", auditError);
  }

  return {
    process: savedProcess,
    client,
    clientCreated,
    clientSource,
  };
}

export async function getProcessFolder(access, processId) {
  const { data: process, error: processError } = await access.db
    .from(PROCESS_TABLE)
    .select("*")
    .eq("id", processId)
    .in("lawyer_id", access.lawyerIds)
    .maybeSingle();

  if (processError) throw processError;
  if (!process) return null;

  const [clientResult, partiesResult, movementsResult, warningsResult] = await Promise.all([
    access.db.from("crm_clients").select("*").eq("id", process.client_id).maybeSingle(),
    access.db
      .from(PARTIES_TABLE)
      .select("*")
      .eq("process_id", process.id)
      .order("sort_order", { ascending: true }),
    access.db
      .from(MOVEMENTS_TABLE)
      .select("*")
      .eq("process_id", process.id)
      .order("sort_order", { ascending: true }),
    access.db
      .from(WARNINGS_TABLE)
      .select("*")
      .eq("process_id", process.id)
      .order("created_at", { ascending: true }),
  ]);

  for (const result of [clientResult, partiesResult, movementsResult, warningsResult]) {
    if (result.error) throw result.error;
  }

  return {
    process: serializeProcessListItem(process, new Map([[process.client_id, clientResult.data]])),
    raw: process,
    client: clientResult.data,
    parties: partiesResult.data || [],
    movements: movementsResult.data || [],
    warnings: warningsResult.data || [],
  };
}

export { clientFailure, clientJson };
