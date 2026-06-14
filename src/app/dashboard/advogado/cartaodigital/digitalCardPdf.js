import jsPDF from "jspdf";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

function hexToRgb(hex) {
  const normalized = String(hex || "#D4AF37").replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function safeFileName(value) {
  return String(value || "cartao-digital")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "cartao-digital";
}

function initials(value) {
  return String(value || "Advogado")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function hostname(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function getPdfPalette(card) {
  if (card.theme === "light" || card.backgroundStyle === "minimal") {
    return {
      page: [242, 239, 232],
      panel: [255, 255, 255],
      panelBorder: [224, 220, 211],
      title: [28, 28, 32],
      text: [72, 72, 80],
      muted: [112, 112, 120],
      button: [248, 247, 243],
      buttonBorder: [226, 223, 216],
      buttonTitle: [34, 34, 39],
    };
  }
  if (card.theme === "wine") {
    return {
      page: [20, 9, 13],
      panel: [43, 14, 23],
      panelBorder: [76, 32, 46],
      title: [250, 248, 249],
      text: [210, 194, 201],
      muted: [150, 130, 138],
      button: [55, 24, 34],
      buttonBorder: [82, 42, 55],
      buttonTitle: [245, 240, 242],
    };
  }
  if (card.theme === "graphite") {
    return {
      page: [17, 18, 22],
      panel: [35, 36, 41],
      panelBorder: [60, 61, 68],
      title: [250, 250, 250],
      text: [205, 205, 211],
      muted: [135, 135, 145],
      button: [45, 46, 52],
      buttonBorder: [70, 71, 78],
      buttonTitle: [245, 245, 247],
    };
  }
  return {
    page: [15, 15, 19],
    panel: [24, 24, 29],
    panelBorder: [54, 54, 60],
    title: [250, 250, 250],
    text: [205, 205, 210],
    muted: [125, 125, 133],
    button: [34, 34, 40],
    buttonBorder: [58, 58, 66],
    buttonTitle: [245, 245, 247],
  };
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível decodificar a foto do perfil."));
    };
    image.src = objectUrl;
  });
}

