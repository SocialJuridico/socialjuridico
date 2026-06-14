function formatDate(value) {
  if (!value) return "Não registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date);
}

function sanitizeFileName(value) {
  return String(value || "notificacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "notificacao";
}

function addField(pdf, label, value, y) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(105, 105, 112);
  pdf.text(label.toUpperCase(), 18, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(24, 24, 27);
  const lines = pdf.splitTextToSize(String(value || "Não registrado"), 118);
  pdf.text(lines, 70, y);
  return y + Math.max(9, lines.length * 5.2);
}

export async function downloadNotificationCertificate(notification) {
  if (!notification?.id || !notification?.protocol || !notification?.hash) {
    throw new Error(
      "A notificação não possui todos os dados necessários para o certificado.",
    );
  }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const isRead = notification.status === "lido";

  pdf.setProperties({
    title: `Certificado de Notificação - ${notification.protocol}`,
    subject: "Rastreabilidade de notificação extrajudicial digital",
    author: "Social Jurídico",
    creator: "Social Jurídico",
  });

  pdf.setFillColor(9, 10, 13);
  pdf.rect(0, 0, 210, 46, "F");
  pdf.setTextColor(230, 189, 72);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("SOCIAL JURÍDICO", 18, 15);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text("Certificado de Rastreabilidade", 18, 29);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(205, 205, 212);
  pdf.text("Notificação Extrajudicial Digital Blindada", 18, 37);

  pdf.setDrawColor(230, 189, 72);
  pdf.setLineWidth(0.6);
  pdf.roundedRect(18, 55, 174, 27, 3, 3);
  pdf.setTextColor(95, 75, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("PROTOCOLO DE ENVIO", 24, 65);
  pdf.setTextColor(24, 24, 27);
  pdf.setFontSize(16);
  pdf.text(notification.protocol, 24, 75);

  pdf.setFillColor(isRead ? 233 : 247, isRead ? 248 : 244, isRead ? 239 : 232);
  pdf.setDrawColor(isRead ? 34 : 230, isRead ? 197 : 189, isRead ? 94 : 72);
  pdf.roundedRect(145, 61, 39, 14, 3, 3, "FD");
  pdf.setFontSize(8);
  pdf.setTextColor(isRead ? 21 : 95, isRead ? 128 : 75, isRead ? 61 : 20);
  pdf.text(isRead ? "CIÊNCIA REGISTRADA" : "AGUARDANDO CIÊNCIA", 164.5, 69.5, {
    align: "center",
  });

  let y = 96;
  y = addField(pdf, "Destinatário", notification.recipientEmail, y);
  y = addField(pdf, "Documento", notification.fileName, y);
  y = addField(pdf, "Responsável", notification.lawyerName, y);
  y = addField(pdf, "Cliente vinculado", notification.clientName, y);
  y = addField(pdf, "Enviado em", formatDate(notification.createdAt), y);
  y = addField(pdf, "Primeira leitura", formatDate(notification.readAt), y);
  y = addField(pdf, "IP da leitura", notification.readIp, y);
  y = addField(pdf, "Geolocalização", notification.readGeo, y);
  y = addField(pdf, "Navegador da leitura", notification.readUserAgent, y);

  y += 3;
  pdf.setFillColor(247, 244, 232);
  pdf.setDrawColor(230, 189, 72);
  pdf.roundedRect(18, y, 174, 45, 3, 3, "FD");
  pdf.setTextColor(95, 75, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text("HASH CRIPTOGRÁFICO SHA-512 DO DOCUMENTO", 24, y + 10);
  pdf.setFont("courier", "normal");
  pdf.setFontSize(7.2);
  pdf.text(pdf.splitTextToSize(notification.hash, 160), 24, y + 18);

  y += 58;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(24, 24, 27);
  pdf.text("Evidências registradas", 18, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.8);
  pdf.setTextColor(75, 75, 82);
  const evidenceText = isRead
    ? "O link exclusivo foi acessado pelo destinatário. A plataforma registrou data, horário, endereço IP, agente do navegador e, quando autorizada, geolocalização do dispositivo."
    : "O envio foi registrado e o link exclusivo permanece disponível ao destinatário. Até a emissão deste certificado, a plataforma ainda não registrou a primeira leitura.";
  pdf.text(pdf.splitTextToSize(evidenceText, 174), 18, y + 7);

  y += 29;
  pdf.setDrawColor(220, 220, 224);
  pdf.line(18, y, 192, y);
  pdf.setFontSize(7.8);
  pdf.setTextColor(105, 105, 112);
  pdf.text(
    pdf.splitTextToSize(
      "Este certificado consolida evidências técnicas de envio, integridade e acesso. Sua força probatória deve ser analisada em conjunto com os demais elementos do caso e com a legislação aplicável.",
      174,
    ),
    18,
    y + 8,
  );

  pdf.text(`Emitido em ${formatDate(new Date().toISOString())}.`, 18, 283);
  pdf.text("www.socialjuridico.com.br", 192, 283, { align: "right" });

  pdf.save(
    `certificado-notificacao-${sanitizeFileName(notification.protocol)}.pdf`,
  );
}
