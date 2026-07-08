import crypto from "crypto";

const REPORT_TYPE_LABELS = {
  RELATORIO_INDIVIDUAL_ESTUDANTE: "Relatorio Individual do Estudante",
  RELATORIO_ATIVIDADES_ESTUDANTE: "Atividades do Estudante",
  RELATORIO_CARGA_HORARIA_ESTUDANTE: "Carga Horaria do Estudante",
  RELATORIO_AVALIACAO_ESTUDANTE: "Avaliacao do Estudante",
  RELATORIO_TURMA: "Relatorio da Turma",
  RELATORIO_PROGRAMA: "Relatorio do Programa",
  RELATORIO_ATIVIDADES: "Relatorio de Atividades",
  RELATORIO_CARGA_HORARIA: "Relatorio de Carga Horaria",
  RELATORIO_AVALIACOES: "Relatorio de Avaliacoes",
  RELATORIO_SUPERVISAO: "Relatorio de Supervisao",
  RELATORIO_ORIENTACAO: "Relatorio de Orientacao",
  RELATORIO_IMPACTO_ACADEMICO: "Impacto Academico",
  RELATORIO_IMPACTO_INSTITUCIONAL: "Impacto Institucional",
  RELATORIO_AUDITORIA: "Relatorio de Auditoria",
};

const MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();
}

function sanitizeFilename(value) {
  return normalizeText(value || "relatorio")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96)
    .toLowerCase();
}

