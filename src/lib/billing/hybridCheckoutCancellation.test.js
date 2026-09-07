jest.mock("@/lib/supabase",()=>({supabaseAdmin:{from:jest.fn()}}));
jest.mock("./stripeClient",()=>({stripeClient:jest.fn(),stripePublicKey:jest.fn()}));
jest.mock("./mercadoPagoRecurringServer",()=>({assertNoUnresolvedRecurringAttempt:jest.fn()}));
jest.mock("@/lib/lawyerPlans/planAccessServer",()=>({assertLawyerPlanPurchaseAllowed:jest.fn()}));
jest.mock("./planHistoryServer",()=>({hasLawyerPlanHistory:jest.fn(async()=>false)}));
jest.mock("@/lib/coupons/couponServer",()=>({COUPON_TYPES:{},releaseCouponReservation:jest.fn()}));
jest.mock("@/lib/mercadopago/client",()=>({getMercadoPagoOrder:jest.fn(),cancelMercadoPagoOrder:jest.fn(),createMercadoPagoOrder:jest.fn()}));
import {supabaseAdmin as db} from "@/lib/supabase";
import {stripeClient} from "./stripeClient";
import {getMercadoPagoOrder,cancelMercadoPagoOrder,createMercadoPagoOrder} from "@/lib/mercadopago/client";
import {cancelHybridCheckout,createHybridCheckout} from "./hybridCheckoutServer";
const id="00000000-0000-0000-0000-000000000001";
const nextId="00000000-0000-0000-0000-000000000002";
let row, stripe, update;
const session = (status="open")=>({id:"cs_fixture",client_reference_id:`sjh_${id}`,status,payment_status:"unpaid"});
beforeEach(()=>{
  jest.clearAllMocks();
  row={id,advogado_id:"owner",provider_id:"cs_fixture",method:"card",status:"pending",product:{type:"PRO_SUBSCRIPTION",planType:"PRO",billingCycle:"MONTHLY",priceInCents:15000}};
  update=jest.fn(()=>({eq:jest.fn(async()=>({error:null}))}));
  db.from.mockReturnValue({update});
  stripe={checkout:{sessions:{retrieve:jest.fn(),expire:jest.fn()}},paymentIntents:{retrieve:jest.fn()}};
  stripeClient.mockReturnValue(stripe);
});
test("an unpaid card session is expired before the local blocker is released",async()=>{
  stripe.checkout.sessions.retrieve.mockResolvedValueOnce(session()).mockResolvedValueOnce(session("expired"));
  await expect(cancelHybridCheckout(row)).resolves.toMatchObject({status:"cancelled"});
  expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith("cs_fixture",{},expect.any(Object));
  expect(update).toHaveBeenCalledWith({status:"cancelled"});
});
test.each(["complete","processing"])("a %s payment cannot be replaced",async status=>{
  stripe.checkout.sessions.retrieve.mockResolvedValue({...session(status==="complete"?"complete":"open"),payment_intent:"pi_fixture"});
  stripe.paymentIntents.retrieve.mockResolvedValue({status:"processing"});
  await expect(cancelHybridCheckout(row)).rejects.toMatchObject({code:"CHECKOUT_PROCESSING"});
  expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});
