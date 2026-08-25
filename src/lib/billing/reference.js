const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

export function encodeBillingReference(userId, product) {
  const safeUser = String(userId || "").trim();
  const payload = Buffer.from(JSON.stringify(product || {}), "utf8").toString("hex");
  return `sjmp_${safeUser}_${payload}_${Date.now()}`;
}

export function decodeBillingReference(reference) {
  const value = String(reference || "").trim();
  const match = value.match(/^sjmp_([0-9a-f-]{36})_([0-9a-f]+)_(\d+)$/i);

  if (!match) {
    return { userId: null, product: null };
  }

  const userId = UUID_RE.test(match[1]) ? match[1] : null;
  let product = null;

  try {
    const parsed = JSON.parse(Buffer.from(match[2], "hex").toString("utf8"));
    if (parsed && typeof parsed === "object" && parsed.t) product = parsed;
  } catch {
    product = null;
  }

  return { userId, product };
}
