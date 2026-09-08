import { supabaseAdmin as db } from "@/lib/supabase";
import { resolveCheckoutProduct } from "./checkoutServer";
import { isRsLawyer } from "@/lib/lawyerDiscount";
import { assertLawyerPlanPurchaseAllowed } from "@/lib/lawyerPlans/planAccessServer";
import { hasLawyerPlanHistory } from "./planHistoryServer";
import { getJurisPackage, getAiCreditPackage } from "./catalog";
import { COUPON_TYPES, reserveCouponForCheckout, releaseCouponReservation, consumeCouponUsage } from "@/lib/coupons/couponServer";
import { createMercadoPagoOrder, getMercadoPagoOrder, cancelMercadoPagoOrder, getMercadoPagoSubscription, updateMercadoPagoSubscription } from "@/lib/mercadopago/client";
import { stripeClient, stripePublicKey } from "./stripeClient";
import { assertNoUnresolvedRecurringAttempt } from "./mercadoPagoRecurringServer";
import { checkoutError, checkoutReference, checkoutIdFromReference, configuredStripePrice, stripeLineItem, initialDiscount } from "./hybridPayment";

const TABLE = "billing_checkouts";
const objectId = (value) => typeof value === "string" ? value : value?.id;
const ended = (status) => ["expired","cancelled","canceled"].includes(status);
const checkoutIdValid = (id) => /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id || "");

export async function loadHybridCheckout(id, owner) {
  if (!id) return null;
  let query = db.from(TABLE).select("*").eq("id", id);
  if (owner) query = query.eq("advogado_id", owner);
  const { data, error } = await query.maybeSingle();
  if (error) throw checkoutError("Não foi possível consultar o pagamento.", 503);
  return data;
}
async function updateCheckout(id, patch) {
  const { error } = await db.from(TABLE).update(patch).eq("id", id);
  if (error) throw checkoutError("Não foi possível registrar o estado do pagamento.", 503);
}

export async function cancelHybridCheckout(row) {
  if (!row.provider_id) throw checkoutError("Esta tentativa ainda está sendo preparada. Aguarde alguns instantes e tente novamente.",409);
  const processing = () => Object.assign(checkoutError("O pagamento anterior já foi concluído ou está em processamento. Verifique a confirmação antes de trocar.",409),{code:"CHECKOUT_PROCESSING"});
  if (row.status === "paid") throw processing();
  if (row.method === "card") {
    const stripe = stripeClient();
    let session = await stripe.checkout.sessions.retrieve(row.provider_id);
    if (session.id !== row.provider_id || session.client_reference_id !== checkoutReference(row.id)) throw new Error("SESSION_MISMATCH");
    if (session.status !== "expired") {
      if (session.status !== "open" || session.payment_status !== "unpaid" || session.subscription) throw processing();
      if (session.payment_intent) {
        const intent = await stripe.paymentIntents.retrieve(objectId(session.payment_intent));
        if (["processing","succeeded","requires_capture"].includes(intent.status)) throw processing();
      }
      try { await stripe.checkout.sessions.expire(session.id,{}, {idempotencyKey:`${row.id}:expire`}); }
      catch { /* Re-read after a timeout or a concurrent payment/expiration. */ }
      session = await stripe.checkout.sessions.retrieve(row.provider_id);
      if (session.status !== "expired") throw processing();
    }
  } else {
    let order = await getMercadoPagoOrder(row.provider_id);
    if (order.id !== row.provider_id || order.external_reference !== checkoutReference(row.id)) throw new Error("PIX_CHECKOUT_MISMATCH");
    if (!ended(order.status)) {
      if (!["created","action_required"].includes(order.status) ||
          (order.transactions?.payments || []).some(payment=>["approved","processed","processing","in_process","authorized"].includes(payment.status))) throw processing();
      try { await cancelMercadoPagoOrder(order.id,`${row.id}:cancel`); }
      catch { /* Do not unlock until the provider confirms cancellation. */ }
      order = await getMercadoPagoOrder(row.provider_id);
      if (!ended(order.status)) throw processing();
    }
  }
  await updateCheckout(row.id,{status:"cancelled"});
  if (row.coupon_token) await releaseCouponReservation(db,row.coupon_token,row.advogado_id);
  return {success:true,checkoutId:row.id,status:"cancelled",approved:false};
}

