jest.mock("@/lib/supabase",()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()}}));
jest.mock("@/lib/billing/stripeClient",()=>({stripeClient:jest.fn(),stripePublicKey:jest.fn()}));
jest.mock("./mercadoPagoRecurringServer",()=>({assertNoUnresolvedRecurringAttempt:jest.fn()}));
jest.mock("@/lib/lawyerPlans/planAccessServer",()=>({assertLawyerPlanPurchaseAllowed:jest.fn()}));
jest.mock("./planHistoryServer",()=>({hasLawyerPlanHistory:jest.fn(async()=>false)}));
jest.mock("@/lib/mercadopago/client",()=>({createMercadoPagoOrder:jest.fn(),getMercadoPagoOrder:jest.fn(),getMercadoPagoSubscription:jest.fn(),updateMercadoPagoSubscription:jest.fn()}));
jest.mock("@/lib/coupons/couponServer",()=>({COUPON_TYPES:{},consumeCouponUsage:jest.fn()}));
import {supabaseAdmin as db} from "@/lib/supabase";
import {stripeClient} from "./stripeClient";
import {fulfillHybridPix,fulfillHybridInvoice,handleStripeBillingEvent,createHybridCheckout} from "./hybridCheckoutServer";
import {assertNoUnresolvedRecurringAttempt} from "./mercadoPagoRecurringServer";
import {getMercadoPagoSubscription,updateMercadoPagoSubscription} from "@/lib/mercadopago/client";
const id="00000000-0000-0000-0000-000000000001";
let row;let stripe;
beforeEach(()=>{
  jest.clearAllMocks();
  row={id,method:"pix",provider_id:"ORD_fixture",product:{priceInCents:990}};
  db.from.mockImplementation(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:row})};return q;});
  db.rpc.mockResolvedValue({data:{approved:true},error:null});
  stripe={invoices:{retrieve:jest.fn()},subscriptions:{retrieve:jest.fn()}};
  stripeClient.mockReturnValue(stripe);
});
const pix=()=>({id:"ORD_fixture",external_reference:`sjh_${id}`,status:"processed",status_detail:"accredited",total_amount:"9.90",
  transactions:{payments:[{amount:"9.90",payment_method:{id:"pix"}}]}});

test("new plan checkout reconciles legacy attempts before creating any provider session",async()=>{
  const insert=jest.fn();
  db.from.mockImplementation(()=>{
    const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null}),single:async()=>({data:{email:"fixture@example.invalid"}}),insert};
    return q;
  });
  assertNoUnresolvedRecurringAttempt.mockRejectedValueOnce(Object.assign(new Error("pending"),{code:"LEGACY_PENDING",status:409}));
  await expect(createHybridCheckout({id:"owner"},{requestId:id,method:"card",planType:"PRO",billingCycle:"MONTHLY"}))
    .rejects.toMatchObject({code:"LEGACY_PENDING"});
  expect(assertNoUnresolvedRecurringAttempt).toHaveBeenCalledWith("owner","fixture@example.invalid");
  expect(insert).not.toHaveBeenCalled();
  expect(stripeClient).not.toHaveBeenCalled();
});
test("pending Pix never grants benefits",async()=>{
  expect(await fulfillHybridPix({...pix(),status:"processing"})).toEqual({approved:false});
  expect(db.rpc).not.toHaveBeenCalled();
});
test.each(["amount","method","order"])("rejects a Pix %s mismatch",async(kind)=>{
  const order=pix();
  if(kind==="amount")order.transactions.payments[0].amount="1.00";
  if(kind==="method")order.transactions.payments[0].payment_method.id="visa";
  if(kind==="order")order.id="ORD_other";
  await expect(fulfillHybridPix(order)).rejects.toThrow();expect(db.rpc).not.toHaveBeenCalled();
});
test("approved Pix uses the atomic receipt function",async()=>{
  await expect(fulfillHybridPix(pix())).resolves.toEqual({approved:true});
  expect(db.rpc).toHaveBeenCalledWith("fulfill_hybrid_checkout",expect.objectContaining({p_provider_key:"mp_order_ORD_fixture",p_amount_cents:990}));
});

test("a previously canceled legacy subscription does not block delivery of the new purchase",async()=>{
  row.previous_subscription_id="mp_previous";
  getMercadoPagoSubscription.mockResolvedValue({id:"previous",status:"cancelled"});
  await expect(fulfillHybridPix(pix())).resolves.toEqual({approved:true});
  expect(updateMercadoPagoSubscription).not.toHaveBeenCalled();
});
test("a paid Stripe invoice is retrieved and checked before delivery",async()=>{
  row={id,method:"card",product:{recurring:true,priceInCents:3999,renewalPriceInCents:15000}};
  stripe.invoices.retrieve.mockResolvedValue({id:"in_fixture",status:"paid",currency:"brl",billing_reason:"subscription_cycle",amount_paid:15000,total:15000,livemode:false,
    parent:{subscription_details:{subscription:"sub_fixture"}},lines:{data:[{period:{end:1800000000}}]}});
  stripe.subscriptions.retrieve.mockResolvedValue({id:"sub_fixture",livemode:false,metadata:{checkout_id:id}});
  await fulfillHybridInvoice("in_fixture");
  expect(db.rpc).toHaveBeenCalledWith("fulfill_hybrid_checkout",expect.objectContaining({p_first_charge:false,p_amount_cents:15000,p_subscription_id:"sub_fixture"}));
  stripe.invoices.retrieve.mockResolvedValue({...await stripe.invoices.retrieve(),amount_paid:6990});
  db.rpc.mockClear();await expect(fulfillHybridInvoice("in_fixture")).rejects.toThrow("AMOUNT_MISMATCH");expect(db.rpc).not.toHaveBeenCalled();
});
test("subscription updates never activate benefits without a paid invoice",async()=>{
  stripe.subscriptions.retrieve.mockResolvedValue({id:"sub_fixture",status:"active",metadata:{checkout_id:id}});
  await handleStripeBillingEvent({type:"customer.subscription.updated",data:{object:{id:"sub_fixture"}}});
  expect(db.rpc).not.toHaveBeenCalled();expect(db.from).not.toHaveBeenCalled();
});
