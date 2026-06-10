import { normalizePhone } from "./clientFormatters";

function escapeCsvValue(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function exportClientsCsv(clients) {
  const headers = [
    "Name",
    "Given Name",
    "Family Name",
    "Phone 1 - Value",
    "E-mail 1 - Value",
    "Group Membership",
  ];

  const rows = clients.map((client) => {
    const fullName = client.name || "";
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const givenName = nameParts[0] || "";
    const familyName = nameParts.slice(1).join(" ");

    return [
      fullName,
      givenName,
      familyName,
      normalizePhone(client.phone),
      client.email || "",
      "Clientes SocialJurídico",
    ];
  });

  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "Clientes_Google_Contatos.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
