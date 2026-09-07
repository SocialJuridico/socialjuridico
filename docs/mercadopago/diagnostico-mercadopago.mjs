#!/usr/bin/env node
// Diagnóstico read-only da conta Mercado Pago em produção.
// Não cria cobrança, não altera nada: apenas consulta.
//
// Uso:
//   MERCADOPAGO_ACCESS_TOKEN="APP_USR-..." node scripts/diagnostico-mercadopago.mjs
//   MERCADOPAGO_ACCESS_TOKEN="..." node scripts/diagnostico-mercadopago.mjs email-do-cliente@exemplo.com
//
// O e-mail é opcional e serve para localizar as assinaturas (/preapproval)
// daquele comprador específico.

const API = "https://api.mercadopago.com";
const token = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
const payerEmail = String(process.argv[2] || "").trim().toLowerCase();

if (!token) {
  console.error("Defina MERCADOPAGO_ACCESS_TOKEN com a credencial de PRODUÇÃO.");
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

function line() {
  console.log("─".repeat(72));
}

// O access token de produção carrega o id do collector no último segmento.
function collectorIdFromToken(value) {
  const parts = String(value).split("-");
  const last = parts[parts.length - 1];
  return /^\d+$/.test(last) ? last : null;
}

async function checkAccount() {
  line();
  console.log("1) CONTA / CREDENCIAL");
  const { ok, status, data } = await get("/users/me");
  if (!ok) {
    console.log(`   ✖ Falha ${status}:`, data?.message || data?.error || data);
    console.log("   → Token inválido, revogado ou de outra aplicação.");
    return null;
  }

  const prefix = token.slice(0, 8);
  console.log(`   Ambiente do token : ${prefix.startsWith("TEST-") ? "TESTE ⚠️" : "PRODUÇÃO"}`);
  console.log(`   Conta             : ${data.id} (${data.nickname || "-"})`);
  console.log(`   E-mail            : ${data.email || "-"}`);
  console.log(`   Site              : ${data.site_id || "-"}`);
  console.log(`   Tipo              : ${data.user_type || "-"}`);
  console.log(`   Status site       : ${JSON.stringify(data.status?.site_status || data.status || {})}`);

  const fromToken = collectorIdFromToken(token);
  if (fromToken && String(data.id) !== fromToken) {
    console.log(`   ⚠️  O id do token (${fromToken}) difere da conta (${data.id}).`);
  }
  console.log("   → Confira se a PUBLIC KEY do site é desta MESMA aplicação.");
  return data;
}

async function checkPayments() {
  line();
  console.log("2) ÚLTIMOS PAGAMENTOS (motivo real da recusa)");
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    sort: "date_created",
    criteria: "desc",
    range: "date_created",
    begin_date: since,
    end_date: new Date().toISOString(),
    limit: "30",
  });

  const { ok, status, data } = await get(`/v1/payments/search?${query}`);
  if (!ok) {
    console.log(`   ✖ Falha ${status}:`, data?.message || data);
    return;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  if (results.length === 0) {
    console.log("   Nenhum pagamento nos últimos 14 dias.");
    console.log("   → Se os clientes tentaram, isso indica que a recusa acontece");
    console.log("     ANTES de gerar pagamento (validação do cartão na assinatura).");
    return;
  }

  for (const p of results) {
    console.log(
      `   ${p.date_created?.slice(0, 16)}  ${String(p.status).padEnd(10)} ` +
        `${String(p.status_detail || "-").padEnd(28)} ` +
        `${p.payment_method_id || "-"}/${p.payment_type_id || "-"}  ` +
        `R$ ${p.transaction_amount}  ref=${p.external_reference || "-"}`,
    );
  }

  const rejected = results.filter((p) => p.status === "rejected");
  if (rejected.length) {
    const reasons = [...new Set(rejected.map((p) => p.status_detail))];
    console.log(`\n   ⚠️  ${rejected.length} recusado(s). Motivos: ${reasons.join(", ")}`);
    console.log("   → ESTE status_detail é a causa raiz, não o CC_VAL_433.");
  }
}

async function checkSubscriptions() {
  line();
  console.log("3) ASSINATURAS (/preapproval)");
  const query = new URLSearchParams({ limit: "20", sort: "date_created:desc" });
  if (payerEmail) query.set("payer_email", payerEmail);

  const { ok, status, data } = await get(`/preapproval/search?${query}`);
  if (!ok) {
    console.log(`   ✖ Falha ${status}:`, data?.message || data);
    if (status === 401 || status === 403) {
      console.log("   → A aplicação pode NÃO estar habilitada para Assinaturas.");
      console.log("     Essa é uma causa direta de CC_VAL_433 no /preapproval.");
    }
    return;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  if (results.length === 0) {
    console.log("   Nenhuma assinatura encontrada.");
    console.log("   → Confirma que as tentativas morreram na validação do cartão,");
    console.log("     sem nunca criar a assinatura.");
    return;
  }

  for (const s of results) {
    console.log(
      `   ${s.date_created?.slice(0, 16)}  ${String(s.status).padEnd(12)} ` +
        `R$ ${s.auto_recurring?.transaction_amount}  ` +
        `${s.payer_email || "-"}  ref=${s.external_reference || "-"}`,
    );
  }
}

async function checkPaymentMethods() {
  line();
  console.log("4) MEIOS DE PAGAMENTO HABILITADOS NA CONTA");
  const { ok, status, data } = await get("/v1/payment_methods");
  if (!ok) {
    console.log(`   ✖ Falha ${status}:`, data?.message || data);
    return;
  }

  const methods = Array.isArray(data) ? data : [];
  const cards = methods.filter((m) => m.payment_type_id === "credit_card");
  const active = cards.filter((m) => m.status === "active");

  console.log(`   Cartões de crédito: ${active.length}/${cards.length} ativos`);
  const inactive = cards.filter((m) => m.status !== "active");
  if (inactive.length) {
    console.log(
      `   ⚠️  Inativos: ${inactive.map((m) => `${m.id}(${m.status})`).join(", ")}`,
    );
  }
  const pix = methods.find((m) => m.id === "pix");
  console.log(`   Pix: ${pix ? pix.status : "não disponível"}`);
}

(async () => {
  console.log("\nDIAGNÓSTICO MERCADO PAGO — Social Jurídico (somente leitura)\n");
  const account = await checkAccount();
  if (account) {
    await checkPaymentMethods();
    await checkPayments();
    await checkSubscriptions();
  }
  line();
  console.log("Fim. Nenhuma cobrança foi criada ou alterada.\n");
})();