export async function createHybridCheckout(user, body, reconciled = false) {
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.requestId || "")) throw checkoutError("Identificador da tentativa inválido.", 400);
  if (!["card", "pix"].includes(body.method)) throw checkoutError("Escolha cartão ou Pix.");
  if (body.method === "card") stripePublicKey();
  const existing = await loadHybridCheckout(body.requestId, user.id);
  if (existing) return openHybridCheckout(existing);
  const { data: profile, error } = await db.from("advogados").select("*").eq("id", user.id).single();
  if (error || !profile) throw checkoutError("Perfil não localizado.", 404);
  if (profile.oab_verification_status === "ERROR") throw checkoutError("Acesso restrito devido a pendências na OAB.", 403);
  const juris = Number(body.jurisAmount || 0);
  const ai = Number(body.aiCreditsAmount || 0);
  if (!Number.isFinite(juris) || !Number.isFinite(ai) ||
      (juris && !getJurisPackage(juris)) || (ai && !getAiCreditPackage(ai)) || (juris && ai)) {
    throw checkoutError("Selecione um único produto válido.",400);
  }
  const isPlan = !juris && !ai;
  if (body.replaceCheckoutId) {
    if (!isPlan || !checkoutIdValid(body.replaceCheckoutId)) throw checkoutError("Tentativa anterior inválida.",400);
    const previous = await loadHybridCheckout(body.replaceCheckoutId,user.id);
    if (!previous || previous.product.type !== "PRO_SUBSCRIPTION") throw checkoutError("Tentativa anterior não localizada.",404);
    await cancelHybridCheckout(previous);
  }
  if (isPlan) {
    assertLawyerPlanPurchaseAllowed(profile, body.planType);
    profile.has_plan_history = await hasLawyerPlanHistory(db, user.id, profile);
    // Consult the provider before deciding whether the legacy attempt still blocks.
    await assertNoUnresolvedRecurringAttempt(user.id, profile.email || user.email);
  }
  const requestedPromo = isPlan && body.billingCycle === "MONTHLY" && Boolean(body.isPromoEligible) && !profile.has_plan_history;
  let reservation;
  try {
    if (body.internalCouponId && !requestedPromo && !Number(body.aiCreditsAmount)) {
      reservation = await reserveCouponForCheckout(db, { couponId: body.internalCouponId, userId: user.id,
        expectedType: isPlan ? COUPON_TYPES.PLAN : COUPON_TYPES.JURIS, ttlMinutes: 65 });
    }
    const product = resolveCheckoutProduct({ planType: body.planType, billingCycle: body.billingCycle,
      jurisAmount: body.jurisAmount, aiCreditsAmount: body.aiCreditsAmount, requestedPromo,
      profile, isRs: isRsLawyer(profile), coupon: reservation?.coupon });
    if (!product || product.priceInCents < 50) throw checkoutError("Produto ou valor inválido.");
    if (body.method === "pix" && product.recurring) throw checkoutError("A renovação automática exige cartão. Para Pix, escolha o plano avulso.");
    if (reservation && !product.couponApplied) {
      await releaseCouponReservation(db,reservation.reservationToken,user.id); reservation = null;
    }
    const row = { id: body.requestId, advogado_id: user.id, method: body.method, product,
      payer_email: String(profile.email || user.email || "").trim().toLowerCase(),
      previous_subscription_id: isPlan ? profile.stripe_subscription_id : null,
      coupon_id: reservation?.coupon?.id || null, coupon_token: reservation?.reservationToken || null };
    const { data, error: insertError } = await db.from(TABLE).insert(row).select("*").single();
    if (insertError) {
      if (insertError.code === "23505") {
        if (reservation) await releaseCouponReservation(db,reservation.reservationToken,user.id);
        reservation = null;
        const concurrent = await loadHybridCheckout(body.requestId,user.id);
        if (concurrent) return openHybridCheckout(concurrent);
        const {data:open,error:openError} = await db.from(TABLE).select("*").eq("advogado_id",user.id)
          .in("status",["creating","pending"]).eq("product->>type","PRO_SUBSCRIPTION").limit(1);
        if (openError || !open?.length) throw checkoutError("A tentativa foi atualizada. Tente novamente.",409);
        const previous = open[0];
        const current = await hybridCheckoutStatus(previous,{includeClientSecret:false});
        if (current.approved) throw Object.assign(checkoutError("O pagamento anterior foi confirmado. Atualize a página para ver seu plano.",409),{code:"CHECKOUT_PAID"});
        if (ended(current.status) && !reconciled) return createHybridCheckout(user,{...body,replaceCheckoutId:null},true);
        const matching=(open || []).find(attempt=>attempt.method === body.method && attempt.product.type === product.type &&
          attempt.product.planType === product.planType && attempt.product.billingCycle === product.billingCycle &&
          attempt.product.priceInCents === product.priceInCents && attempt.coupon_id === row.coupon_id);
        if (matching) return openHybridCheckout(matching);
        throw Object.assign(checkoutError("Você tem uma tentativa anterior aberta. Você pode encerrá-la e continuar com a opção escolhida.",409),
          {code:"CHECKOUT_OPEN",previousCheckout:{id:previous.id,planType:previous.product.planType,billingCycle:previous.product.billingCycle,method:previous.method}});
      }
      throw checkoutError("Não foi possível registrar a tentativa de pagamento.",503);
    }
    // Once persisted, preserve the reservation and immutable attempt even on timeout.
    reservation = null;
    return openHybridCheckout(data);
  } catch (error) {
    if (reservation) await releaseCouponReservation(db,reservation.reservationToken,user.id);
    throw error;
  }
}

