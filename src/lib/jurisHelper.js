import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { sendPushNotification } from "@/lib/pushNotifications";

export async function checkAndNotifyLowBalance(lawyerId, oldBalance, newBalance) {
  // Dispara apenas se o saldo passou do limite de segurança (acima de 3 para estritamente abaixo de 3)
  if (newBalance < 3 && oldBalance >= 3) {
    try {
      // 1. Obter dados do advogado
      const { data: lawyer } = await supabaseAdmin
        .from("advogados")
        .select("name, email")
        .eq("id", lawyerId)
        .single();

      if (!lawyer) return;

      // 2. Enviar Push Notification
      await sendPushNotification({
        userIds: [lawyerId],
        title: "⚠️ Alerta de Juris Baixo",
        message: `Seu saldo atual é de apenas ${newBalance} Juris. Recarregue agora para não perder novas oportunidades.`,
        url: "/dashboard/advogado",
      });

      // 3. Enviar E-mail
      if (lawyer.email) {
        await resend.emails.send({
          from: "SocialJurídico <contato@socialjuridico.com.br>",
          to: lawyer.email,
          subject: "⚠️ Atenção: Seu saldo de Juris está acabando!",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #eab308;">Atenção, ${lawyer.name || 'Advogado(a)'}! ⚠️</h2>
              <p style="font-size: 16px;">Notamos que o seu saldo de <strong>Juris</strong> chegou a um nível crítico.</p>
              
              <div style="background-color: #fef9c3; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308; text-align: center;">
                <p style="margin: 0; font-size: 18px;">Seu saldo atual é de:</p>
                <h1 style="margin: 10px 0; font-size: 36px; color: #ca8a04;">${newBalance} Juris</h1>
              </div>

              <p style="font-size: 16px;">Com um saldo tão baixo, você pode acabar perdendo a chance de enviar propostas em casos muito promissores, pois novos atendimentos e negociações exigem Juris disponíveis na sua conta.</p>
              <p style="font-size: 16px;">Não deixe os melhores casos passarem para a concorrência!</p>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://socialjuridico.com.br/dashboard/advogado" style="display: inline-block; padding: 14px 28px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Recarregar Juris Agora</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="color: #0f172a; margin-top: 0;">💡 Dica para não ficar sem saldo:</h3>
                <p style="font-size: 15px; color: #334155; line-height: 1.5;">Você sabia que assinando um de nossos planos você recebe uma <strong>recarga automática de Juris todos os meses</strong>? Além disso, você desbloqueia ferramentas exclusivas como a Inteligência Artificial e ganha destaque nas buscas!</p>
                <ul style="font-size: 15px; color: #334155; padding-left: 20px; line-height: 1.6;">
                  <li><strong>Plano START:</strong> Ganhe <strong>7 Juris</strong> todo mês + CRM de Clientes.</li>
                  <li><strong>Plano PRO:</strong> Ganhe <strong>20 Juris</strong> todo mês + Selo PRO + Acesso Ilimitado.</li>
                </ul>
                <p style="text-align: center; margin-top: 20px; margin-bottom: 0;">
                  <a href="https://socialjuridico.com.br/dashboard/advogado" style="color: #2563eb; font-weight: bold; text-decoration: underline; font-size: 15px;">Conhecer os Planos Mensais</a>
                </p>
              </div>
            </div>
          `,
        });
        console.log(`⚠️ Email de alerta de Juris baixo enviado para ${lawyer.email}`);
      }
    } catch (err) {
      console.error("Erro ao enviar alerta de estoque baixo de Juris:", err);
    }
  }
}
