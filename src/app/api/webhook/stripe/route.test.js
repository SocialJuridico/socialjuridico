jest.mock("@/lib/billing/stripeClient",()=>({stripeClient:jest.fn()}));
jest.mock("@/lib/billing/hybridCheckoutServer",()=>({handleStripeBillingEvent:jest.fn()}));
import Stripe from "stripe";
import {stripeClient} from "@/lib/billing/stripeClient";
import {handleStripeBillingEvent} from "@/lib/billing/hybridCheckoutServer";
import {POST} from "./route";
const sdk=new Stripe("sk_test_fixture");
const secret="whsec_fixture";
let original;
beforeEach(()=>{original=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET=secret;stripeClient.mockReturnValue(sdk);handleStripeBillingEvent.mockReset();});
afterEach(()=>{if(original===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=original;});
function request(body,signature){return new Request("https://example.invalid/api/webhook/stripe",{method:"POST",headers:{"stripe-signature":signature},body});}
test("authentic raw Stripe payload accepted",async()=>{
  const payload=JSON.stringify({id:"evt_fixture",type:"invoice.paid",data:{object:{id:"in_fixture"}}});
  const signature=sdk.webhooks.generateTestHeaderString({payload,secret});
  expect((await POST(request(payload,signature))).status).toBe(200);
  expect(handleStripeBillingEvent).toHaveBeenCalledTimes(1);
});
test("tampered payload never reaches fulfillment",async()=>{
  const payload=JSON.stringify({id:"evt_fixture"});
  const signature=sdk.webhooks.generateTestHeaderString({payload,secret});
  expect((await POST(request(payload+" ",signature))).status).toBe(400);
  expect(handleStripeBillingEvent).not.toHaveBeenCalled();
});