async function createCircularAvatarDataUrl(avatarUrl, size = 512) {
  if (!avatarUrl || typeof document === "undefined") return "";

  const response = await fetch(avatarUrl, {
    cache: "no-store",
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok) {
    throw new Error("Não foi possível baixar a foto do perfil.");
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("O arquivo do perfil não é uma imagem válida.");
  }
  if (blob.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error("A foto do perfil excede o limite para exportação.");
  }

  const { image, objectUrl } = await loadImageFromBlob(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível para processar a foto.");

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);

    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );
    context.restore();

    return canvas.toDataURL("image/png", 1);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function collectLinks(card) {
  const links = [];
  if (card.whatsapp) {
    links.push({
      label: "WhatsApp",
      detail: `+${card.whatsapp}`,
      url: `https://wa.me/${card.whatsapp}`,
    });
  }
  if (card.phone && card.showPhone) {
    links.push({
      label: "Telefone",
      detail: `+${card.phone}`,
      url: `tel:+${card.phone}`,
    });
  }
  if (card.publicEmail && card.showEmail) {
    links.push({
      label: "E-mail",
      detail: card.publicEmail,
      url: `mailto:${card.publicEmail}`,
    });
  }
  if (card.website) {
    links.push({
      label: "Website",
      detail: hostname(card.website),
      url: card.website,
    });
  }
  for (const link of card.customLinks || []) {
    if (link.enabled === false || !link.url) continue;
    links.push({
      label: link.title,
      detail: hostname(link.url),
      url: link.url,
    });
  }
  return links.slice(0, 6);
}

function drawButton(doc, link, x, y, width, accent, palette) {
  doc.setFillColor(...palette.button);
  doc.setDrawColor(...palette.buttonBorder);
  doc.roundedRect(x, y, width, 15, 3, 3, "FD");
  doc.setFillColor(...accent);
  doc.circle(x + 7.5, y + 7.5, 3.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...palette.buttonTitle);
  doc.text(link.label, x + 14, y + 6.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...palette.muted);
  const detail = doc.splitTextToSize(link.detail || link.url, width - 19)[0] || "";
  doc.text(detail, x + 14, y + 10.8);
  doc.link(x, y, width, 15, { url: link.url });
}

export async function generateDigitalCardPdf(card, qrDataUrl = "") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const accent = hexToRgb(card.accentColor);
  const palette = getPdfPalette(card);

  let avatarDataUrl = "";
  try {
    avatarDataUrl = await createCircularAvatarDataUrl(card.avatarUrl);
  } catch (error) {
    console.warn("[Cartão Digital] PDF usando iniciais como fallback:", error);
  }

  doc.setProperties({
    title: `Cartão Digital - ${card.displayName}`,
    subject: card.headline || "Cartão profissional",
    author: card.displayName,
    creator: "Social Jurídico",
  });

  doc.setFillColor(...palette.page);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 6, "F");

  doc.setFillColor(...palette.panel);
  doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 8, 8, "F");
  doc.setDrawColor(...palette.panelBorder);
  doc.roundedRect(18, 18, pageWidth - 36, pageHeight - 36, 8, 8, "S");

  doc.setFillColor(...accent);
  doc.circle(pageWidth / 2, 48, 18, "F");
  if (avatarDataUrl) {
    doc.addImage(avatarDataUrl, "PNG", pageWidth / 2 - 16, 32, 32, 32);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 20, 24);
    doc.text(initials(card.displayName), pageWidth / 2, 54.5, { align: "center" });
  }

  doc.setTextColor(...palette.title);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(card.displayName || "Advogado(a)", pageWidth / 2, 76, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...palette.muted);
  const headline = doc.splitTextToSize(
    card.headline || "Advocacia estratégica",
    140,
  );
  doc.text(headline.slice(0, 2), pageWidth / 2, 83, { align: "center" });

  const credentialParts = [];
  if (card.profile?.oab) {
    credentialParts.push(
      `OAB ${card.profile.estado || ""} ${card.profile.oab}`.trim(),
    );
  }
  if (card.showLocation && card.location) credentialParts.push(card.location);
  if (credentialParts.length) {
    doc.setFontSize(7.5);
    doc.setTextColor(...accent);
    doc.text(credentialParts.join("  •  "), pageWidth / 2, 94, {
      align: "center",
    });
  }

  let currentY = 103;
  if (card.bio) {
    doc.setFontSize(8.3);
    doc.setTextColor(...palette.text);
    const bioLines = doc.splitTextToSize(card.bio, 150).slice(0, 5);
    doc.text(bioLines, pageWidth / 2, currentY, {
      align: "center",
      lineHeightFactor: 1.45,
    });
    currentY += bioLines.length * 4.4 + 7;
  }

  const links = collectLinks(card);
  const buttonWidth = 76;
  const gap = 6;
  const startX = (pageWidth - buttonWidth * 2 - gap) / 2;
  links.forEach((link, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawButton(
      doc,
      link,
      startX + column * (buttonWidth + gap),
      currentY + row * 20,
      buttonWidth,
      accent,
      palette,
    );
  });
  currentY += Math.ceil(links.length / 2) * 20 + 4;

  doc.setDrawColor(...palette.panelBorder);
  doc.line(31, currentY, pageWidth - 31, currentY);
  currentY += 8;

  const qrSize = 34;
  if (qrDataUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(31, currentY, qrSize + 8, qrSize + 8, 4, 4, "F");
      doc.addImage(qrDataUrl, "PNG", 35, currentY + 4, qrSize, qrSize);
    } catch {
      qrDataUrl = "";
    }
  }

  const textX = qrDataUrl ? 82 : 31;
  const textWidth = qrDataUrl ? pageWidth - textX - 31 : pageWidth - 62;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...accent);
  doc.text("Acesse o cartão interativo", textX, currentY + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...palette.text);
  const publicLines = doc.splitTextToSize(card.publicUrl, textWidth);
  doc.text(publicLines, textX, currentY + 15);
  doc.link(textX, currentY + 10, textWidth, 14, { url: card.publicUrl });
  doc.setFontSize(7);
  doc.setTextColor(...palette.muted);
  doc.text(
    "No cartão online, os botões permanecem interativos e o contato pode ser salvo no celular.",
    textX,
    currentY + 28,
    { maxWidth: textWidth },
  );

  const footerY = pageHeight - 29;
  doc.setDrawColor(...palette.panelBorder);
  doc.line(31, footerY - 8, pageWidth - 31, footerY - 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(...palette.text);
  doc.text("SOCIAL JURÍDICO", 31, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(...palette.muted);
  doc.text(
    "Cartão profissional digital • Links clicáveis • QR Code",
    31,
    footerY + 5,
  );
  doc.setTextColor(...accent);
  doc.text("Abrir cartão", pageWidth - 31, footerY + 2, { align: "right" });
  doc.link(pageWidth - 60, footerY - 3, 29, 8, { url: card.publicUrl });

  doc.save(`cartao-digital-${safeFileName(card.displayName)}.pdf`);
}
