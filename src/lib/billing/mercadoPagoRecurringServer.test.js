jest.mock("@/lib/mercadopago/client", () => ({
  createMercadoPagoSubscription: jest.fn(),
  searchMercadoPagoPaymentsByReference: jest.fn(),
  searchMercadoPagoSubscriptionsByEmail: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({ supabaseAdmin: { from: jest.fn() } }));

import { assertNoUnresolvedRecurringAttempt } from "./mercadoPagoRecurringServer";
import { supabaseAdmin } from "@/lib/supabase";
import { searchMercadoPagoPaymentsByReference, searchMercadoPagoSubscriptionsByEmail } from "@/lib/mercadopago/client";

const reference = "sjm_00000000000000000000000000000001_PMO";
const result = (statuses) => ({
  results: statuses.map((status) => ({ status, external_reference: reference })),
  paging: { total: statuses.length },
});
let update;
let write;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  write = { data: [{ id: "tx-1" }], error: null };
  update = jest.fn(() => {
    const query = {
      eq: jest.fn(() => query), in: jest.fn(() => query),
      select: jest.fn(async () => write),
    };
    return query;
  });
  supabaseAdmin.from.mockImplementation(() => {
    const query = {
      select: jest.fn(() => query), eq: jest.fn(() => query),
      in: jest.fn(async () => ({ data: [{ id: "tx-1", stripe_session_id: reference }], error: null })),
      update,
    };
    return query;
  });
  searchMercadoPagoSubscriptionsByEmail.mockResolvedValue(result(["cancelled"]));
  searchMercadoPagoPaymentsByReference.mockResolvedValue(result(["rejected"]));
});
afterEach(() => jest.restoreAllMocks());

const check = () => assertNoUnresolvedRecurringAttempt("owner-1", "buyer@example.com");
const blocked = async () => expect(check()).rejects.toMatchObject({ status: 409, checkoutReference: reference });

test("a provider outage keeps the attempt unresolved without logging its payload", async () => {
  searchMercadoPagoSubscriptionsByEmail.mockRejectedValue(new Error("private-provider-data"));
  await blocked();
  expect(update).not.toHaveBeenCalled();
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain("private-provider-data");
});

test.each([[[]], [["pending"]], [["authorized"]], [["cancelled", "authorized"]]])(
  "does not release absent or still active subscriptions: %j", async (statuses) => {
    searchMercadoPagoSubscriptionsByEmail.mockResolvedValue(result(statuses));
    await blocked();
    expect(update).not.toHaveBeenCalled();
  },
);

test.each(["approved", "pending", "in_process"])("a %s payment prevents releasing a cancelled subscription", async (status) => {
  searchMercadoPagoPaymentsByReference.mockResolvedValue(result(["rejected", status]));
  await blocked();
  expect(update).not.toHaveBeenCalled();
});

test("a partial subscription search does not authorize a new attempt", async () => {
  searchMercadoPagoSubscriptionsByEmail.mockResolvedValue({ ...result(["cancelled"]), paging: { total: 21 } });
  await blocked();
  expect(update).not.toHaveBeenCalled();
});

test("a partial payment search does not authorize a new attempt", async () => {
  searchMercadoPagoPaymentsByReference.mockResolvedValue({ ...result(["rejected"]), paging: { total: 21 } });
  await blocked();
  expect(update).not.toHaveBeenCalled();
});

test("confirmed terminal records release the attempt only after a successful database update", async () => {
  await expect(check()).resolves.toBeUndefined();
  expect(update).toHaveBeenCalledWith({ status: "subscription_rejected" });
});

test.each([{ data: null, error: { message: "database failure" } }, { data: [], error: null }])(
  "failed or concurrent database updates do not release the attempt", async (response) => {
    write = response;
    await blocked();
  },
);
