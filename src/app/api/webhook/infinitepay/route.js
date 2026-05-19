import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/resend";
import { jurisCreditadoTemplate, boasVindasPlanoTemplate } from "@/lib/emailTemplates";

// Usando a chave service_role para contornar RLS no webhook
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log("📥 [Webhook InfinitePay] Payload recebido:", JSON.stringify(payload, null, 2));

    const { amount, customer, items, order_nsu } = payload;
    
    // O email do cliente é crucial para identificarmos quem comprou
    let email = customer?.email || payload.customer_email || payload.metadata?.email;
    
    // Failsafe: se o email não estiver no local padrão, mas vier no order_nsu codificado como sj_email_timestamp
    if (!email && order_nsu && order_nsu.startsWith("sj_")) {
      const parts = order_nsu.split("_");
      // O formato é sj_email_timestamp. Remove o 'sj' e o timestamp
      email = parts.slice(1, -1).join("_");
      console.log("ℹ️ [Webhook InfinitePay] Email recuperado via order_nsu:", email);
    }
    
    if (!email) {
      console.error("❌ [Webhook InfinitePay] Email do cliente não encontrado no payload.");
      return NextResponse.json({ success: false, message: "Email não encontrado" }, { status: 400 });
    }

    // Buscar usuário no Supabase pelo email
    const { data: userData, error: userError } = await supabaseAdmin
      .from("advogados")
      .select("id, name, plan_type, promo_used, balance")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      console.error("❌ [Webhook InfinitePay] Usuário não encontrado no Supabase:", email);
      return NextResponse.json({ success: false, message: "Usuário não encontrado" }, { status: 404 });
    }

    // Mapeamento de valores (em centavos ou valor real dependendo de como a InfinitePay envia)
    // Se vier com ponto (ex: 16.90), multiplicamos por 100 para converter em centavos.
    // Se vier inteiro (ex: 1690), usamos direto.
    const amountInCents = amount.toString().includes('.') 
      ? Math.round(Number(amount) * 100) 
      : Number(amount);

    console.log(`💰 [Webhook InfinitePay] Valor processado: ${amountInCents} centavos para ${email} (Original: ${amount})`);

    let updateData = {};
    let message = "";
    let bonusJuris = 0;

    // 1. Planos Promocionais (R$ 10,99)
    if (amountInCents === 1099) {
      const itemDesc = items?.[0]?.description?.toLowerCase() || "";
      let planType = "START";
      
      if (itemDesc.includes("pro")) {
        planType = "PRO";
      }

      bonusJuris = planType === "PRO" ? 20 : 7;

      updateData = {
        plan_type: planType,
        is_premium: true,
        balance: (userData.balance || 0) + bonusJuris,
        [planType === "PRO" ? "promo_pro_used" : "promo_start_used"]: true
      };
      message = `Plano Promocional ${planType} ativado! Adicionados ${bonusJuris} Juris de bônus.`;
    }
    // 2. Plano Start Normal (R$ 40,99)
    else if (amountInCents === 4099) {
      bonusJuris = 7;
      updateData = {
        plan_type: "START",
        is_premium: true,
        balance: (userData.balance || 0) + bonusJuris
      };
      message = "Plano Start ativado! Adicionados 7 Juris de bônus.";
    }
    // 3. Plano Pro Normal (R$ 87,90)
    else if (amountInCents === 8790) {
      bonusJuris = 20;
      updateData = {
        plan_type: "PRO",
        is_premium: true,
        balance: (userData.balance || 0) + bonusJuris
      };
      message = "Plano Pro ativado! Adicionados 20 Juris de bônus.";
    }
    // 4. Pacotes de Juris
    else if (amountInCents === 990) {
      bonusJuris = 10;
      updateData = { balance: (userData.balance || 0) + bonusJuris };
      message = "Adicionados 10 Juris!";
    }
    else if (amountInCents === 1690) {
      bonusJuris = 20;
      updateData = { balance: (userData.balance || 0) + bonusJuris };
      message = "Adicionados 20 Juris!";
    }
    else if (amountInCents === 3990) {
      bonusJuris = 50;
      updateData = { balance: (userData.balance || 0) + bonusJuris };
      message = "Adicionados 50 Juris!";
    }
    // Planos Anuais (Fallback caso usem)
    else if (amountInCents === 43188) {
      bonusJuris = 7;
      updateData = { plan_type: "START", is_premium: true, balance: (userData.balance || 0) + bonusJuris };
      message = "Plano Start Anual ativado! Adicionados 7 Juris de bônus.";
    }
    else if (amountInCents === 91188) {
      bonusJuris = 20;
      updateData = { plan_type: "PRO", is_premium: true, balance: (userData.balance || 0) + bonusJuris };
      message = "Plano Pro Anual ativado! Adicionados 20 Juris de bônus.";
    }
    else {
      console.warn("⚠️ [Webhook InfinitePay] Valor não mapeado:", amountInCents);
      return NextResponse.json({ success: true, message: "Valor não mapeado, ignorando" });
    }

    // Atualizar no banco
    const { error: updateError } = await supabaseAdmin
      .from("advogados")
      .update(updateData)
      .eq("id", userData.id);

    if (updateError) {
      console.error("❌ [Webhook InfinitePay] Erro ao atualizar banco:", updateError);
      return NextResponse.json({ success: false, message: "Erro ao atualizar dados" }, { status: 500 });
    }

    // Inserir registro na tabela de transações para o admin ver!
    const { error: txError } = await supabaseAdmin
      .from('transacoes')
      .upsert({
        advogado_id: userData.id,
        tipo: amountInCents === 990 || amountInCents === 1690 || amountInCents === 3990 ? 'JURIS_PURCHASE' : 'PRO_SUBSCRIPTION',
        valor: amountInCents / 100,
        moeda: 'BRL',
        status: 'succeeded',
        juris_amount: bonusJuris,
        stripe_session_id: order_nsu || `inf_${Date.now()}`, // Usando NSU ou fallback
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'stripe_session_id',
        ignoreDuplicates: false 
      });

    if (txError) {
      console.error("⚠️ [Webhook InfinitePay] Erro ao criar registro de transação:", txError);
    } else {
      console.log("✅ [Webhook InfinitePay] Registro de transação criado para o admin.");
    }

    // 📧 ENVIAR EMAIL PARA O ADVOGADO
    try {
      const isJuris = amountInCents === 990 || amountInCents === 1690 || amountInCents === 3990;
      const lawyerName = userData.name || 'Advogado';
      
      if (isJuris) {
        const newBalance = (userData.balance || 0) + bonusJuris;
        await resend.emails.send({
          from: 'Social Jurídico <contato@socialjuridico.com.br>',
          to: [email],
          subject: '💰 Seus Juris foram creditados!',
          html: jurisCreditadoTemplate({
            lawyerName,
            amount: bonusJuris,
            balance: newBalance
          })
        });
        console.log(`📧 Email de crédito de Juris enviado para ${email}`);
      } else {
        // É plano
        let planType = "START";
        if (amountInCents === 1099) {
          const itemDesc = items?.[0]?.description?.toLowerCase() || "";
          if (itemDesc.includes("pro")) planType = "PRO";
        } else if (amountInCents === 8790 || amountInCents === 91188) {
          planType = "PRO";
        }
        
        await resend.emails.send({
          from: 'Social Jurídico <contato@socialjuridico.com.br>',
          to: [email],
          subject: `👑 Bem-vindo ao Plano ${planType}!`,
          html: boasVindasPlanoTemplate({
            lawyerName,
            planType,
            jurisBonus
          })
        });
        console.log(`📧 Email de boas-vindas do plano ${planType} enviado para ${email}`);
      }
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar email para o advogado (não-fatal):", emailErr.message);
    }

    console.log(`✅ [Webhook InfinitePay] \${message} para \${email}`);
    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error("💥 [Webhook InfinitePay] Erro crítico:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
