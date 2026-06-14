function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "medium",
  }).format(date);
}

function sanitizeFileName(value) {
  return String(value || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "documento";
}

export function getDocumentProtectionProtocol(record) {
  if (record?.protocol) return record.protocol;
  const compactId = String(record?.id || "REGISTRO")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 20)
    .toUpperCase();
  return `${record?.legacy ? "SJ-BLD-LEG" : "SJ-BLD"}-${compactId}`;
}

export async function downloadDocumentProtectionCertificate(record) {
  if (!record?.id || !record?.hash) {
    throw new Error("Este registro não possui dados suficientes para o certificado.");
  }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const protocol = getDocumentProtectionProtocol(record);
  const protectedAt = record.protectedAt || record.createdAt;

  pdf.setProperties({
    title: `Certificado de Blindagem - ${protocol}`,
    subject: "Registro técnico de integridade documental",
    author: "Social Jurídico",
    creator: "Social Jurídico",
  });

  pdf.setFillColor(10, 10, 12);
  pdf.rect(0, 0, 210, 42, "F");
  pdf.setTextColor(212, 175, 55);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("SOCIAL JURÍDICO", 18, 16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(21);
  pdf.text("Certificado Técnico de Blindagem", 18, 29);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(215, 215, 220);
  pdf.text("Registro de integridade e rastreabilidade documental", 18, 36);

  pdf.setTextColor(24, 24, 27);
  pdf.setDrawColor(212, 175, 55);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(18, 52, 174, 24, 3, 3);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("PROTOCOLO DE BLINDAGEM", 24, 61);
  pdf.setFontSize(15);
  pdf.text(protocol, 24, 70);

  const rows = [
    ["Documento", record.fileName || "Documento"],
    ["Categoria", record.documentType || "Outros"],
    ["Responsável", record.lawyerName || "Advogado"],
    ["Cliente vinculado", record.clientName || "Documento avulso"],
    ["Data da blindagem", formatDate(protectedAt)],
    ["Origem do registro", record.legacy ? "Módulo legado" : "Módulo atual"],
    ["Identificador interno", String(record.id)],
    ["Algoritmo", record.hashAlgorithm || "SHA-512"],
  ];

  let y = 88;
  pdf.setFontSize(9);
  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(90, 90, 98);
    pdf.text(label.toUpperCase(), 18, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(24, 24, 27);
    const lines = pdf.splitTextToSize(String(value), 118);
    pdf.text(lines, 70, y);
    y += Math.max(9, lines.length * 5.2);
  }

  y += 4;
  pdf.setFillColor(247, 244, 232);
  pdf.setDrawColor(212, 175, 55);
  pdf.roundedRect(18, y, 174, 45, 3, 3, "FD");
  pdf.setTextColor(90, 72, 25);
  pdf.setFont("helvetica", "bold");
  pdf.text("HASH SHA-512", 24, y + 10);
  pdf.setFont("courier", "normal");
  pdf.setFontSize(7.5);
  pdf.text(pdf.splitTextToSize(record.hash, 160), 24, y + 18);

  y += 57;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(24, 24, 27);
  pdf.text("Como validar a integridade", 18, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(75, 75, 82);
  pdf.text(
    pdf.splitTextToSize(
      "Calcule o SHA-512 do arquivo original e compare o resultado com o hash registrado neste certificado. A igualdade integral demonstra que o conteúdo permanece inalterado desde o registro.",
      174,
    ),
    18,
    y + 7,
  );

  y += 30;
  pdf.setDrawColor(220, 220, 224);
  pdf.line(18, y, 192, y);
  pdf.setFontSize(8);
  pdf.setTextColor(105, 105, 112);
  pdf.text(
    pdf.splitTextToSize(
      "Este certificado registra evidência técnica de integridade e rastreabilidade. Não substitui reconhecimento cartorial, assinatura digital qualificada ou perícia quando exigidos.",
      174,
    ),
    18,
    y + 8,
  );
  pdf.text(`Gerado em ${formatDate(new Date().toISOString())}.`, 18, 282);
  pdf.text("www.socialjuridico.com.br", 192, 282, { align: "right" });

  pdf.save(
    `certificado-blindagem-${sanitizeFileName(protocol)}-${sanitizeFileName(record.fileName)}.pdf`,
  );
}
