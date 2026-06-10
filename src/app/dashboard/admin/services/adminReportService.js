import {
  formatNumber,
  formatReportDay,
  formatReportMonth,
  formatReportWeek,
  mergeReportData,
  sumLastPeriod,
} from "../utils/reportFormatters";

const PAGE = {
  width: 210,
  footerY: 287,
  left: 14,
  right: 196,
};

const TABLE_STYLES = {
  theme: "striped",
  headStyles: {
    fillColor: [15, 19, 24],
    textColor: [212, 175, 55],
    fontStyle: "bold",
    fontSize: 9,
  },
  bodyStyles: { fontSize: 8.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: PAGE.left, right: PAGE.left },
};

async function fetchReportData() {
  const response = await fetch("/api/admin/reports/usage", {
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.success) {
    throw new Error(
      json?.message || "Erro ao buscar dados do relatório.",
    );
  }

  return json.data;
}

function drawMiniHeader(document) {
  document.setFillColor(15, 19, 24);
  document.rect(0, 0, PAGE.width, 12, "F");
  document.setTextColor(212, 175, 55);
  document.setFont("helvetica", "bold");
  document.setFontSize(8);
  document.text(
    "SOCIAL JURÍDICO — RELATÓRIO DE TELEMETRIA E USO",
    PAGE.left,
    8,
  );
}

function renderReportHeader({ document, admin, options }) {
  document.setFillColor(15, 19, 24);
  document.rect(0, 0, PAGE.width, 40, "F");

  document.setTextColor(212, 175, 55);
  document.setFont("helvetica", "bold");
  document.setFontSize(22);
  document.text("SOCIAL JURÍDICO", PAGE.left, 20);

  document.setTextColor(255, 255, 255);
  document.setFont("helvetica", "normal");
  document.setFontSize(10);
  document.text(
    "RELATÓRIO CONSOLIDADO DE TELEMETRIA E USO",
    PAGE.left,
    28,
  );
  document.text(
    "AUDITORIA ADMINISTRATIVA E ACESSOS DE USUÁRIOS",
    PAGE.left,
    33,
  );

  document.setTextColor(71, 85, 105);
  document.setFontSize(9);
  document.text(
    `Gerado por: ${admin?.name || "Administrador"}`,
    PAGE.left,
    50,
  );
  document.text(`E-mail: ${admin?.email || ""}`, PAGE.left, 55);
  document.text(
    `Data de emissão: ${new Date().toLocaleString("pt-BR")}`,
    PAGE.left,
    60,
  );

  const audiences = [];
  if (options.includeLawyers) audiences.push("ADVOGADOS");
  if (options.includeClients) audiences.push("CLIENTES");

  document.text(
    `Classificação: CONFIDENCIAL / USO ADMINISTRATIVO RESTRITO — Público: ${audiences.join(
      " e ",
    )}`,
    PAGE.left,
    65,
  );

  document.setDrawColor(212, 175, 55);
  document.setLineWidth(0.75);
  document.line(PAGE.left, 70, PAGE.right, 70);
}

function drawCards({ document, cards, startY }) {
  if (!cards.length) return startY;

  const availableWidth = 182;
  const gap = cards.length > 1 ? 7 : 0;
  const cardWidth =
    (availableWidth - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, index) => {
    const cardX = PAGE.left + index * (cardWidth + gap);

    document.setFillColor(245, 247, 250);
    document.setDrawColor(226, 232, 240);
    document.roundedRect(cardX, startY, cardWidth, 22, 2, 2, "FD");

    document.setFont("helvetica", "normal");
    document.setFontSize(7.4);
    document.setTextColor(100, 116, 139);
    document.text(card.title, cardX + 4, startY + 7, {
      maxWidth: cardWidth - 8,
    });

    document.setFont("helvetica", "bold");
    document.setFontSize(13);
    document.setTextColor(15, 19, 24);
    document.text(String(card.value), cardX + 4, startY + 16, {
      maxWidth: cardWidth - 8,
    });
  });

  return startY + 22;
}