async function openHybridCheckout(row) {
  if (ended(row.status)) throw Object.assign(checkoutError("Esta tentativa foi encerrada. Você já pode iniciar outra.",409),{code:"CHECKOUT_EXPIRED"});
  if (row.provider_id) return hybridCheckoutStatus(row);
  if (Date.now() - new Date(row.created_at).getTime() > 55*60*1000) {
    throw checkoutError("A abertura desta tentativa precisa ser reconciliada antes de tentar novamente.",409);
  }
  const reference = checkoutReference(row.id);
  if (row.method === "pix") {
    const order = await createMercadoPagoOrder({ type:"online",processing_mode:"automatic",external_reference:reference,
      total_amount:(row.product.priceInCents/100).toFixed(2),payer:{email:row.payer_email},
      transactions:{ payments:[{amount:(row.product.priceInCents/100).toFixed(2),expiration_time:"PT1H",payment_method:{id:"pix",type:"bank_transfer"}}] } },row.id);
    if (!order?.id) throw checkoutError("O Pix ainda não foi confirmado pelo Mercado Pago.",502);
    await updateCheckout(row.id,{provider_id:order.id,status:"pending"});
    return hybridCheckoutStatus({...row,provider_id:order.id});
  }
  const stripe = stripeClient();
  const configuredId = configuredStripePrice(row.product);
  const price = configuredId ? await stripe.prices.retrieve(configuredId) : null;
  const line = stripeLineItem(row.product,price);
  const discount = initialDiscount(row.product);
  let coupon;
  if (discount) coupon = await stripe.coupons.create({amount_off:discount,currency:"brl",duration:"once",
    name:"Condição da primeira cobrança",metadata:{checkout_id:row.id}}, {idempotencyKey:`${row.id}:discount`});
  const site = String(process.env.NEXT_PUBLIC_SITE_URL || "https://socialjuridico.com.br").replace(/\/$/,"");
  const metadata = {checkout_id:row.id};
  const session = await stripe.checkout.sessions.create({
    ui_mode:"embedded",mode:row.product.recurring?"subscription":"payment",payment_method_types:["card"],adaptive_pricing:{enabled:false},
    line_items:[line],customer_email:row.payer_email,client_reference_id:reference,metadata,
    ...(row.product.recurring ? {subscription_data:{metadata}} : {payment_intent_data:{metadata}}),
    ...(coupon ? {discounts:[{coupon:coupon.id}]} : {}),
    expires_at:Math.floor(new Date(row.created_at).getTime()/1000)+3600,
    return_url:`${site}/checkout/retorno?checkout=${row.id}`,redirect_on_completion:"if_required",locale:"pt-BR",
  },{idempotencyKey:row.id});
  await updateCheckout(row.id,{provider_id:session.id,status:"pending"});
  return {success:true,checkoutId:row.id,method:"card",clientSecret:session.client_secret,
    publicKey:stripePublicKey(session.livemode),amount:row.product.priceInCents,approved:false};
}

