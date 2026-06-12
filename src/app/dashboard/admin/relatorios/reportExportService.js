import {
  formatNumber,
  formatReportDay,
  formatReportMonth,
  formatReportWeek,
  mergeReportData,
} from "../utils/reportFormatters";

const PAGE = {
  width: 210,
  left: 14,
  right: 196,
  footerY: 287,
};

const TABLE_HEAD_STYLES = {
  fillColor: [15, 19, 24],
  textColor: [212, 175, 55],
  fontStyle: "bold",
  fontSize: 8,
};

async function requestExport(options) {
  const response = await fetch("/api/admin/reports/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ options }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.message || "Não foi possível preparar o relatório.",
    );
  }

  return payload.data;
}

function drawHeader(document, report) {
  document.setFillColor(15, 19, 24);
  document.rect(0, 0, PAGE.width, 43, "F");
  document.setTextColor(212, 175, 55);
  document.setFont("helvetica", "bold");
  document.setFontSize(21);
  document.text("SOCIAL JURÍDICO", PAGE.left, 18);
  document.setTextColor(255, 255, 255);
  document.setFontSize(10);
  document.text("RELATÓRIO CONSOLIDADO DE USO E TELEMETRIA", PAGE.left, 27);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.text(
    `Período: últimos ${report.options.period} dias · Fuso: ${report.timezone}`,
    PAGE.left,
    34,
  );

  document.setTextColor(71, 85, 105);
  document.setFontSize(8);
  document.text(
    `Gerado por: ${report.generatedBy.name} (${report.generatedBy.email})`,
    PAGE.left,
    51,
  );
  document.text(
    `Emissão: ${new Date(report.generatedAt).toLocaleString("pt-BR")}`,
    PAGE.left,
    56,
  );
  document.text(
    report.export?.available
      ? `Registro de auditoria: ${report.export.id}`
      : "Registro de auditoria indisponível — migração pendente",
    PAGE.left,
    61,
  );
  document.setDrawColor(212, 175, 55);
  document.line(PAGE.left, 66, PAGE.right, 66);
}

function drawSummaryCards(document, report) {
  const cards = [["VISUALIZAÇÕES", formatNumber(report.summary.accesses)]];

  if (report.options.includeLawyers) {
    cards.push(["ADVOGADOS ÚNICOS", formatNumber(report.summary.lawyers)]);
  }
  if (report.options.includeClients) {
    cards.push(["CLIENTES ÚNICOS", formatNumber(report.summary.clients)]);
  }
  if (report.options.includeSatisfaction) {
    cards.push([
      "SATISFAÇÃO",
      `${Number(report.satisfaction.overallAvg || 0).toFixed(1)} / 5,0`,
    ]);
  }

  const gap = 5;
  const width = (182 - gap * (cards.length - 1)) / cards.length;

  cards.forEach(([label, value], index) => {
    const x = PAGE.left + index * (width + gap);
    document.setFillColor(246, 248, 250);
    document.setDrawColor(226, 232, 240);
    document.roundedRect(x, 73, width, 22, 2, 2, "FD");
    document.setTextColor(100, 116, 139);
    document.setFont("helvetica", "normal");
    document.setFontSize(7);
    document.text(label, x + 4, 80, { maxWidth: width - 8 });
    document.setTextColor(15, 19, 24);
    document.setFont("helvetica", "bold");
    document.setFontSize(12);
    document.text(String(value), x + 4, 89, { maxWidth: width - 8 });
  });
}

function createSeries(report, period, limit) {
  return mergeReportData({
    accesses: report.accesses?.[period] || [],
    lawyers: report.lawyers?.[period] || [],
    clients: report.clients?.[period] || [],
    limit,
  });
}

