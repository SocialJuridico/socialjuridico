import { formatDate, formatOabDisplay, getOabStatus } from "../utils/lawyerFormatters";

export async function generateLawyersReport(lawyers) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const document = new jsPDF();

  document.setFillColor(13, 15, 18);
  document.rect(0, 0, 210, 34, "F");
  document.setFillColor(212, 175, 55);
  document.rect(0, 34, 210, 1.5, "F");

  document.setTextColor(212, 175, 55);
  document.setFont("helvetica", "bold");
  document.setFontSize(21);
  document.text("SOCIAL JURIDICO", 15, 18);

  document.setTextColor(255, 255, 255);
  document.setFontSize(10);
  document.setFont("helvetica", "normal");
  document.text("RELATORIO ADMINISTRATIVO DE ADVOGADOS", 15, 25);

  const verified = lawyers.filter(
    (lawyer) => lawyer.oab_verification_status === "VERIFIED",
  ).length;
  const pending = lawyers.filter(
    (lawyer) =>
      !lawyer.oab_verification_status ||
      lawyer.oab_verification_status === "PENDING",
  ).length;
  const errors = lawyers.filter(
    (lawyer) => lawyer.oab_verification_status === "ERROR",
  ).length;

  const cards = [
    ["TOTAL", lawyers.length],
    ["OAB OK", verified],
    ["PENDENTES", pending],
    ["COM ERRO", errors],
  ];

  cards.forEach(([label, value], index) => {
    const x = 15 + index * 48;
    document.setDrawColor(226, 232, 240);
    document.setFillColor(248, 250, 252);
    document.roundedRect(x, 45, 43, 20, 2, 2, "FD");
    document.setTextColor(100, 116, 139);
    document.setFont("helvetica", "bold");
    document.setFontSize(7.5);
    document.text(label, x + 4, 52);
    document.setTextColor(15, 19, 24);
    document.setFontSize(13);
    document.text(String(value), x + 4, 61);
  });

  autoTable(document, {
    startY: 76,
    head: [[
      "Nome",
      "E-mail",
      "OAB/UF",
      "Status OAB",
      "Plano",
      "Juris",
      "Cadastro",
    ]],
    body: lawyers.map((lawyer) => [
      lawyer.name || "-",
      lawyer.email || "-",
      formatOabDisplay(lawyer),
      getOabStatus(lawyer).label,
      lawyer.plan_type || (lawyer.is_premium ? "PRO" : "FREE"),
      String(lawyer.balance || 0),
      formatDate(lawyer.created_at),
    ]),
    theme: "striped",
    headStyles: {
      fillColor: [13, 15, 18],
      textColor: [212, 175, 55],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.2 },
    margin: { left: 15, right: 15 },
  });

  const totalPages = document.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    document.setPage(page);
    document.setFontSize(8);
    document.setTextColor(148, 163, 184);
    document.text("Social Juridico", 15, 288);
    document.text(`Pagina ${page} de ${totalPages}`, 195, 288, {
      align: "right",
    });
  }

  document.save("Relatorio_Advogados.pdf");
}
