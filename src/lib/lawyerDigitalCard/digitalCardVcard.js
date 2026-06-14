function escapeVcard(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function splitName(displayName) {
  const parts = String(displayName || "Advogado").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || "Advogado", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts.at(-1) };
}

export function buildDigitalCardVcard(card) {
  const name = splitName(card.displayName);
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcard(name.last)};${escapeVcard(name.first)};;;`,
    `FN:${escapeVcard(card.displayName)}`,
    `TITLE:${escapeVcard(card.headline || "Advogado(a)")}`,
  ];
  if (card.profile?.officeName) lines.push(`ORG:${escapeVcard(card.profile.officeName)}`);
  if (card.phone && card.showPhone) lines.push(`TEL;TYPE=CELL,VOICE:+${card.phone}`);
  if (card.whatsapp) lines.push(`item1.TEL;TYPE=CELL:+${card.whatsapp}`);
  if (card.whatsapp) lines.push("item1.X-ABLabel:WhatsApp");
  if (card.publicEmail && card.showEmail) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(card.publicEmail)}`);
  if (card.website) lines.push(`URL:${escapeVcard(card.website)}`);
  if (card.showLocation && card.location) lines.push(`ADR;TYPE=WORK:;;;;${escapeVcard(card.location)};;;`);
  if (card.bio) lines.push(`NOTE:${escapeVcard(card.bio)}`);
  lines.push(`X-SOCIALPROFILE;TYPE=SOCIALJURIDICO:${escapeVcard(card.publicUrl)}`);
  lines.push("END:VCARD");
  return `${lines.join("\r\n")}\r\n`;
}

export function safeVcardFilename(name) {
  const normalized = String(name || "advogado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${normalized || "advogado"}.vcf`;
}