function renderSeriesTable({
  document,
  autoTable,
  title,
  label,
  rows,
  formatter,
  report,
  startY,
}) {
  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  document.setTextColor(15, 19, 24);
  document.text(title, PAGE.left, startY);

  const head = [label, "Visualizações"];
  if (report.options.includeLawyers) head.push("Advogados únicos");
  if (report.options.includeClients) head.push("Clientes únicos");

  const body = rows.map((item) => {
    const row = [formatter(item.date), formatNumber(item.accesses)];
    if (report.options.includeLawyers) row.push(formatNumber(item.lawyers));
    if (report.options.includeClients) row.push(formatNumber(item.clients));
    return row;
  });

  autoTable(document, {
    startY: startY + 4,
    head: [head],
    body,
    theme: "striped",
    headStyles: TABLE_HEAD_STYLES,
    bodyStyles: { fontSize: 7.7 },
    margin: { left: PAGE.left, right: PAGE.left },
  });

  return document.lastAutoTable?.finalY || startY + 24;
}

function renderHomeConversion(document, autoTable, report, startY) {
  const conversion = report.homeConversion;
  if (!conversion) return startY;

  let titleY = startY + 12;
  if (titleY > 245) {
    document.addPage();
    titleY = 24;
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  document.setTextColor(15, 19, 24);
  document.text("Interações da home", PAGE.left, titleY);

  const summary = conversion.summary || {};
  autoTable(document, {
    startY: titleY + 4,
    head: [["Indicador", "Resultado"]],
    body: [
      ["Visualizações da home", formatNumber(summary.homeViews)],
      ["Cliques no CTA para clientes", formatNumber(summary.clientClicks)],
      ["Cliques no CTA para advogados", formatNumber(summary.lawyerClicks)],
      [
        "Taxa de interação",
        `${Number(summary.interactionRate || 0).toFixed(1)}%`,
      ],
    ],
    theme: "grid",
    headStyles: TABLE_HEAD_STYLES,
    bodyStyles: { fontSize: 7.7 },
    margin: { left: PAGE.left, right: PAGE.left },
  });

  let endY = document.lastAutoTable?.finalY || titleY + 30;
  const dailyRows = (conversion.daily || []).map((item) => [
    formatReportDay(item.date),
    formatNumber(item.homeViews),
    formatNumber(item.clientClicks),
    formatNumber(item.lawyerClicks),
    formatNumber(item.totalClicks),
  ]);

  autoTable(document, {
    startY: endY + 7,
    head: [
      [
        "Data",
        "Visualizações",
        "CTA clientes",
        "CTA advogados",
        "Total",
      ],
    ],
    body: dailyRows.length
      ? dailyRows
      : [["Sem eventos", "0", "0", "0", "0"]],
    theme: "striped",
    headStyles: TABLE_HEAD_STYLES,
    bodyStyles: { fontSize: 7.4 },
    margin: { left: PAGE.left, right: PAGE.left },
  });

  endY = document.lastAutoTable?.finalY || endY + 24;
  document.setFont("helvetica", "normal");
  document.setFontSize(6.8);
  document.setTextColor(100, 116, 139);
  document.text(
    conversion.available
      ? "Eventos agregados. Os cliques não representam pessoas únicas nem cadastros concluídos."
      : "Eventos históricos indisponíveis: a migração de armazenamento ainda não estava ativa.",
    PAGE.left,
    endY + 5,
  );

  return endY + 5;
}

function renderComplementary(document, autoTable, report, startY) {
  const rows = [];

  if (report.options.includeDbTotals) {
    if (report.options.includeLawyers) {
      rows.push(["Advogados cadastrados", formatNumber(report.totals.lawyers)]);
    }
    if (report.options.includeClients) {
      rows.push(["Clientes cadastrados", formatNumber(report.totals.clients)]);
    }
  }

  if (report.options.includeSatisfaction) {
    rows.push([
      "Pesquisas de satisfação",
      formatNumber(report.satisfaction.totalSurveys),
    ]);
    rows.push([
      "Média geral de satisfação",
      `${Number(report.satisfaction.overallAvg || 0).toFixed(1)} / 5,0`,
    ]);
  }

  if (report.options.includePremiumUsage) {
    rows.push([
      "Redator IA — usos",
      formatNumber(report.premiumUsageSummary.redator.total),
    ]);
    rows.push([
      "Triagem IA — usos",
      formatNumber(report.premiumUsageSummary.triagem.total),
    ]);
    rows.push([
      "Agenda — registros",
      formatNumber(report.premiumUsageSummary.agenda.total),
    ]);
    rows.push([
      "Armazenamento utilizado",
      `${formatNumber(report.premiumUsageSummary.storage.total)} MB`,
    ]);
  }

  if (!rows.length) return startY;

  let titleY = startY;
  if (titleY > 250) {
    document.addPage();
    titleY = 24;
  }

  document.setFont("helvetica", "bold");
  document.setFontSize(10.5);
  document.setTextColor(15, 19, 24);
  document.text("Indicadores complementares", PAGE.left, titleY);

  autoTable(document, {
    startY: titleY + 4,
    head: [["Indicador", "Valor"]],
    body: rows,
    theme: "grid",
    headStyles: TABLE_HEAD_STYLES,
    bodyStyles: { fontSize: 7.7 },
    margin: { left: PAGE.left, right: PAGE.left },
  });

  return document.lastAutoTable?.finalY || titleY + 24;
}

function drawClosure(document, startY) {
  let y = startY + 12;
  if (y > 245) {
    document.addPage();
    y = 24;
  }

  document.setFillColor(248, 250, 252);
  document.setDrawColor(226, 232, 240);
  document.roundedRect(PAGE.left, y, 182, 29, 2, 2, "FD");
  document.setTextColor(71, 85, 105);
  document.setFont("helvetica", "bold");
  document.setFontSize(7.5);
  document.text("AUDITORIA E PRIVACIDADE", 18, y + 6);
  document.setFont("helvetica", "normal");
  document.setFontSize(7);
  document.text(
    document.splitTextToSize(
      "Documento administrativo gerado com métricas agregadas. Nenhum endereço IP, agente de usuário ou registro bruto de navegação é incluído no arquivo. O conteúdo deve ser tratado como confidencial e utilizado exclusivamente para governança interna.",
      174,
    ),
    18,
    y + 12,
  );
}

function applyFooters(document) {
  const pages = document.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setTextColor(148, 163, 184);
    document.setFontSize(7);
    document.text(
      "Social Jurídico — Relatórios administrativos",
      PAGE.left,
      PAGE.footerY,
    );
    document.text(`Página ${page} de ${pages}`, PAGE.right, PAGE.footerY, {
      align: "right",
    });
  }
}

