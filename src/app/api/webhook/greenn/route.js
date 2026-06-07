import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usando a chave service_role para contornar RLS no webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const headerToken = request.headers.get("x-greenn-token");
    const systemToken = process.env.GREENN_WEBHOOK_TOKEN;

    // 1. Validar Token
    if (!headerToken || headerToken !== systemToken) {
      console.warn("⚠️ [Webhook Greenn] Token inválido ou ausente.");
      return NextResponse.json({ success: false, message: "Token inválido" }, { status: 401 });
    }

    const payload = await request.json();
    console.log("📥 [Webhook Greenn] Payload recebido:", JSON.stringify(payload, null, 2));

    const { type, event, sale, client, product } = payload;

    // 2. Processar apenas vendas pagas
    if (type === "sale" && event === "saleUpdated" && sale?.status === "paid") {
      const email = client?.email;
      const couponName = sale?.coupon?.name;
      
      if (!email) {
        console.error("❌ [Webhook Greenn] Email do cliente não encontrado no payload.");
        return NextResponse.json({ success: false, message: "Email não encontrado" }, { status: 400 });
      }

      // Determinar o plano baseado no cupom ou ID do produto
      // Você pode preencher os IDs reais aqui depois
      const GREENN_PRO_ID = "SEU_ID_PRO_AQUI"; 
      const GREENN_START_ID = "SEU_ID_START_AQUI";

      let planType = "START"; // Default fallback
      
      if (couponName === "PRIMEIROMESPRO" || product?.id?.toString() === GREENN_PRO_ID) {
        planType = "PRO";
      } else if (couponName === "PRIMEIROMES" || product?.id?.toString() === GREENN_START_ID) {
        planType = "START";
      }

      console.log(`🔍 [Webhook Greenn] Identificado Plano: ${planType} para o email: ${email}`);

      // 3. Buscar usuário no Supabase pelo email
      const { data: userData, error: userError } = await supabaseAdmin
        .from("advogados")
        .select("id, plan_type")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        console.error("❌ [Webhook Greenn] Usuário não encontrado no Supabase:", email);
        return NextResponse.json({ success: false, message: "Usuário não encontrado" }, { status: 404 });
      }

      // 4. Atualizar o plano do usuário
      const { error: updateError } = await supabaseAdmin
        .from("advogados")
        .update({
          plan_type: planType,
          is_premium: true,
          premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("id", userData.id);

      if (updateError) {
        console.error("❌ [Webhook Greenn] Erro ao atualizar plano:", updateError);
        return NextResponse.json({ success: false, message: "Erro ao atualizar plano" }, { status: 500 });
      }

      console.log(`✅ [Webhook Greenn] Plano ${planType} ativado com sucesso para ${email}`);
      return NextResponse.json({ success: true, message: "Plano ativado com sucesso" });
    }

    // Ignorar outros eventos mas retornar 200 para a Greenn não ficar tentando reenviar
    return NextResponse.json({ success: true, message: "Evento ignorado" });

  } catch (error) {
    console.error("💥 [Webhook Greenn] Erro crítico:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