function formatDate(value) {
  if (!value) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function minutesToHours(minutes = 0) {
  const safeMinutes = Number(minutes || 0);
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (!hours) return `${remaining}min`;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

async function safeSelect(db, table, queryBuilder) {
  const { data, error } = await queryBuilder(db.from(table));
  if (error) return [];
  return data || [];
}

function withinReportPeriod(row, report) {
  const sourceDate = row.completed_at || row.generated_at || row.created_at || row.updated_at;
  if (!sourceDate) return true;
  const time = new Date(sourceDate).getTime();
  const start = report.periodo_inicio ? new Date(`${report.periodo_inicio}T00:00:00-03:00`).getTime() : null;
  const end = report.periodo_fim ? new Date(`${report.periodo_fim}T23:59:59-03:00`).getTime() : null;
  if (start && time < start) return false;
  if (end && time > end) return false;
  return true;
}

function matchesScope(row, report) {
  if (report.programa_academico_id && row.programa_academico_id !== report.programa_academico_id) return false;
  if (report.turma_academica_id && row.turma_academica_id !== report.turma_academica_id) return false;
  if (report.estudante_vinculo_id && row.estudante_vinculo_id !== report.estudante_vinculo_id) return false;
  return true;
}

export async function loadOraculoReportPayload({ db, reportId, instituicaoId }) {
  const { data: report, error: reportError } = await db
    .from("oraculo_relatorios_institucionais")
    .select("*")
    .eq("id", reportId)
    .eq("instituicao_id", instituicaoId)
    .maybeSingle();

  if (reportError || !report) {
    throw new Error("Relatorio nao localizado para esta instituicao.");
  }

  const [
    institution,
    programs,
    classes,
    links,
    professionals,
    activities,
    workloads,
    evaluations,
    supervisors,
    orientators,
  ] = await Promise.all([
    safeSelect(db, "oraculo_instituicoes", (query) =>
      query.select("*").eq("id", instituicaoId).limit(1),
    ),
    safeSelect(db, "oraculo_programas_academicos", (query) =>
      query.select("id, nome, periodo_academico, curso, campus").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_turmas_academicas", (query) =>
      query.select("id, nome, programa_academico_id, turno").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_estudante_vinculos_academicos", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_profissionais", (query) =>
      query.select("id, name, email, numero_matricula, periodo_atual").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_atividades_academicas", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_carga_horaria_lancamentos", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_avaliacoes_academicas", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_supervisores_formais", (query) =>
      query.select("id, nome, oab_numero, oab_uf").eq("instituicao_id", instituicaoId),
    ),
    safeSelect(db, "oraculo_instituicao_usuarios", (query) =>
      query.select("id, nome_completo, email, status").eq("instituicao_id", instituicaoId),
    ),
  ]);

  const scopedActivities = activities.filter(
    (row) => matchesScope(row, report) && withinReportPeriod(row, report),
  );
  const scopedWorkloads = workloads.filter(
    (row) => matchesScope(row, report) && withinReportPeriod(row, report),
  );
  const scopedEvaluations = evaluations.filter(
    (row) => matchesScope(row, report) && withinReportPeriod(row, report),
  );
  const scopedLinks = links.filter((row) => matchesScope(row, report));

  const professionalById = new Map(professionals.map((item) => [item.id, item]));
  const programById = new Map(programs.map((item) => [item.id, item]));
  const classById = new Map(classes.map((item) => [item.id, item]));
  const linkById = new Map(links.map((item) => [item.id, item]));

  const activityRows = scopedActivities.slice(0, 80).map((activity) => {
    const professional = professionalById.get(activity.oraculo_profissional_id);
    return [
      formatDate(activity.completed_at || activity.started_at || activity.created_at),
      professional?.name || "Estudante nao localizado",
      activity.tipo_atividade,
      activity.codigo_caso || "Sem caso",
      activity.area_juridica || "Nao informada",
      minutesToHours(activity.tempo_registrado_minutos),
      minutesToHours(activity.tempo_reconhecido_minutos),
      activity.status,
    ];
  });

  const workloadByStudent = new Map();
  for (const workload of scopedWorkloads) {
    const key = workload.estudante_vinculo_id || workload.oraculo_profissional_id;
    const current = workloadByStudent.get(key) || {
      link: linkById.get(workload.estudante_vinculo_id),
      professional: professionalById.get(workload.oraculo_profissional_id),
      programa: programById.get(workload.programa_academico_id),
      turma: classById.get(workload.turma_academica_id),
      registrado: 0,
      reconhecido: 0,
      pendente: 0,
    };
    current.registrado += workload.minutos_registrados || 0;
    current.reconhecido += workload.minutos_reconhecidos || 0;
    if (workload.status === "PENDENTE") current.pendente += workload.minutos_registrados || 0;
    workloadByStudent.set(key, current);
  }

  const workloadRows = [...workloadByStudent.values()].slice(0, 80).map((item) => [
    item.professional?.name || "Estudante nao localizado",
    item.programa?.nome || "Programa nao informado",
    item.turma?.nome || "Sem turma",
    minutesToHours(item.registrado),
    minutesToHours(item.reconhecido),
    minutesToHours(item.pendente),
  ]);

  const evaluationRows = scopedEvaluations.slice(0, 80).map((evaluation) => {
    const scores = [
      evaluation.competencia_pesquisa,
      evaluation.competencia_raciocinio,
      evaluation.competencia_comunicacao,
      evaluation.competencia_etica,
      evaluation.competencia_responsabilidade,
    ].filter(Boolean);
    const average = scores.length
      ? (scores.reduce((sum, score) => sum + Number(score), 0) / scores.length).toFixed(1)
      : "Sem notas";
    return [
      professionalById.get(evaluation.oraculo_profissional_id)?.name || "Estudante nao localizado",
      evaluation.periodo_referencia,
      evaluation.tipo_avaliacao,
      average,
      evaluation.conceito_final || "Sem conceito",
      evaluation.status,
    ];
  });

  const uniqueAreas = new Set(scopedActivities.map((item) => item.area_juridica).filter(Boolean));
  const sourcesCount = scopedActivities.reduce((sum, item) => {
    const sources = Array.isArray(item.fontes_consultadas) ? item.fontes_consultadas : [];
    return sum + sources.length;
  }, 0);

  const summaryRows = [
    ["Instituicao", institution[0]?.nome || "Instituicao nao localizada"],
    ["Tipo", REPORT_TYPE_LABELS[report.tipo] || report.tipo],
    ["Escopo", report.escopo],
    ["Periodo", `${formatDate(report.periodo_inicio)} ate ${formatDate(report.periodo_fim)}`],
    ["Estudantes no escopo", String(scopedLinks.filter((item) => item.status_academico === "ATIVO").length)],
    ["Atividades registradas", String(scopedActivities.length)],
    ["Horas reconhecidas", minutesToHours(scopedWorkloads.reduce((sum, item) => sum + (item.minutos_reconhecidos || 0), 0))],
    ["Avaliacoes registradas", String(scopedEvaluations.length)],
    ["Areas juridicas trabalhadas", String(uniqueAreas.size)],
    ["Fontes juridicas consultadas", String(sourcesCount)],
    ["Supervisores cadastrados", String(supervisors.length)],
    ["Usuarios institucionais ativos", String(orientators.filter((item) => item.status === "ATIVO").length)],
  ];

  return {
    report,
    institution: institution[0] || {},
    generatedAt: new Date().toISOString(),
    title: report.titulo,
    subtitle: REPORT_TYPE_LABELS[report.tipo] || report.tipo,
    summaryRows,
    sections: [
      {
        title: "Resumo executivo",
        headers: ["Indicador", "Valor"],
        rows: summaryRows,
      },
      {
        title: "Atividades academicas",
        headers: ["Data", "Estudante", "Atividade", "Caso", "Area", "Registrado", "Reconhecido", "Status"],
        rows: activityRows.length ? activityRows : [["Sem atividades no escopo", "", "", "", "", "", "", ""]],
      },
      {
        title: "Carga horaria",
        headers: ["Estudante", "Programa", "Turma", "Registradas", "Reconhecidas", "Pendentes"],
        rows: workloadRows.length ? workloadRows : [["Sem lancamentos no escopo", "", "", "", "", ""]],
      },
      {
        title: "Avaliacoes",
        headers: ["Estudante", "Periodo", "Tipo", "Media", "Conceito", "Status"],
        rows: evaluationRows.length ? evaluationRows : [["Sem avaliacoes no escopo", "", "", "", "", ""]],
      },
    ],
  };
}

function crc32(buffer) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    crc32.table = table;
  }

  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const dosDate =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { time, date: dosDate };
}

function buildZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const stamp = dosDateTime();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(stamp.time, 12);
    central.writeUInt16LE(stamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralOffset = offset;
  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuffer, end]);
}

export async function renderOraculoReportPdf(payload) {
  const { jsPDF } = require("jspdf");
  const autoTable = require("jspdf-autotable").default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 36;

  doc.setFillColor(10, 12, 14);
  doc.rect(0, 0, pageWidth, 92, "F");
  doc.setTextColor(212, 175, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ORACULO ACADEMICO", margin, 32);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(normalizeText(payload.title), margin, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    normalizeText(`${payload.institution.nome || "Instituicao"} | Gerado em ${formatDateTime(payload.generatedAt)}`),
    margin,
    78,
  );

  let startY = 118;
  for (const section of payload.sections) {
    doc.setTextColor(10, 12, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(normalizeText(section.title), margin, startY);
    autoTable(doc, {
      head: [section.headers.map(normalizeText)],
      body: section.rows.map((row) => row.map(normalizeText)),
      startY: startY + 10,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [10, 12, 14], textColor: [249, 223, 132] },
      alternateRowStyles: { fillColor: [247, 247, 247] },
    });
    startY = doc.lastAutoTable.finalY + 28;
    if (startY > 500) {
      doc.addPage();
      startY = 48;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - 90, doc.internal.pageSize.getHeight() - 20);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

function wordParagraph(text, style = "") {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t>${escapeXml(normalizeText(text))}</w:t></w:r></w:p>`;
}

function wordTable(section) {
  const rows = [section.headers, ...section.rows];
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="6" w:color="D4AF37"/><w:left w:val="single" w:sz="6" w:color="D4AF37"/><w:bottom w:val="single" w:sz="6" w:color="D4AF37"/><w:right w:val="single" w:sz="6" w:color="D4AF37"/><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:insideV w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders></w:tblPr>${rows.map((row, rowIndex) => `<w:tr>${row.map((cell) => `<w:tc><w:tcPr><w:shd w:fill="${rowIndex === 0 ? "0A0C0E" : "FFFFFF"}"/></w:tcPr><w:p><w:r><w:rPr>${rowIndex === 0 ? '<w:color w:val="F9DF84"/><w:b/>' : ""}</w:rPr><w:t>${escapeXml(normalizeText(cell))}</w:t></w:r></w:p></w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;
}

export function renderOraculoReportDocx(payload) {
  const body = [
    wordParagraph(payload.title, "Title"),
    wordParagraph(`${payload.subtitle} | ${payload.institution.nome || "Instituicao"}`),
    wordParagraph(`Gerado em ${formatDateTime(payload.generatedAt)}`),
    ...payload.sections.flatMap((section) => [
      wordParagraph(section.title, "Heading1"),
      wordTable(section),
    ]),
  ].join("");

  return buildZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="0A0C0E"/><w:sz w:val="32"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:rFonts w:ascii="Arial"/><w:b/><w:color w:val="7A651F"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`,
    },
    {
      name: "word/document.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`,
    },
  ]);
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

function sheetXml(sections) {
  const rows = [];
  let rowIndex = 1;
  for (const section of sections) {
    rows.push({ values: [section.title], header: true });
    rowIndex += 1;
    rows.push({ values: section.headers, header: true });
    rowIndex += 1;
    for (const row of section.rows) {
      rows.push({ values: row });
      rowIndex += 1;
    }
    rows.push({ values: [] });
    rowIndex += 1;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, rIndex) => `<row r="${rIndex + 1}">${row.values.map((value, cIndex) => `<c r="${columnName(cIndex)}${rIndex + 1}" t="inlineStr" s="${row.header ? 1 : 0}"><is><t>${escapeXml(normalizeText(value))}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
}

export function renderOraculoReportXlsx(payload) {
  return buildZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/styles.xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFD4AF37"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A0C0E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: sheetXml(payload.sections),
    },
  ]);
}

export async function renderOraculoReportFile({ payload, format }) {
  const normalizedFormat = ["pdf", "docx", "xlsx"].includes(format) ? format : "pdf";
  let buffer;
  if (normalizedFormat === "docx") buffer = renderOraculoReportDocx(payload);
  if (normalizedFormat === "xlsx") buffer = renderOraculoReportXlsx(payload);
  if (!buffer) buffer = await renderOraculoReportPdf(payload);

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const filename = `${sanitizeFilename(payload.report.codigo_interno || payload.title)}.${normalizedFormat}`;

  return {
    buffer,
    hash,
    filename,
    contentType: MIME_TYPES[normalizedFormat],
    format: normalizedFormat,
  };
}