async function deliver(row, key, amount, firstCharge, subscriptionId = null, periodEnd = null) {
  // Cancellation is idempotent and happens only after a verified paid object.
  if (firstCharge && row.previous_subscription_id && row.previous_subscription_id !== subscriptionId) {
    const old = row.previous_subscription_id;
    if (old.startsWith("mp_")) {
      const previous = await getMercadoPagoSubscription(old.slice(3));
      if (!["canceled","cancelled"].includes(previous.status)) await updateMercadoPagoSubscription(old.slice(3),{status:"cancelled"});
    }
    else if (old.startsWith("sub_")) {
      const previous = await stripeClient().subscriptions.retrieve(old);
      if (previous.status !== "canceled") await stripeClient().subscriptions.cancel(old);
    }
  }
  const {data,error} = await db.rpc("fulfill_hybrid_checkout",{
    p_checkout_id:row.id,p_provider_key:key,p_amount_cents:amount,p_first_charge:firstCharge,
    p_subscription_id:subscriptionId,p_period_end:periodEnd,
  });
  if (error) throw checkoutError("Pagamento recebido; a confirmação dos benefícios precisa ser concluída.",503);
  if (firstCharge && row.coupon_id) await consumeCouponUsage(db,{token:row.coupon_token,couponId:row.coupon_id,
    userId:row.advogado_id,checkoutReference:checkoutReference(row.id)});
  return data;
}

export async function fulfillHybridInvoice(invoiceId) {
  const stripe = stripeClient();
  const invoice = await stripe.invoices.retrieve(invoiceId);
  const subscriptionId = objectId(invoice.parent?.subscription_details?.subscription || invoice.subscription);
  if (!subscriptionId || invoice.status !== "paid" || invoice.currency !== "brl") return {approved:false};
  if (!["subscription_create","subscription_cycle"].includes(invoice.billing_reason)) return {approved:false};
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const row = await loadHybridCheckout(subscription.metadata?.checkout_id);
  if (!row || row.method !== "card" || !row.product.recurring) return {approved:false};
  if (invoice.livemode !== subscription.livemode) throw new Error("ENVIRONMENT_MISMATCH");
  if (row.subscription_id && row.subscription_id !== subscriptionId) throw new Error("SUBSCRIPTION_MISMATCH");
  const first = invoice.billing_reason === "subscription_create";
  const expected = first ? row.product.priceInCents : row.product.renewalPriceInCents;
  if (invoice.amount_paid !== expected || invoice.total !== expected) throw new Error("AMOUNT_MISMATCH");
  const lines = invoice.lines?.data || [];
  const end = Math.max(...lines.map(line=>Number(line.period?.end)||0));
  if (!end) throw new Error("INVOICE_PERIOD_MISSING");
  return deliver(row,`stripe_invoice_${invoice.id}`,invoice.amount_paid,first,subscriptionId,new Date(end*1000).toISOString());
}