function renderSummaryCards({
  document,
  reportData,
  options,
  summary,
}) {
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.setTextColor(15, 19, 24);
  document.text(
    `Resumo de atividade — últimos ${options.period} dias`,
    PAGE.left,
    78,
  );

  const mainCards = [
    { title: "ACESSOS TOTAIS", value: formatNumber(summary.accesses) },
  ];

  if (options.includeLawyers) {
    mainCards.push({
      title: "LOGINS DE ADVOGADOS",
      value: formatNumber(summary.lawyers),
    });
  }

  if (options.includeClients) {
    mainCards.push({
      title: "LOGINS DE CLIENTES",
      value: formatNumber(summary.clients),
    });
  }

  drawCards({ document, cards: mainCards, startY: 83 });

  const secondaryCards = [];

  if (options.includeDbTotals) {
    secondaryCards.push(
      {
        title: "TOTAL DE ADVOGADOS",
        value: formatNumber(reportData.totals?.lawyers),
      },
      {
        title: "TOTAL DE CLIENTES",
        value: formatNumber(reportData.totals?.clients),
      },
    );
  }

  if (options.includeSatisfaction) {
    secondaryCards.push(
      {
        title: "SATISFAÇÃO GERAL",
        value: `${Number(
          reportData.satisfaction?.overallAvg || 0,
        ).toFixed(1)} / 5,0`,
      },
      {
        title: "TOTAL DE AVALIAÇÕES",
        value: formatNumber(reportData.satisfaction?.totalSurveys),
      },
    );
  }

  if (!secondaryCards.length) return 116;

  drawCards({ document, cards: secondaryCards, startY: 112 });
  return 142;
}

function createAudienceTable({
  titleColumn,
  options,
  values,
  formatter,
}) {
  const headers = [titleColumn, "Acessos totais"];

  if (options.includeLawyers) headers.push("Advogados ativos");
  if (options.includeClients) headers.push("Clientes ativos");

  const body = values.map((item) => {
    const row = [formatter(item.date), formatNumber(item.accesses)];

    if (options.includeLawyers) row.push(formatNumber(item.lawyers));
    if (options.includeClients) row.push(formatNumber(item.clients));

    return row;
  });

  return { headers, body };
}

function renderAudienceTable({
  document,
  autoTable,
  title,
  titleColumn,
  options,
  values,
  formatter,
  startY,
}) {
  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.setTextColor(15, 19, 24);
  document.text(title, PAGE.left, startY);

  const { headers, body } = createAudienceTable({
    titleColumn,
    options,
    values,
    formatter,
  });

  autoTable(document, {
    ...TABLE_STYLES,
    startY: startY + 4,
    head: [headers],
    body,
  });

  return document.lastAutoTable?.finalY || startY + 20;
}

function renderDailyTable(args) {
  return renderAudienceTable({
    ...args,
    title: `1. Métricas diárias — últimos ${args.options.period} dias`,
    titleColumn: "Data",
    values: args.dailyData,
    formatter: formatReportDay,
  });
}

function renderWeeklyTable(args) {
  return renderAudienceTable({
    ...args,
    title: "2. Métricas semanais — últimas 4 semanas",
    titleColumn: "Semana",
    values: args.weeklyData,
    formatter: formatReportWeek,
  });
}

function renderMonthlyTable(args) {
  return renderAudienceTable({
    ...args,
    title: "3. Métricas mensais — últimos 6 meses",
    titleColumn: "Mês",
    values: args.monthlyData,
    formatter: formatReportMonth,
  });
}

function renderPremiumTable({
  document,
  autoTable,
  reportData,
  startY,
}) {
  const premium = reportData.premiumUsageSummary || {};
  const titleY = startY + 12;

  document.setFont("helvetica", "bold");
  document.setFontSize(11);
  document.setTextColor(15, 19, 24);
  document.text("4. Consumo de ferramentas premium", PAGE.left, titleY);

  const body = [
    [
      "Redator IA Jurídico",
      `${premium.redator?.total || 0} usos`,
      `${premium.redator?.avg || 0} por advogado`,
    ],
    [
      "Triagem IA e diagnóstico",
      `${premium.triagem?.total || 0} usos`,
      `${premium.triagem?.avg || 0} por advogado`,
    ],
    [
      "Agenda e prazos",
      `${premium.agenda?.total || 0} usos`,
      `${premium.agenda?.avg || 0} por advogado`,
    ],
    [
      "Armazenamento",
      `${premium.storage?.total || 0} MB`,
      `${premium.storage?.avg || 0} MB por advogado`,
    ],
  ];

  autoTable(document, {
    ...TABLE_STYLES,
    startY: titleY + 4,
    head: [["Ferramenta premium", "Consumo total", "Média"]],
    body,
  });

  return document.lastAutoTable?.finalY || titleY + 24;
}

function renderPrivacyNotice({ document, startY }) {
  let currentY = startY;

  if (currentY > 230) {
    document.addPage();
    drawMiniHeader(document);
    currentY = 24;
  }

  document.setFillColor(248, 250, 252);
  document.setDrawColor(226, 232, 240);
  document.roundedRect(PAGE.left, currentY, 182, 25, 1, 1, "FD");

  document.setFont("helvetica", "bold");
  document.setFontSize(8);
  document.setTextColor(71, 85, 105);
  document.text(
    "DECLARAÇÃO DE AUDITORIA E PRIVACIDADE",
    18,
    currentY + 5,
  );

  document.setFont("helvetica", "normal");
  document.setFontSize(7.2);
  document.setTextColor(100, 116, 139);

  const text =
    "Este relatório foi gerado automaticamente com base nos registros operacionais disponíveis na plataforma. Seu conteúdo é destinado ao uso administrativo interno e deve ser tratado de forma confidencial, em conformidade com as políticas de privacidade e proteção de dados do Social Jurídico.";

  document.text(document.splitTextToSize(text, 174), 18, currentY + 10);

  return currentY + 40;
}

