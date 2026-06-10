import { normalizePhone } from "./lawyerFormatters";

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportLawyersCsv(lawyers) {
  const headers = [
    "Name",
    "Given Name",
    "Family Name",
    "Phone 1 - Value",
    "E-mail 1 - Value",
    "Group Membership",
  ];

  const rows = lawyers.map((lawyer) => {
    const fullName = lawyer.name || "";
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    return [
      fullName,
      parts[0] || "",
      parts.slice(1).join(" "),
      normalizePhone(lawyer.phone),
      lawyer.email || "",
      "Advogados SocialJuridico",
    ];
  });

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "Advogados_Google_Contatos.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