export async function fulfillHybridPix(order) {
  const id = checkoutIdFromReference(order.external_reference);
  if (!id) return null;
  const row = await loadHybridCheckout(id);
  if (!row || row.method !== "pix") throw new Error("PIX_CHECKOUT_MISMATCH");
  const payment = order.transactions?.payments?.[0];
  if (!payment && order.status !== "processed") return {approved:false};
  if (payment?.payment_method?.id !== "pix" || (row.provider_id && row.provider_id !== order.id)) throw new Error("PIX_PAYMENT_MISMATCH");
  if (order.status !== "processed" || order.status_detail !== "accredited") return {approved:false};
  const amount = Math.round(Number(payment.amount)*100);
  if (amount !== row.product.priceInCents || Math.round(Number(order.total_amount)*100)!==amount) throw new Error("AMOUNT_MISMATCH");
  return deliver(row,`mp_order_${order.id}`,amount,true);
}

export async function hybridCheckoutStatus(row, {includeClientSecret = true} = {}) {
  const base = {success:true,checkoutId:row.id,method:row.method,amount:row.product.priceInCents};
  if (!row.provider_id) return {...base,approved:false,status:"creating"};
  if (row.method === "pix") {
    const order = await getMercadoPagoOrder(row.provider_id);
    const fulfilled = await fulfillHybridPix(order);
    const payment = order.transactions?.payments?.[0];
    if (["expired","canceled","cancelled"].includes(order.status)) await updateCheckout(row.id,{status:"expired"});
    return {...base,approved:Boolean(fulfilled?.approved),status:order.status,
      qrCode:payment?.payment_method?.qr_code,qrCodeBase64:payment?.payment_method?.qr_code_base64};
  }
  const stripe = stripeClient();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(row.provider_id);
  } catch (error) {
    if (error?.code === "resource_missing" || error?.statusCode === 404) {
      await updateCheckout(row.id, { status: "expired" });
      return { ...base, approved: false, status: "expired" };
    }
    throw error;
  }
  if (session.client_reference_id !== checkoutReference(row.id)) throw new Error("SESSION_MISMATCH");
  let fulfilled;
  if (session.payment_status === "paid") {
    if (session.mode === "subscription") {
      const sub = await stripe.subscriptions.retrieve(objectId(session.subscription));
      // The subscription points to the newest invoice; each invoice is delivered once.
      if (sub.latest_invoice) fulfilled = await fulfillHybridInvoice(objectId(sub.latest_invoice));
    } else {
      const intent = await stripe.paymentIntents.retrieve(objectId(session.payment_intent));
      if (intent.status === "succeeded" && intent.currency === "brl" && intent.amount_received === row.product.priceInCents) {
        fulfilled = await deliver(row,`stripe_pi_${intent.id}`,intent.amount_received,true);
      }
    }
  }
  if (session.status === "expired") await updateCheckout(row.id,{status:"expired"});
  return {...base,approved:Boolean(fulfilled?.approved),status:session.status,
    ...(session.status === "open" && includeClientSecret ? {clientSecret:session.client_secret,publicKey:stripePublicKey(session.livemode)} : {})};
}

export async function handleStripeBillingEvent(event) {
  const object = event.data.object;
  if (event.type === "invoice.paid") return fulfillHybridInvoice(object.id);
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.expired") {
    if (!object.metadata?.checkout_id) return;
    const row = await loadHybridCheckout(object.metadata.checkout_id);
    if (!row || row.method !== "card") return;
    if (row.provider_id && row.provider_id !== object.id) throw new Error("SESSION_MISMATCH");
    if (!row.provider_id) await updateCheckout(row.id,{provider_id:object.id});
    return hybridCheckoutStatus({...row,provider_id:object.id});
  }
  if (["customer.subscription.updated","customer.subscription.deleted"].includes(event.type)) {
    const sub = await stripeClient().subscriptions.retrieve(object.id);
    if (!sub.metadata?.checkout_id) return;
    const statuses = {canceled:"CANCELED",unpaid:"UNPAID",past_due:"PAST_DUE",paused:"PAUSED"};
    // Never activate from subscription status; only a paid invoice grants benefits.
    const status = statuses[sub.status];
    if (status) {
      const {error} = await db.from("advogados").update({subscription_status:status}).eq("stripe_subscription_id",sub.id);
      if (error) throw error;
    }
  }
}
