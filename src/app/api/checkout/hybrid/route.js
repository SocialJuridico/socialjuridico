import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createHybridCheckout, loadHybridCheckout, hybridCheckoutStatus } from "@/lib/billing/hybridCheckoutServer";

const json = (data,status=200) => NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host &&
      new URL(origin).host !== request.headers.get("x-forwarded-host")) return json({message:"Origem não autorizada."},403);
    const {data:{user}} = await createClient().auth.getUser();
    if (!user) return json({message:"Não autorizado."},401);
    const body = await request.json();
    return json(await createHybridCheckout(user,body));
  } catch (error) {
    console.error("[HybridCheckout] Falha",{code:error.code || error.type || "CHECKOUT_FAILED",status:error.status || 503});
    return json({success:false,code:error.code || "CHECKOUT_FAILED",message:error.status?error.message:"Não foi possível confirmar a abertura do checkout. Consulte esta tentativa antes de iniciar outra."},error.status || 503);
  }
}
export async function GET(request) {
  try {
    const {data:{user}} = await createClient().auth.getUser();
    if (!user) return json({message:"Não autorizado."},401);
    const id = new URL(request.url).searchParams.get("checkout");
    if (!/^[a-f0-9-]{36}$/i.test(id || "")) return json({message:"Identificador inválido."},400);
    const row = await loadHybridCheckout(id,user.id);
    if (!row) return json({message:"Pagamento não localizado."},404);
    return json(await hybridCheckoutStatus(row));
  } catch (error) {
    console.error("[HybridCheckout] Consulta falhou",{code:error.code || error.type || "STATUS_FAILED"});
    return json({success:false,message:"Não foi possível confirmar o pagamento. A tentativa foi preservada."},503);
  }
}
