import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { priceId, profileData, planType, billingCycle } = await request.json();

    console.log("🟢 [Greenn API] Iniciando geração de Pix...");
    console.log("Dados do usuário:", profileData);
    console.log("Plano:", planType, billingCycle);

    // TODO: Aqui faremos a chamada real para a API da Greenn
    // Exemplo (fictício baseado em padrões de mercado):
    /*
    const greennRes = await fetch("https://api.greenn.com.br/v1/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GREENN_API_KEY}`
      },
      body: JSON.stringify({
        product_id: planType === 'PRO' ? 'ID_DO_PRO_NA_GREENN' : 'ID_DO_START_NA_GREENN',
        payment_method: "pix",
        customer: {
          name: profileData?.name || user.email,
          email: user.email,
          cpf: profileData?.cpf // ou cnpj
        },
        // Se houver cupom
        coupon: planType === 'PRO' ? 'PRIMEIROMESPRO' : 'PRIMEIROMES'
      })
    });
    const greennData = await greennRes.json();
    */

    // Simulando resposta de sucesso enquanto aguardamos aprovação dos produtos
    return NextResponse.json({ 
      success: true, 
      message: "Pix gerado com sucesso (Modo Simulação)!",
      data: {
        pix_copiacola: "00020101021226870014br.gov.bcb.pix2565api.greenn.com.br/v1/pix/simulado530398654041.005802BR5924SocialJuridico6009Sao Paulo62070503***6304E2B1",
        pix_qrcode: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021226870014br.gov.bcb.pix2565api.greenn.com.br/v1/pix/simulado530398654041.005802BR5924SocialJuridico6009Sao Paulo62070503***6304E2B1",
        amount: planType === 'PRO' ? 1099 : 1099, // R$ 10,99 em centavos? Ou reais?
      }
    });

  } catch (error) {
    console.error("Erro POST api/checkout/greenn:", error);
    return NextResponse.json({ success: false, message: "Erro interno ao gerar Pix." }, { status: 500 });
  }
}
