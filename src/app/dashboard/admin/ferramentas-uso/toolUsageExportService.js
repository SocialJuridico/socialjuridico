const GOLD = [212, 175, 55];
const DARK = [15, 19, 24];

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}

function formatDateTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatRange(range) {
  const fmt = (iso) =>
    iso ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(iso)) : null;
  const from = fmt(range?.from);
  const to = fmt(range?.to);
  if (from && to) return `Período: ${from} a ${to}`;
  if (from) return `Período: a partir de ${from}`;
  if (to) return `Período: até ${to}`;
  return "Período: todo o histórico";
}

export async function exportToolUsagePdf(report) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setProperties({
    title: "Métricas de uso de ferramentas — Social Jurídico",
    subject: "Relatório administrativo de uso de ferramentas",
    creator: "Social Jurídico",
  });

  // Cabeçalho
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.setFontSize(15);
  doc.text("⚖ Social Jurídico", 14, 12);
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Métricas de uso de ferramentas", 14, 19);
  doc.setFontSize(8);
  doc.setTextColor(170, 170, 170);
  doc.text(formatRange(report.range), 14, 25);
  doc.text(`Gerado em ${formatDateTime(report.generatedAt)}`, pageWidth - 14, 25, {
    align: "right",
  });

  // Resumo: total por ferramenta
  autoTable(doc, {
    startY: 34,
    head: [["Ferramenta", "Total de usos"]],
    body: report.tools.map((tool) => [tool.label, formatNumber(tool.total)]),
    foot: [["Total geral", formatNumber(report.grandTotal)]],
    theme: "grid",
    headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold", fontSize: 9 },
    footStyles: { fillColor: [30, 30, 30], textColor: GOLD, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    margin: { left: 14, right: 14 },
  });

  let y = doc.lastAutoTable.finalY + 10;

  // Detalhamento por ferramenta: quem usou e quantas vezes
  for (const tool of report.tools) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text(`${tool.label} — ${formatNumber(tool.total)} uso(s)`, 14, y);
    y += 3;

    const body = tool.byUser.length
      ? tool.byUser.map((user) => [user.name, user.email, formatNumber(user.count)])
      : [["Sem uso no período", "—", "0"]];

    autoTable(doc, {
      startY: y,
      head: [["Advogado / Usuário", "E-mail", "Qtd"]],
      body,
      theme: "striped",
      headStyles: { fillColor: DARK, textColor: GOLD, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { halign: "right", cellWidth: 20 } },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // Rodapés
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text("Social Jurídico — relatório confidencial", 14, 290);
    doc.text(`Página ${i} de ${pages}`, pageWidth - 14, 290, { align: "right" });
  }

  const fileName = `metricas_ferramentas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}
