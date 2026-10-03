jest.mock("@/lib/supabase",()=>({supabaseAdmin:{from:jest.fn(),rpc:jest.fn()}}));
jest.mock("@/lib/billing/stripeClient",()=>({stripeClient:jest.fn(),stripePublicKey:jest.fn()}));
jest.mock("./mercadoPagoRecurringServer",()=>({assertNoUnresolvedRecurringAttempt:jest.fn()}));
jest.mock("@/lib/lawyerPlans/planAccessServer",()=>({assertLawyerPlanPurchaseAllowed:jest.fn()}));
jest.mock("./planHistoryServer",()=>({hasLawyerPlanHistory:jest.fn(async()=>false)}));
jest.mock("@/lib/mercadopago/client",()=>({createMercadoPagoOrder:jest.fn(),getMercadoPagoOrder:jest.fn(),cancelMercadoPagoOrder:jest.fn(),getMercadoPagoSubscription:jest.fn(),updateMercadoPagoSubscription:jest.fn()}));
jest.mock("@/lib/coupons/couponServer",()=>({COUPON_TYPES:{},consumeCouponUsage:jest.fn()}));
import {supabaseAdmin as db} from "@/lib/supabase";
import {createMercadoPagoOrder,getMercadoPagoOrder} from "@/lib/mercadopago/client";
import {parsePromoInvestCents,buildPromoInvestProduct,hasActiveLawyerPlan,PROMO_INVEST_MAX_CENTS} from "./promoInvest";
import {promoInvestBlockReason,createPromoInvestCheckout,promoInvestEnabled} from "./promoInvestServer";
import {fulfillHybridPix} from "./hybridCheckoutServer";

const id="00000000-0000-0000-0000-000000000002";

test("parses free amounts in BRL within the promo limits",()=>{
  expect(parsePromoInvestCents("25,50")).toBe(2550);
  expect(parsePromoInvestCents("25.50")).toBe(2550);
  expect(parsePromoInvestCents(10)).toBe(1000);
  expect(parsePromoInvestCents("0,01")).toBe(1);
  expect(parsePromoInvestCents("0,50")).toBe(50);
  expect(parsePromoInvestCents("10.000.000.000,00")).toBe(1_000_000_000_000);
  expect(parsePromoInvestCents("0")).toBeNull();
  expect(parsePromoInvestCents("-5")).toBeNull();
  expect(parsePromoInvestCents("abc")).toBeNull();
  expect(parsePromoInvestCents(PROMO_INVEST_MAX_CENTS/100+1)).toBeNull();
});

test("promo product is a one-time 30-day PRO with the plan Juris",()=>{
  expect(buildPromoInvestProduct(1234,1)).toMatchObject({type:"PROMO_INVEST",planType:"PRO",jurisAmount:20,
    expirationDays:30,recurring:false,priceInCents:1234,purchaseNumber:1});
});

test("only two paid purchases and no active recurring subscription",()=>{
  expect(promoInvestBlockReason({},0)).toBeNull();
  expect(promoInvestBlockReason({},1)).toBeNull();
  expect(promoInvestBlockReason({},2)).toMatch(/2 meses/);
  expect(promoInvestBlockReason({stripe_subscription_id:"sub_1",plan_billing_cycle:"MONTHLY",subscription_status:"ACTIVE"},0)).toMatch(/recorrente/);
  expect(promoInvestBlockReason({stripe_subscription_id:"sub_1",plan_billing_cycle:"MONTHLY",subscription_status:"CANCELED"},0)).toBeNull();
  expect(promoInvestBlockReason({oab_verification_status:"ERROR"},0)).toMatch(/OAB/);
});

test("promo is only for lawyers without an active plan",()=>{
  const future=new Date(Date.now()+86400000).toISOString();
  const past=new Date(Date.now()-86400000).toISOString();
  expect(hasActiveLawyerPlan({plan_type:"FREE"})).toBe(false);
  expect(hasActiveLawyerPlan({plan_type:"PRO",is_premium:true,premium_expires_at:future})).toBe(true);
  expect(hasActiveLawyerPlan({plan_type:"PRO",is_premium:true,premium_expires_at:past})).toBe(false);
  expect(hasActiveLawyerPlan({plan_type:"ENTERPRISE_10"})).toBe(true);
  expect(promoInvestBlockReason({plan_type:"PRO",is_premium:true,premium_expires_at:future},1)).toMatch(/plano ativo/);
  expect(promoInvestBlockReason({plan_type:"PRO",is_premium:true,premium_expires_at:past},1)).toBeNull();
});

test("promo can be switched off by env",()=>{
  expect(promoInvestEnabled({})).toBe(true);
  expect(promoInvestEnabled({PROMO_QUER_INVESTIR_QUANTO_ENABLED:"false"})).toBe(false);
});

function mockDb({paidCount=0}={}) {
  const inserted=[];
  db.from.mockImplementation(()=>{
    let head=false;
    const q={select:(_c,opts)=>{head=Boolean(opts?.head);return q;},eq:()=>q,in:()=>q,limit:async()=>({data:[]}),
      update:()=>q,
      maybeSingle:async()=>({data:null}),
      insert:(row)=>{inserted.push(row);return {select:()=>({single:async()=>({data:{...row,status:"creating",created_at:new Date().toISOString()},error:null})})};},
      then:(resolve)=>resolve(head?{count:paidCount,error:null}:{data:null,error:null})};
    return q;
  });
  return inserted;
}

test("rejects amounts outside the range before touching the provider",async()=>{
  mockDb();
  await expect(createPromoInvestCheckout({id:"owner"},{requestId:id,amount:"0,00"})).rejects.toMatchObject({status:400});
  expect(createMercadoPagoOrder).not.toHaveBeenCalled();
});

test("blocks a third purchase",async()=>{
  const inserted=mockDb({paidCount:2});
  // 1ª consulta: tentativa existente (nenhuma); 2ª: perfil do advogado.
  db.from.mockImplementationOnce(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;})
    .mockImplementationOnce(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{email:"a@example.invalid"},error:null})};return q;});
  await expect(createPromoInvestCheckout({id:"owner"},{requestId:id,amount:"10"})).rejects.toMatchObject({status:409});
  expect(inserted).toHaveLength(0);
  expect(createMercadoPagoOrder).not.toHaveBeenCalled();
});

test("paid promo Pix is fulfilled through the promo RPC with the chosen amount",async()=>{
  const row={id,method:"pix",provider_id:"ORD_promo",product:buildPromoInvestProduct(2550,1)};
  db.from.mockImplementation(()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:row})};return q;});
  db.rpc.mockResolvedValue({data:{approved:true},error:null});
  const order={id:"ORD_promo",external_reference:`sjh_${id}`,status:"processed",status_detail:"accredited",total_amount:"25.50",
    transactions:{payments:[{amount:"25.50",payment_method:{id:"pix"}}]}};
  expect(await fulfillHybridPix(order)).toEqual({approved:true});
  expect(db.rpc).toHaveBeenCalledWith("fulfill_promo_invest_checkout",{p_checkout_id:id,p_provider_key:"mp_order_ORD_promo",p_amount_cents:2550});
  await expect(fulfillHybridPix({...order,total_amount:"1.00",transactions:{payments:[{amount:"1.00",payment_method:{id:"pix"}}]}}))
    .rejects.toThrow("AMOUNT_MISMATCH");
  expect(getMercadoPagoOrder).not.toHaveBeenCalled();
});
