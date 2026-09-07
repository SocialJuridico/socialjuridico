// Centraliza a escolha entre credenciais de TESTE (sandbox) e PRODUCAO do
// Mercado Pago. Regra: quando MERCADOPAGO_SANDBOX for verdadeiro E existir a
// credencial _TEST_ correspondente, usamos a de teste; caso contrario caimos
// para a de producao. Assim as credenciais de producao nunca sao apagadas e a
// alternancia acontece apenas com a flag MERCADOPAGO_SANDBOX.

function truthy(value) {
  return ["1", "true", "yes"].includes(
    String(value || "").trim().toLowerCase(),
  );
}

// Servidor: true quando o sandbox esta explicitamente ligado no ambiente.
export function isMercadoPagoSandbox() {
  return truthy(process.env.MERCADOPAGO_SANDBOX);
}

// Access token para chamadas server-to-server (client.js).
export function mercadoPagoAccessToken() {
  const test = String(process.env.MERCADOPAGO_TEST_ACCESS_TOKEN || "").trim();
  const prod = String(process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim();
  if (isMercadoPagoSandbox() && test) return test;
  return prod;
}

// Public key usada pelo SDK no browser (Bricks). Reutilizada pela rota de
// configuracao e pelo fallback do modal avulso.
export function mercadoPagoPublicKey() {
  const test = String(
    process.env.NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY || "",
  ).trim();
  const prod = String(
    process.env.MERCADOPAGO_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
      "",
  ).trim();
  if (isMercadoPagoSandbox() && test) return test;
  return prod;
}

let cachedSandboxBuyerEmail = null;

// Em modo sandbox, o Mercado Pago exige que o payer_email seja um usuario de teste
// valido criado na API (/users/test_user) vinculado a credencial. E-mails ficticios
// provocam HTTP 400 (User bad request) ou CC_VAL_433 ao criar assinaturas (/preapproval).
export async function getSandboxTestBuyerEmail() {
  if (cachedSandboxBuyerEmail) return cachedSandboxBuyerEmail;
  const token = mercadoPagoAccessToken();
  if (!token) return null;

  try {
    const res = await fetch("https://api.mercadopago.com/users/test_user", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ site_id: "MLB" }),
    });
    const data = await res.json();
    if (data?.email) {
      cachedSandboxBuyerEmail = data.email;
      return cachedSandboxBuyerEmail;
    }
  } catch (err) {
    console.error("[MercadoPago] Erro ao obter comprador de teste sandbox:", err);
  }
  return null;
}

