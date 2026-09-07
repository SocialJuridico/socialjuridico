import { stripePublicKey } from "./stripeClient";

const previous = { secret:process.env.STRIPE_SECRET_KEY, public:process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY };
afterEach(()=>{
  if(previous.secret===undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY=previous.secret;
  if(previous.public===undefined) delete process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
  else process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY=previous.public;
});
test("mixed test and live keys fail before checkout creation without exposing credentials",()=>{
  process.env.STRIPE_SECRET_KEY="sk_live_private_fixture";
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_fixture";
  expect(stripePublicKey).toThrow("configuração da Stripe");
  try {stripePublicKey();} catch(error) {
    expect(error.code).toBe("STRIPE_CONFIGURATION");
    expect(error.message).not.toContain("private_fixture");
  }
});
test("a key from a different session environment is rejected",()=>{
  process.env.STRIPE_SECRET_KEY="sk_test_fixture";
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_fixture";
  expect(()=>stripePublicKey(true)).toThrow();
  expect(stripePublicKey(false)).toBe("pk_test_fixture");
});
test("the public key is read again after a runtime configuration change",()=>{
  process.env.STRIPE_SECRET_KEY="sk_live_fixture";
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_live_first";
  expect(stripePublicKey(true)).toBe("pk_live_first");
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_live_replacement";
  expect(stripePublicKey(true)).toBe("pk_live_replacement");
});
