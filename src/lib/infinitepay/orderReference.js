// Referência de pedido (order_nsu) da InfinitePay.
//
// O gateway InfinitePay devolve, no webhook e no redirect, o mesmo `order_nsu`
// que enviamos ao gerar o link de pagamento. Para o site conseguir atribuir a
// venda ao advogado E saber EXATAMENTE qual produto foi comprado — sem depender
// do valor pago (que muda com cupom, desconto OAB/RS, promoção) — codificamos o
// produto dentro do próprio `order_nsu`.
//
// Formato: sj_<userId(uuid)>_<hexDoProduto>_<timestamp>
//   - userId: uuid do advogado (advogados.id)
//   - hexDoProduto: JSON do produto em hexadecimal (apenas [0-9a-f], não colide
//     com o separador "_")
//   - timestamp: Date.now() no momento da geração (garante unicidade/idempotência)
//
// Compatível com o formato legado sj_<userId>_<timestamp> (sem produto): nesse
// caso o webhook cai no reconhecimento por valor.

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/**
 * Monta o order_nsu com o produto embutido.
 * @param {string} userId uuid do advogado
 * @param {object} product { t, planType, billingCycle, jurisAmount, promo, expirationDays }
 */
export function encodeOrderReference(userId, product) {
  const safeUser = String(userId || "").trim();
  const hex = Buffer.from(JSON.stringify(product || {}), "utf8").toString("hex");
  return `sj_${safeUser}_${hex}_${Date.now()}`;
}

/**
 * Extrai userId e produto de um order_nsu.
 * @returns {{ userId: string|null, product: object|null }}
 */
export function decodeOrderReference(reference) {
  const ref = String(reference || "").trim();

  const full = ref.match(
    /^sj_([0-9a-f-]{36})_([0-9a-f]+)_(\d+)$/i,
  );

  if (full) {
    const userId = full[1];
    let product = null;
    try {
      const json = Buffer.from(full[2], "hex").toString("utf8");
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === "object" && parsed.t) {
        product = parsed;
      }
    } catch {
      product = null;
    }
    return { userId: UUID_RE.test(userId) ? userId : null, product };
  }

  // Legado sj_<userId>_<...> — só conseguimos o userId; produto virá por valor.
  const legacy = ref.match(UUID_RE);
  return { userId: legacy ? legacy[0] : null, product: null };
}
