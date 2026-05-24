import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const expectedSecret = process.env.CRON_SECRET || "socialjuridico_cron_secret_2026";

    if (secret !== expectedSecret && req.headers.get("x-cron-secret") !== expectedSecret) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin;

    // Buscar advogados premium com data de expiração cadastrada
    const { data: premiumLawyers, error: fetchError } = await db
      .from("advogados")
      .select("id, name, email, is_premium, premium_expires_at, plan_type")
      .eq("is_premium", true)
      .not("premium_expires_at", "is", null);

    if (fetchError) {
      console.error("[cron/verificar-planos] Erro ao buscar advogados premium:", fetchError);
      throw fetchError;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let processedCount = 0;
    let notifiedCount = 0;

    for (const lawyer of (premiumLawyers || [])) {
      processedCount++;
      const expiresAt = new Date(lawyer.premium_expires_at);
      expiresAt.setHours(0, 0, 0, 0);

      // Cálculo da diferença em dias (arredondado)
      const diffTime = expiresAt.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Verificamos se está nos marcos: 3 dias, 2 dias ou último dia (1 ou 0 dias restantes)
      if (diffDays !== 3 && diffDays !== 2 && diffDays !== 1 && diffDays !== 0) {
        continue;
      }

      // Normaliza diffDays para 1, 2 ou 3
      const daysRemaining = diffDays === 0 ? 1 : diffDays;

      // Buscar se já notificamos sobre essa expiração específica
      const { data: sentNotifs, error: searchError } = await db
        .from("notificacoes")
        .select("meta")
        .eq("user_id", lawyer.id)
        .eq("tipo", "PLANO_EXPIRANDO");

      if (searchError) {
        console.error(`[cron/verificar-planos] Erro ao buscar notificações existentes para o advogado ${lawyer.id}:`, searchError);
        continue;
      }

      const alreadyNotified = (sentNotifs || []).some(n => {
        try {
          const meta = typeof n.meta === 'string' ? JSON.parse(n.meta) : n.meta;
          return meta && meta.days_remaining === daysRemaining;
        } catch {
          return false;
        }
      });

      if (alreadyNotified) {
        console.log(`[cron/verificar-planos] Advogado ${lawyer.name} (${lawyer.id}) já foi notificado sobre expiração de ${daysRemaining} dia(s).`);
        continue;
      }

      // Definir títulos e mensagens baseados nos dias restantes
      let title = "";
      let message = "";

      if (daysRemaining === 3) {
        title = "Seu plano expira em 3 dias ⏳";
        message = `Prezado(a) ${lawyer.name || 'Dr(a)'}, sua assinatura do plano ${lawyer.plan_type} expira em 3 dias. Renove agora para não perder o acesso às funcionalidades exclusivas.`;
      } else if (daysRemaining === 2) {
        title = "Seu plano expira em 2 dias ⏳";
        message = `Prezado(a) ${lawyer.name || 'Dr(a)'}, sua assinatura do plano ${lawyer.plan_type} expira em 2 dias. Evite a interrupção no atendimento de novos casos.`;
      } else {
        title = "Último dia de assinatura! 🚨";
        message = `Prezado(a) ${lawyer.name || 'Dr(a)'}, hoje é o último dia da sua assinatura do plano ${lawyer.plan_type}. Renove imediatamente para garantir seu acesso.`;
      }

      // Inserir notificação no banco de dados
      const nowStr = new Date().toISOString();
      const { error: insertError } = await db.from("notificacoes").insert([{
        id: crypto.randomUUID(),
        user_id: lawyer.id,
        titulo: title,
        mensagem: message,
        tipo: "PLANO_EXPIRANDO",
        meta: JSON.stringify({ days_remaining: daysRemaining }),
        lida: false,
        created_at: nowStr
      }]);

      if (insertError) {
        console.error(`[cron/verificar-planos] Erro ao criar notificação de banco para ${lawyer.id}:`, insertError);
        continue;
      }

      // Enviar notificação push
      await sendPushNotification({
        userIds: [lawyer.id],
        title: title,
        message: message,
        url: "/dashboard/advogado"
      });

      notifiedCount++;
      console.log(`[cron/verificar-planos] Advogado ${lawyer.name} (${lawyer.id}) notificado com sucesso: ${daysRemaining} dia(s) restante(s).`);
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      notified: notifiedCount,
      message: "Verificação de expiração concluída com sucesso."
    });

  } catch (error) {
    console.error("Erro na API GET /api/cron/verificar-planos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
