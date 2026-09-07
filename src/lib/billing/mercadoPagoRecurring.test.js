import {
  buildRecurringSubscriptionPayload,
  recurringCheckoutDiagnostics,
  recurringProviderFailure,
  sanitizeRecurringProviderError,
  validateRecurringPaymentData,
} from "./mercadoPagoRecurring";

const product = (billingCycle, priceInCents) => ({
  planType: "START", billingCycle, priceInCents,
  renewalPriceInCents: 4099, description: "Plano START",
});
const payer = { email: "buyer@example.com" };
const paymentData = { token: "opaque-test-token", payment_type_id: "credit_card", payer };
const args = (p) => ({ product: p, reference: "reference-1", payerEmail: payer.email, cardToken: paymentData.token, siteUrl: "https://socialjuridico.com.br" });

describe("Mercado Pago recurring checkout", () => {
  test.each([
    ["MONTHLY", 1099, 1, 10.99],
    ["MONTHLY", 4099, 1, 40.99],
    ["ANNUAL", 43188, 12, 431.88],
    ["MONTHLY", 3999, 1, 39.99],
    ["MONTHLY", 15000, 1, 150],
    ["ANNUAL", 144000, 12, 1440],
  ])("%s %i cents builds a numeric charge", (cycle, cents, frequency, amount) => {
    const payload = buildRecurringSubscriptionPayload(args(product(cycle, cents)));
    expect(payload.auto_recurring).toEqual({ frequency, frequency_type: "months", transaction_amount: amount, currency_id: "BRL" });
    expect(typeof payload.auto_recurring.transaction_amount).toBe("number");
    expect(payload.status).toBe("authorized");
    expect(payload.card_token_id).toBe(paymentData.token);
    expect(payload).not.toHaveProperty("preapproval_plan_id");
    expect(payload).not.toHaveProperty("payer.identification");
  });

  test("rejects invalid cycles and amounts", () => {
    expect(() => buildRecurringSubscriptionPayload(args(product("AVULSO", 4099)))).toThrow();
    expect(() => buildRecurringSubscriptionPayload(args(product("MONTHLY", 0)))).toThrow();
    expect(() => buildRecurringSubscriptionPayload(args(product("MONTHLY", NaN)))).toThrow();
  });

  test("handles mismatched payer emails and optional tokens for Checkout Pro", () => {
    expect(validateRecurringPaymentData({ payer }, payer.email)).toEqual({ email: payer.email, token: null });
    expect(() => validateRecurringPaymentData({ ...paymentData, payer: { email: "other@example.com" } }, payer.email)).toThrow();
    expect(validateRecurringPaymentData(paymentData, "BUYER@example.com")).toEqual({ email: payer.email, token: paymentData.token });
  });

  test("diagnostics never serialize token, CPF, CVV or arbitrary provider details", () => {
    const secret = "SENSITIVE_SECRET_DO_NOT_LOG";
    const data = { ...paymentData, token: secret, payer: { ...payer, identification: { type: "CPF", number: secret } }, cvv: secret };
    const diagnostic = recurringCheckoutDiagnostics({ product: product("MONTHLY", 4099), paymentData: data, payerEmail: payer.email });
    expect(diagnostic.tokenPresent).toBe(true);
    expect(diagnostic.identificationPresent).toBe(true);
    expect(JSON.stringify(diagnostic)).not.toContain(secret);
    const providerData = { code: "rejected", message: "CC_VAL_433 Credit card validation has failed", cause: [{ code: "CC_VAL_433", description: secret, card_token_id: secret, identification: secret }] };
    const safe = sanitizeRecurringProviderError({ providerStatus: 400, providerRequestId: "request-1", providerData });
    expect(safe).toEqual({ providerStatus: 400, requestId: "request-1", code: "rejected", messageCode: "CC_VAL_433", causeCodes: ["CC_VAL_433"] });
    expect(JSON.stringify(safe)).not.toContain(secret);
    const failure = recurringProviderFailure({ status: 422, providerStatus: 400, providerRequestId: "request-1", providerData });
    expect(failure.status).toBe(422);
    expect(failure.message).toContain("validar");
    expect(JSON.stringify({ ...failure, message: failure.message })).not.toContain(secret);
  });

  test("extracts the leading rejection code when cause[].code is empty", () => {
    const leakyMessage = "CC_VAL_433 Credit card validation has failed 4111111111111111";
    const providerData = { code: "rejected", message: leakyMessage, cause: [] };
    const safe = sanitizeRecurringProviderError({ providerStatus: 400, providerRequestId: "request-2", providerData });
    expect(safe).toEqual({ providerStatus: 400, requestId: "request-2", code: "rejected", messageCode: "CC_VAL_433", causeCodes: [] });
    // Only the machine code is surfaced; the free-form remainder never leaks.
    expect(JSON.stringify(safe)).not.toContain("4111111111111111");
    const failure = recurringProviderFailure({ status: 422, providerStatus: 400, providerRequestId: "request-2", providerData });
    expect(failure.status).toBe(422);
    expect(failure.message).toContain("validar");
    expect(failure.providerMessageCode).toBe("CC_VAL_433");
    expect(JSON.stringify({ ...failure, message: failure.message })).not.toContain("4111111111111111");
  });

  test("does not flag a card validation message for unrelated provider errors", () => {
    const providerData = { code: "internal_error", message: "Something went wrong", cause: [] };
    const failure = recurringProviderFailure({ status: 502, providerStatus: 500, providerRequestId: "request-3", providerData });
    expect(failure.message).toContain("confirmar a criação");
    expect(failure.providerMessageCode).toBeNull();
  });

  test("mercadoPagoOrderItem and mercadoPagoPreferenceItem return numeric unit_price", () => {
    const { mercadoPagoOrderItem, mercadoPagoPreferenceItem } = require("./billingAddress");
    const testProduct = { priceInCents: 12750, description: "Plano PRO Mensal", planType: "PRO", billingCycle: "MONTHLY" };
    const orderItem = mercadoPagoOrderItem(testProduct);
    const prefItem = mercadoPagoPreferenceItem(testProduct);

    expect(typeof orderItem.unit_price).toBe("number");
    expect(orderItem.unit_price).toBe(127.5);
    expect(typeof prefItem.unit_price).toBe("number");
    expect(prefItem.unit_price).toBe(127.5);
  });
});
