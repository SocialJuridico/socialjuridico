import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { jurisCreditadoTemplate, boasVindasPlanoTemplate } from "@/lib/emailTemplates";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "Acesso restrito a administradores" }, { status: 403 });
    }

    const { email, type, amount, planType } = await request.json();

    if (!email || !type) {
      return NextResponse.json({ success: false, message: "Dados incompletos" }, { status: 400 });
    }

    // Buscar advogado
    const { data: userData, error: userError } = await db
      .from("advogados")
      .select("id, name, balance")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ success: false, message: "Advogado não encontrado" }, { status: 404 });
    }

    let updateData = {};
    let bonusJuris = 0;

    if (type === 'JURIS') {
      bonusJuris = parseInt(amount);
      if (isNaN(bonusJuris)) {
        return NextResponse.json({ success: false, message: "Quantidade de Juris inválida" }, { status: 400 });
      }
      updateData = { balance: (userData.balance || 0) + bonusJuris };
    } else if (type === 'PLAN') {
      bonusJuris = planType === 'PRO' ? 20 : 7;
      updateData = {
        plan_type: planType,
        is_premium: true,
        balance: (userData.balance || 0) + bonusJuris,
        premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    } else {
      return NextResponse.json({ success: false, message: "Tipo inválido" }, { status: 400 });
    }

    // Atualizar no banco
    const { error: updateError } = await db
      .from("advogados")
      .update(updateData)
      .eq("id", userData.id);

    if (updateError) {
      console.error("Erro ao atualizar advogado:", updateError);
      return NextResponse.json({ success: false, message: "Erro ao atualizar dados" }, { status: 500 });
    }

    // Inserir registro na tabela de transacoes
    await db.from('transacoes').insert([{
      advogado_id: userData.id,
      tipo: type === 'JURIS' ? 'JURIS_PURCHASE' : 'PRO_SUBSCRIPTION',
      valor: 0, // Manual/Cortesia
      moeda: 'BRL',
      status: 'succeeded',
      juris_amount: bonusJuris,
      stripe_session_id: `manual_\${Date.now()}`,
      created_at: new Date().toISOString()
    }]);

    // 📧 ENVIAR EMAIL PARA O ADVOGADO
    try {
      const lawyerName = userData.name || 'Advogado';
      
      if (type === 'JURIS') {
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
      } else {
        await resend.emails.send({
          from: 'Social Jurídico <contato@socialjuridico.com.br>',
          to: [email],
          subject: `👑 Bem-vindo ao Plano \${planType}!`,
          html: boasVindasPlanoTemplate({
            lawyerName,
            planType,
            jurisBonus
          })
        });
      }
    } catch (emailErr) {
      console.error("⚠️ Erro ao enviar email (não-fatal):", emailErr.message);
    }

    return NextResponse.json({ success: true, message: "Crédito aplicado e email enviado!" });

  } catch (error) {
    console.error("Erro na API POST /api/admin/creditar-manual:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