test("a timeout without confirmed expiration preserves the blocker",async()=>{
  stripe.checkout.sessions.retrieve.mockResolvedValue(session());
  stripe.checkout.sessions.expire.mockRejectedValueOnce(new Error("timeout"));
  await expect(cancelHybridCheckout(row)).rejects.toMatchObject({code:"CHECKOUT_PROCESSING"});
  expect(update).not.toHaveBeenCalled();
});
test("Pix is canceled at the provider before releasing the local attempt",async()=>{
  row.method="pix";row.provider_id="ORD_fixture";
  const order={id:row.provider_id,external_reference:`sjh_${id}`,status:"action_required"};
  getMercadoPagoOrder.mockResolvedValueOnce(order).mockResolvedValueOnce({...order,status:"canceled"});
  await cancelHybridCheckout(row);
  expect(cancelMercadoPagoOrder).toHaveBeenCalledWith("ORD_fixture",`${id}:cancel`);
  expect(update).toHaveBeenCalledWith({status:"cancelled"});
});
test("a Pix being processed cannot be canceled for a replacement",async()=>{
  row.method="pix";row.provider_id="ORD_fixture";
  getMercadoPagoOrder.mockResolvedValue({id:row.provider_id,external_reference:`sjh_${id}`,status:"processing"});
  await expect(cancelHybridCheckout(row)).rejects.toMatchObject({code:"CHECKOUT_PROCESSING"});
  expect(cancelMercadoPagoOrder).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
});
test("a mismatched provider reference cannot be canceled",async()=>{
  stripe.checkout.sessions.retrieve.mockResolvedValue({...session(),client_reference_id:"someone_else"});
  await expect(cancelHybridCheckout(row)).rejects.toThrow("SESSION_MISMATCH");
  expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
});

function checkoutDatabase() {
  let inserted;
  db.from.mockImplementation(table=>{
    let operation,patch,selectedId;
    const q={
      select:()=>q, in:()=>q,
      eq:(key,value)=>{if(key==="id")selectedId=value;return q;},
      maybeSingle:async()=>({data:selectedId===id?row:inserted||null}),
      insert:value=>{operation="insert";patch=value;return q;},
      update:value=>{operation="update";patch=value;return q;},
      single:async()=>{
        if(table==="advogados")return {data:{email:"fixture@example.invalid"}};
        if(operation==="insert"&&row.status==="pending")return {error:{code:"23505"}};
        inserted={...patch,created_at:new Date().toISOString()};return {data:inserted};
      },
      limit:async()=>({data:[row]}),
      then:resolve=>{if(operation==="update"){if(selectedId===id)Object.assign(row,patch);else Object.assign(inserted,patch);}return Promise.resolve({error:null}).then(resolve);},
    };return q;
  });
  createMercadoPagoOrder.mockResolvedValue({id:"ORD_new"});
  getMercadoPagoOrder.mockResolvedValue({id:"ORD_new",external_reference:`sjh_${nextId}`,status:"action_required"});
}
const request={requestId:nextId,method:"pix",planType:"START",billingCycle:"AVULSO"};
test("an already-expired plan session is reconciled automatically and the new Pix opens",async()=>{
  checkoutDatabase();stripe.checkout.sessions.retrieve.mockResolvedValue(session("expired"));
  await expect(createHybridCheckout({id:"owner"},request)).resolves.toMatchObject({method:"pix",checkoutId:nextId});
  expect(row.status).toBe("expired");
  expect(createMercadoPagoOrder).toHaveBeenCalledTimes(1);
});
test("a different open plan returns an actionable replacement without creating a second charge",async()=>{
  checkoutDatabase();stripe.checkout.sessions.retrieve.mockResolvedValue(session());
  await expect(createHybridCheckout({id:"owner"},request)).rejects.toMatchObject({code:"CHECKOUT_OPEN",previousCheckout:{id,method:"card",planType:"PRO"}});
  expect(createMercadoPagoOrder).not.toHaveBeenCalled();
  expect(stripe.checkout.sessions.expire).not.toHaveBeenCalled();
});
test("explicit replacement expires the old plan and opens the selected Pix",async()=>{
  checkoutDatabase();stripe.checkout.sessions.retrieve.mockResolvedValueOnce(session()).mockResolvedValueOnce(session("expired"));
  await expect(createHybridCheckout({id:"owner"},{...request,replaceCheckoutId:id})).resolves.toMatchObject({method:"pix",checkoutId:nextId});
  expect(row.status).toBe("cancelled");
  expect(createMercadoPagoOrder).toHaveBeenCalledTimes(1);
});
