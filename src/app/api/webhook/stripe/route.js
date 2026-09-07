import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/billing/stripeClient";
import { handleStripeBillingEvent } from "@/lib/billing/hybridCheckoutServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({success:false},{status:503});
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(),request.headers.get("stripe-signature"),secret);
  } catch {
    return NextResponse.json({success:false,message:"Assinatura inválida."},{status:400});
  }
  try {
    await handleStripeBillingEvent(event);
    return NextResponse.json({received:true});
  } catch (error) {
    console.error("[Webhook/Stripe] Confirmação pendente",{eventId:event.id,type:event.type,code:error.code || "FULFILLMENT_FAILED"});
    return NextResponse.json({received:false},{status:500});
  }
}