function renderSignature({ document, admin, startY }) {
  document.setDrawColor(148, 163, 184);
  document.setLineWidth(0.5);
  document.line(65, startY, 145, startY);

  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(71, 85, 105);
  document.text(
    "Assinatura do Administrador Responsável",
    105,
    startY + 4,
    { align: "center" },
  );

  document.setFont("helvetica", "bold");
  document.text(admin?.name || "Administrador", 105, startY + 8, {
    align: "center",
  });
}

function renderFooter({ document, currentPage, totalPages }) {
  document.setFont("helvetica", "normal");
  document.setFontSize(7.5);
  document.setTextColor(148, 163, 184);
  document.text(
    "Plataforma Social Jurídico — Telemetria de uso",
    PAGE.left,
    PAGE.footerY,
  );
  document.text(
    `Página ${currentPage} de ${totalPages}`,
    PAGE.right,
    PAGE.footerY,
    { align: "right" },
  );
}

function renderDocumentClosure({ document, admin, startY }) {
  const privacyEndY = renderPrivacyNotice({
    document,
    startY: startY + 14,
  });

  renderSignature({
    document,
    admin,
    startY: privacyEndY,
  });
}

function renderSecondPage({
  document,
  autoTable,
  admin,
  reportData,
  options,
  weeklyData,
  monthlyData,
}) {
  document.addPage();
  drawMiniHeader(document);

  const weeklyEndY = renderWeeklyTable({
    document,
    autoTable,
    options,
    weeklyData,
    startY: 24,
  });

  const monthlyEndY = renderMonthlyTable({
    document,
    autoTable,
    options,
    monthlyData,
    startY: weeklyEndY + 12,
  });

  const premiumEndY = renderPremiumTable({
    document,
    autoTable,
    reportData,
    startY: monthlyEndY,
  });

  renderDocumentClosure({
    document,
    admin,
    startY: premiumEndY,
  });
}

function applyFooters(document) {
  const totalPages = document.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    renderFooter({ document, currentPage: page, totalPages });
  }
}

function renderReport({
  document,
  autoTable,
  admin,
  reportData,
  options,
  summary,
  dailyData,
  weeklyData,
  monthlyData,
}) {
  renderReportHeader({ document, admin, options });

  const summaryEndY = renderSummaryCards({
    document,
    reportData,
    options,
    summary,
  });

  const dailyEndY = renderDailyTable({
    document,
    autoTable,
    options,
    dailyData,
    startY: summaryEndY,
  });

  if (options.period === 30) {
    renderSecondPage({
      document,
      autoTable,
      admin,
      reportData,
      options,
      weeklyData,
      monthlyData,
    });
  } else {
    const premiumEndY = renderPremiumTable({
      document,
      autoTable,
      reportData,
      startY: dailyEndY,
    });

    renderDocumentClosure({
      document,
      admin,
      startY: premiumEndY,
    });
  }

  applyFooters(document);
}

export async function generateAdminUsageReport({
  admin,
  options,
  onRenderStart,
}) {
  const reportData = await fetchReportData();

  onRenderStart?.();

  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const document = new jsPDF();

  const dailyData = mergeReportData({
    accesses: reportData.accesses?.daily || [],
    lawyers: reportData.lawyers?.daily || [],
    clients: reportData.clients?.daily || [],
    limit: options.period,
  });

  const weeklyData = mergeReportData({
    accesses: reportData.accesses?.weekly || [],
    lawyers: reportData.lawyers?.weekly || [],
    clients: reportData.clients?.weekly || [],
    limit: 4,
  });

  const monthlyData = mergeReportData({
    accesses: reportData.accesses?.monthly || [],
    lawyers: reportData.lawyers?.monthly || [],
    clients: reportData.clients?.monthly || [],
    limit: 6,
  });

  const summary = {
    accesses: sumLastPeriod(
      reportData.accesses?.daily || [],
      options.period,
    ),
    lawyers: sumLastPeriod(
      reportData.lawyers?.daily || [],
      options.period,
    ),
    clients: sumLastPeriod(
      reportData.clients?.daily || [],
      options.period,
    ),
  };

  renderReport({
    document,
    autoTable,
    admin,
    reportData,
    options,
    summary,
    dailyData,
    weeklyData,
    monthlyData,
  });

  const currentDate = new Date().toISOString().slice(0, 10);
  document.save(`relatorio_uso_socialjuridico_${currentDate}.pdf`);
}
