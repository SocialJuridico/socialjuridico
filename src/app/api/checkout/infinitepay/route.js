import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { planType, jurisAmount, customer, isPromoEligible } = await request.json();

    console.log("🚀 [Checkout InfinitePay] Iniciando geração de link para:", customer.email);

    // 1. Determinar o valor e descrição
    let priceInCents = 0;
    let description = "";

    // Se for Juris (Verifica se é uma das quantidades válidas: 10, 20 ou 50)
    if (jurisAmount && (jurisAmount === 10 || jurisAmount === 20 || jurisAmount === 50)) {
      if (jurisAmount === 10) { priceInCents = 990; description = "Pacote 10 Juris"; }
      else if (jurisAmount === 20) { priceInCents = 1690; description = "Pacote 20 Juris"; }
      else if (jurisAmount === 50) { priceInCents = 3990; description = "Pacote 50 Juris"; }
    } 
    // Se for Plano
    else if (planType) {
      const isPro = planType === "PRO";
      
      if (isPromoEligible) {
        priceInCents = 1099; // R$ 10,99 para a promoção
        description = isPro ? "Plano Pro Promocional 30 dias" : "Plano Start Promocional 30 dias";
      } else {
        priceInCents = isPro ? 8790 : 4099; // Valores normais
        description = isPro ? "Plano Pro Mensal" : "Plano Start Mensal";
      }
    }

    // Validar se conseguimos determinar o valor
    if (priceInCents === 0) {
      console.error("❌ [Checkout InfinitePay] Não foi possível determinar o valor. planType:", planType, "jurisAmount:", jurisAmount);
      return NextResponse.json({ success: false, message: "Não foi possível determinar o valor do produto" }, { status: 400 });
    }

    // 2. Montar o payload para a InfinitePay
    const payload = {
      handle: "carlos-henrique-1o7",
      items: [
        {
          quantity: 1,
          price: priceInCents,
          description: description
        }
      ],
      redirect_url: "https://socialjuridico.com.br/dashboard/advogado?payment_status=success",
      webhook_url: "https://socialjuridico.com.br/api/webhook/infinitepay",
      order_nsu: `sj_${customer.email}_${Date.now()}`,
      customer: {
        name: customer.name || "Cliente Social Jurídico",
        email: customer.email,
        phone_number: (() => {
          let p = customer.phone || "";
          // Remove caracteres não numéricos
          p = p.replace(/\D/g, "");
          // Se não tiver o DDI (55), adiciona
          if (p.length > 0 && !p.startsWith("55")) {
            p = "55" + p;
          }
          // Adiciona o +
          if (p.length > 0) {
            p = "+" + p;
          }
          return p;
        })()
      }
    };

    console.log("📦 [Checkout InfinitePay] Enviando payload:", JSON.stringify(payload, null, 2));

    // 3. Chamar a API da InfinitePay
    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log("📥 [Checkout InfinitePay] Resposta bruta:", responseText);

    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("❌ [Checkout InfinitePay] Erro ao parsear JSON:", e);
    }

    if (data.url) {
      return NextResponse.json({ success: true, url: data.url });
    } else {
      console.error("❌ [Checkout InfinitePay] Erro ao gerar link:", data);
      return NextResponse.json({ success: false, message: "Erro ao gerar link de pagamento" }, { status: 500 });
    }

  } catch (error) {
    console.error("💥 [Checkout InfinitePay] Erro crítico:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
