import { stripeLineItem, initialDiscount, configuredStripePrice, checkoutIdFromReference } from "./hybridPayment";

const pro = {type:"PRO_SUBSCRIPTION",planType:"PRO",billingCycle:"MONTHLY",recurring:true,
  priceInCents:15000,renewalPriceInCents:15000,description:"Plano PRO mensal"};
const legacy = {id:"price_old",product:"prod_pro",active:true,currency:"brl",unit_amount:6990,recurring:{interval:"month",interval_count:1}};
test("the old R$69.90 price never replaces the authorized R$150.00 catalog price",()=>{
  const line=stripeLineItem(pro,legacy);
  expect(line.price).toBeUndefined();
  expect(line.price_data.unit_amount).toBe(15000);
  expect(line.price_data.product).toBe("prod_pro");
});
test("a matching configured price is used directly",()=>{
  expect(stripeLineItem(pro,{...legacy,unit_amount:15000})).toEqual({price:"price_old",quantity:1});
});
test("first-month promotion discounts only the first invoice, not the renewal price",()=>{
  const promo={...pro,priceInCents:3999};
  expect(initialDiscount(promo)).toBe(11001);
  expect(stripeLineItem(promo,legacy).price_data.unit_amount).toBe(15000);
});
test("OAB/RS renewal remains R$127.50 and first promotion R$39.99",()=>{
  const rs={...pro,priceInCents:3999,renewalPriceInCents:12750};
  expect(initialDiscount(rs)).toBe(8751);
  expect(stripeLineItem(rs,legacy).price_data.unit_amount).toBe(12750);
});
test("annual START uses an annual price without requiring another environment variable",()=>{
  expect(stripeLineItem({...pro,planType:"START",billingCycle:"ANNUAL",priceInCents:43188,renewalPriceInCents:43188}).price_data)
    .toMatchObject({unit_amount:43188,recurring:{interval:"year"}});
});
test("Juris uses the provided mapping and discounted one-time amount",()=>{
  const p={type:"JURIS_PURCHASE",jurisAmount:10,recurring:false,priceInCents:800,description:"10 Juris"};
  expect(configuredStripePrice(p,{NEXT_PUBLIC_PRICE_JURIS_10:"price_juris"})).toBe("price_juris");
  expect(stripeLineItem(p,{...legacy,recurring:null,unit_amount:990}).price_data.unit_amount).toBe(800);
  expect(initialDiscount(p)).toBe(0);
});
test.each([{...legacy,active:false},{...legacy,currency:"usd"}])("invalid configured prices fail closed",price=>{
  expect(()=>stripeLineItem(pro,price)).toThrow();
});
test("invalid references are not accepted",()=>{
  expect(checkoutIdFromReference("sjh_123")).toBeNull();
  expect(checkoutIdFromReference("sjm_abc_PMO")).toBeNull();
  expect(checkoutIdFromReference("sjh_00000000-0000-0000-0000-000000000001")).toBe("00000000-0000-0000-0000-000000000001");
});
