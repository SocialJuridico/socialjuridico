/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render,screen,fireEvent,waitFor,cleanup } from "@testing-library/react";
import HybridCheckoutModal from "./HybridCheckoutModal";
jest.mock("@stripe/stripe-js",()=>({loadStripe:jest.fn(()=>Promise.resolve({}))}));
jest.mock("@stripe/react-stripe-js",()=>({EmbeddedCheckoutProvider:({children})=>children,EmbeddedCheckout:()=> <div>Formulário do cartão</div>}));
const props={isOpen:true,onClose:jest.fn(),isPro:false,jurisAmount:10,displayAmount:9.9};
beforeEach(()=>{sessionStorage.clear();global.fetch=jest.fn();});
afterEach(()=>{cleanup();jest.restoreAllMocks();});
test("opening a checkout does not create a payment before the user chooses",()=>{
  render(<HybridCheckoutModal {...props}/>);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByRole("button",{name:"Cartão de crédito"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Pix"})).toBeInTheDocument();
});
test("card payment renders inside the site and uses the hybrid endpoint",async()=>{
  fetch.mockResolvedValue({ok:true,json:async()=>({method:"card",clientSecret:"cs_fixture_secret",publicKey:"pk_test_fixture",amount:990})});
  render(<HybridCheckoutModal {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Continuar com cartão"}));
  await screen.findByText("Formulário do cartão");
  expect(fetch.mock.calls[0][0]).toBe("/api/checkout/hybrid");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({method:"card",jurisAmount:10});
});
test("Pix waits for server confirmation before refreshing benefits",async()=>{
  const success=jest.fn();
  fetch.mockImplementation(async(_url,options)=>({ok:true,json:async()=>options?.method==="POST"
    ?{method:"pix",qrCode:"PIX_FIXTURE",amount:990,status:"action_required",approved:false}
    :{method:"pix",status:"processed",approved:true}}));
  render(<HybridCheckoutModal {...props} onPaymentSuccess={success}/>);
  fireEvent.click(screen.getByRole("button",{name:"Pix"}));
  expect(success).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Gerar Pix"}));
  await waitFor(()=>expect(success).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetch.mock.calls[0][1].body).method).toBe("pix");
});
test("automatic subscriptions offer card only",()=>{
  render(<HybridCheckoutModal {...props} isPro planType="PRO" billingCycle="MONTHLY" displayAmount={150}/>);
  expect(screen.queryByRole("button",{name:"Pix"})).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

test("a rejected preflight does not show a lookup for a nonexistent payment",async()=>{
  fetch.mockResolvedValue({ok:false,json:async()=>({code:"LEGACY_PENDING",message:"Tentativa anterior pendente"})});
  render(<HybridCheckoutModal {...props} isPro planType="PRO" billingCycle="MONTHLY"/>);
  fireEvent.click(screen.getByRole("button",{name:"Continuar com cartão"}));
  await screen.findByRole("alert");
  expect(screen.queryByRole("button",{name:"Verificar pagamento"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Verificar tentativa anterior"}));
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls.every(([,options])=>options.method==="POST")).toBe(true);
});

test("a Stripe configuration failure leaves Pix selectable",async()=>{
  fetch.mockResolvedValue({ok:false,json:async()=>({code:"STRIPE_CONFIGURATION",message:"Cartão indisponível"})});
  render(<HybridCheckoutModal {...props}/>);
  fireEvent.click(screen.getByRole("button",{name:"Continuar com cartão"}));
  await screen.findByRole("alert");
  expect(screen.getByRole("button",{name:"Pix"})).toBeEnabled();
  expect(screen.queryByText("Formulário do cartão")).not.toBeInTheDocument();
});