export async function generateAdminUsageReport({ options, onRenderStart }) {
  const payload = await requestExport(options);
  const report = payload.report;

  onRenderStart?.(payload.auditAvailable);

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const document = new jsPDF();

  document.setProperties({
    title: "Relatório de uso e telemetria — Social Jurídico",
    subject: "Relatório administrativo agregado",
    author: report.generatedBy.name,
    creator: "Social Jurídico",
  });

  drawHeader(document, report);
  drawSummaryCards(document, report);

  const dailyEnd = renderSeriesTable({
    document,
    autoTable,
    title: `Atividade diária — últimos ${report.options.period} dias`,
    label: "Data",
    rows: createSeries(report, "daily", report.options.period),
    formatter: formatReportDay,
    report,
    startY: 104,
  });

  let endY = renderHomeConversion(
    document,
    autoTable,
    report,
    dailyEnd,
  );

  if (report.options.period === 30) {
    document.addPage();
    endY = renderSeriesTable({
      document,
      autoTable,
      title: "Atividade semanal — últimas 4 semanas",
      label: "Semana",
      rows: createSeries(report, "weekly", 4),
      formatter: formatReportWeek,
      report,
      startY: 24,
    });
    endY = renderSeriesTable({
      document,
      autoTable,
      title: "Atividade mensal — últimos 6 meses",
      label: "Mês",
      rows: createSeries(report, "monthly", 6),
      formatter: formatReportMonth,
      report,
      startY: endY + 12,
    });
  }

  endY = renderComplementary(document, autoTable, report, endY + 12);
  drawClosure(document, endY);
  applyFooters(document);
  document.save(report.export?.fileName || "relatorio_uso_socialjuridico.pdf");

  return {
    auditAvailable: payload.auditAvailable,
    auditId: report.export?.id || null,
    fileName: report.export?.fileName || null,
  };
}
