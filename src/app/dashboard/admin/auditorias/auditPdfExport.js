function statusLabel(status) {
  if (status === "passed") return "Aprovado";
  if (status === "failed") return "Falhou";
  if (status === "warning") return "Atencao";
  return "Evidencia externa";
}

function split(document, text, width) {
  return document.splitTextToSize(String(text || ""), width);
}

function ensureSpace(document, y, needed = 26) {
  if (y + needed < 280) return y;
  document.addPage();
  return 22;
}

export async function exportAuditReportPdf(report) {
  const { default: jsPDF } = await import("jspdf");
  const document = new jsPDF();
  const left = 14;
  const right = 196;
  let y = 18;

  document.setProperties({
    title: `Auditoria - ${report.audit.title}`,
    subject: "Relatorio interno de auditoria",
    author: report.generatedBy.name,
    creator: "Social Juridico",
  });

  document.setFillColor(15, 19, 24);
  document.rect(0, 0, 210, 42, "F");
  document.setTextColor(212, 175, 55);
  document.setFont("helvetica", "bold");
  document.setFontSize(18);
  document.text("SOCIAL JURIDICO", left, y);
  y += 8;
  document.setTextColor(255, 255, 255);
  document.setFontSize(10);
  document.text("RELATORIO INTERNO DE AUDITORIA", left, y);
  y = 52;

  document.setTextColor(15, 19, 24);
  document.setFontSize(14);
  document.text(report.audit.title, left, y);
  y += 8;
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setTextColor(71, 85, 105);
  document.text(`Framework: ${report.audit.framework}`, left, y);
  document.text(`Pontuacao: ${report.summary.score}%`, 120, y);
  y += 5;
  document.text(`Gerado em: ${new Date(report.generatedAt).toLocaleString("pt-BR")}`, left, y);
  y += 5;
  document.text(`Administrador: ${report.generatedBy.name} (${report.generatedBy.email})`, left, y);
  y += 10;

  document.setDrawColor(212, 175, 55);
  document.line(left, y, right, y);
  y += 9;

  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.setTextColor(15, 19, 24);
  document.text("Resumo", left, y);
  y += 6;
  document.setFont("helvetica", "normal");
  document.setFontSize(8.3);
  document.text(
    `Aprovados: ${report.summary.passed} | Atencao: ${report.summary.warnings} | Falhas: ${report.summary.failed} | Evidencias externas: ${report.summary.manual}`,
    left,
    y,
  );
  y += 11;

  report.results.forEach((item, index) => {
    y = ensureSpace(document, y, 42);
    document.setFillColor(248, 250, 252);
    document.setDrawColor(226, 232, 240);
    document.roundedRect(left, y, right - left, 34, 2, 2, "FD");

    document.setFont("helvetica", "bold");
    document.setFontSize(8.8);
    document.setTextColor(15, 19, 24);
    document.text(`${index + 1}. ${item.title}`, left + 4, y + 6);

    document.setTextColor(
      item.status === "passed" ? 22 : item.status === "failed" ? 185 : 146,
      item.status === "passed" ? 101 : item.status === "failed" ? 28 : 64,
      item.status === "passed" ? 52 : item.status === "failed" ? 28 : 14,
    );
    document.text(statusLabel(item.status), right - 4, y + 6, { align: "right" });

    document.setTextColor(71, 85, 105);
    document.setFont("helvetica", "normal");
    document.setFontSize(7.4);
    document.text(split(document, `Evidencia: ${item.evidence}`, 170), left + 4, y + 13);
    document.text(split(document, `Recomendacao: ${item.recommendation || "Sem acao adicional."}`, 170), left + 4, y + 24);
    y += 40;
  });

  y = ensureSpace(document, y, 38);
  document.setFont("helvetica", "bold");
  document.setTextColor(15, 19, 24);
  document.setFontSize(9);
  document.text("Observacao de governanca", left, y);
  y += 6;
  document.setFont("helvetica", "normal");
  document.setTextColor(71, 85, 105);
  document.setFontSize(7.5);
  document.text(
    split(
      document,
      "Este documento e uma auditoria interna automatizada. Controles classificados como evidencia externa precisam ser anexados por print, PDF ou exportacao do fornecedor. O relatorio nao substitui certificacao emitida por auditor independente.",
      180,
    ),
    left,
    y,
  );

  const pages = document.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setTextColor(148, 163, 184);
    document.setFontSize(7);
    document.text("Social Juridico - Auditorias internas", left, 287);
    document.text(`Pagina ${page} de ${pages}`, right, 287, { align: "right" });
  }

  const safeName = report.audit.id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  document.save(`auditoria-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
