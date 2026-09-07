import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Old browser tabs cannot create new card payments in Mercado Pago.
// Legacy webhooks and status endpoints remain available.
export async function POST() {
  return NextResponse.json({success:false,message:"O checkout foi atualizado. Recarregue a página para pagar com cartão ou Pix."},
    {status:410,headers:{"Cache-Control":"no-store"}});
}
