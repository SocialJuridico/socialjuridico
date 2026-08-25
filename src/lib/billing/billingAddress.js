export const EMPTY_BILLING_ADDRESS = Object.freeze({
  zipCode: "",
  streetName: "",
  streetNumber: "",
  city: "",
  state: "",
});

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeBillingAddress(input = {}, fallbackState = "") {
  const zipCode = String(input?.zipCode || input?.zip_code || "")
    .replace(/\D/g, "")
    .slice(0, 8);
  const state = String(input?.state || fallbackState || "")
    .replace(/[^a-z]/gi, "")
    .toUpperCase()
    .slice(0, 2);

  return {
    zipCode,
    streetName: cleanText(input?.streetName || input?.street_name, 120),
    streetNumber: cleanText(input?.streetNumber || input?.street_number, 20),
    city: cleanText(input?.city, 80),
    state,
  };
}

export function billingAddressValidationError(input = {}, fallbackState = "") {
  const address = normalizeBillingAddress(input, fallbackState);

  if (address.zipCode.length !== 8) return "Informe um CEP válido com 8 dígitos.";
  if (address.streetName.length < 2) return "Informe a rua do endereço de cobrança.";
  if (!address.streetNumber) return "Informe o número do endereço de cobrança.";
  if (address.city.length < 2) return "Informe a cidade do endereço de cobrança.";
  if (address.state.length !== 2) return "Informe a UF do endereço de cobrança.";

  return null;
}

export function mercadoPagoPayerAddress(input = {}, fallbackState = "") {
  const address = normalizeBillingAddress(input, fallbackState);
  return {
    zip_code: address.zipCode,
    street_name: address.streetName,
    street_number: address.streetNumber,
    city: address.city,
    state: address.state,
  };
}

export function mercadoPagoOrderItem(product) {
  const price = (Number(product?.priceInCents || 0) / 100).toFixed(2);
  const planType = String(product?.planType || "").toUpperCase();
  const cycle = String(product?.billingCycle || "AVULSO").toUpperCase();
  const title = cleanText(product?.description || "Social Jurídico", 150);

  let externalCode = "SOCIAL_JURIDICO";
  if (product?.type === "JURIS_PURCHASE") {
    externalCode = `JURIS_${Number(product?.jurisAmount || 0)}`;
  } else if (product?.type === "AI_CREDITS_PURCHASE") {
    externalCode = `AI_${Number(product?.aiCreditsAmount || 0)}`;
  } else if (planType) {
    externalCode = `${planType}_${cycle}`;
  }

  return {
    external_code: externalCode.slice(0, 50),
    title,
    description: title,
    category_id: "services",
    quantity: 1,
    unit_price: price,
  };
}

export const MERCADO_PAGO_STATEMENT_DESCRIPTOR = "SOCJURIDICO";
