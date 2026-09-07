import Stripe from "stripe";

let client;
let clientKey;
export function stripePublicKey(liveMode) {
  // Read at runtime: do not return a NEXT_PUBLIC value frozen into an old build.
  const name = "NEXT_PUBLIC_STRIPE_PUBLIC_KEY";
  const publicKey = process.env[name]?.trim();
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publicMode = /^pk_(live|test)_/.exec(publicKey || "")?.[1];
  const secretMode = /^(?:sk|rk)_(live|test)_/.exec(secretKey || "")?.[1];
  if (!publicMode || !secretMode || publicMode !== secretMode ||
      (typeof liveMode === "boolean" && (publicMode === "live") !== liveMode)) {
    throw Object.assign(new Error("O pagamento por cartão está temporariamente indisponível. A configuração da Stripe precisa ser corrigida."),
      {status:503,code:"STRIPE_CONFIGURATION"});
  }
  return publicKey;
}
export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe não configurada.");
  if (!client || clientKey !== key) {
    client = new Stripe(key, { apiVersion: "2026-02-25.clover", maxNetworkRetries: 2 });
    clientKey = key;
  }
  return client;
}
