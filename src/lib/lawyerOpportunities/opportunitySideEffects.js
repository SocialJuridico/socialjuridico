import { randomUUID } from "node:crypto";

import { interesseCasoTemplate } from "@/lib/emailTemplates";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";

const EMAIL_MILESTONES = new Set([1, 3, 5, 7, 10, 15, 20, 25, 30]);

async function sendClientPush(transaction, lawyerName) {
  if (!transaction?.client_id) return;

  await sendPushNotification({
    userIds: [transaction.client_id],
    title: "Interesse no seu caso! ⚖️",
    message: `O advogado ${lawyerName} manifestou interesse no caso "${transaction.case_title || "Caso jurídico"}".`,
    url: "/dashboard/cliente",
  });
}

async function sendMilestoneEmail(db, transaction, lawyerName) {
  if (!transaction?.case_id || !transaction?.client_id) return;

  const { count, error: countError } = await db
    .from("case_interests")
    .select("id", { count: "exact", head: true })
    .eq("case_id", transaction.case_id)
    .in("status", ["PENDING", "NEGOTIATING"]);

  if (countError || !EMAIL_MILESTONES.has(count || 0)) return;

  const { data: client, error: clientError } = await db
    .from("clientes")
    .select("name, email")
    .eq("id", transaction.client_id)
    .maybeSingle();

  if (clientError || !client?.email) return;

  const trackingId = randomUUID();
  await db.from("email_tracking_logs").insert({
    id: trackingId,
    recipient_email: client.email,
    user_id: transaction.client_id,
    email_type: "INTERESSE",
    destination_url: "https://socialjuridico.com.br/dashboard/cliente",
    case_id: transaction.case_id,
    client_id: transaction.client_id,
    interested_count: count,
    sent_at: new Date().toISOString(),
  });

  const subject =
    count > 1
      ? `⚖️ ${count} advogados querem analisar seu caso "${transaction.case_title || "Caso jurídico"}"`
      : `⚖️ Um advogado quer analisar seu caso "${transaction.case_title || "Caso jurídico"}"`;

  await resend.emails.send({
    from: "Social Jurídico <contato@socialjuridico.com.br>",
    to: client.email,
    subject,
    html: interesseCasoTemplate({
      titulo: transaction.case_title || "Caso jurídico",
      clientName: client.name || "Cliente",
      interestedCount: count,
      lawyerName,
      trackId: trackingId,
    }),
  });
}

export async function runOpportunityInterestSideEffects({
  db,
  transaction,
  lawyerName,
}) {
  if (!transaction || transaction.already_processed) return;

  const safeLawyerName = lawyerName || "Um advogado";
  const tasks = [
    sendClientPush(transaction, safeLawyerName),
    sendMilestoneEmail(db, transaction, safeLawyerName),
    checkAndNotifyLowBalance(
      transaction.lawyer_id,
      transaction.previous_balance,
      transaction.new_balance,
    ),
  ];

  const results = await Promise.allSettled(tasks);
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `[Oportunidades][SideEffect:${index}] Falha não transacional:`,
        result.reason,
      );
    }
  });
}
