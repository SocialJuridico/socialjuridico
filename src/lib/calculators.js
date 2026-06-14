/**
 * Calculadoras jurídicas auxiliares.
 * Os resultados são estimativas para conferência profissional, não substituem
 * liquidação oficial, índices do tribunal ou análise de convenção coletiva.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const getCurrentIndices = async () => ({
  SELIC: 10.5,
  IPCA: 4.85,
  TR: 0.4385,
  CDI: 10.65,
  salarioMinimoMensal: 1412,
});

function money(value) {
  return `R$ ${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value, label = "Data") {
  const date = new Date(`${value}T12:00:00`);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} inválida.`);
  }
  return date;
}

function diffDays(start, end) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function addBusinessDays(startDate, businessDays) {
  let current = new Date(startDate);
  let counted = 0;
  while (counted < businessDays) {
    current = addDays(current, 1);
    if (!isWeekend(current)) counted += 1;
  }
  return current;
}

function fullYearsBetween(start, end) {
  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());
  if (end < anniversary) years -= 1;
  return Math.max(0, years);
}

function fullMonthsBetween(start, end) {
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  if (end.getDate() >= start.getDate()) months += 1;
  return Math.max(0, months);
}

function proportionalMonthsInYear(admission, termination) {
  let months = 0;
  const startMonth = admission.getFullYear() === termination.getFullYear()
    ? admission.getMonth()
    : 0;
  for (let month = startMonth; month <= termination.getMonth(); month += 1) {
    const first = new Date(termination.getFullYear(), month, 1);
    const last = new Date(termination.getFullYear(), month + 1, 0);
    const periodStart = admission > first ? admission : first;
    const periodEnd = termination < last ? termination : last;
    if (diffDays(periodStart, periodEnd) + 1 >= 15) months += 1;
  }
  return Math.min(12, months);
}

function proportionalVacationMonths(admission, termination) {
  const months = fullMonthsBetween(admission, termination);
  return Math.min(12, months % 12 || (months > 0 ? 12 : 0));
}

function result(total, summary, details, notes = []) {
  return { total, summary, details, notes };
}

// ===== TRABALHISTA =====

export const calculateRescisaoCompleta = async (inputs) => {
  const salarioBase = parseNumber(inputs.salarioBase);
  const mediaVariaveis = parseNumber(inputs.teveComissoes);
  const remuneracao = salarioBase + mediaVariaveis;
  const admissao = parseDate(inputs.dataAdmissao, "Data de admissão");
  const rescisao = parseDate(inputs.dataRescisao, "Data de rescisão");
  if (rescisao < admissao) throw new Error("A rescisão não pode ser anterior à admissão.");

  const modalidade = inputs.modalidadeRescisao || "sem_justa_causa";
  const avisoIndenizado = inputs.temAviso === true;
  const anos = fullYearsBetween(admissao, rescisao);
  const avisoDias = avisoIndenizado ? Math.min(90, 30 + Math.max(0, anos) * 3) : 0;
  const diasSaldo = rescisao.getDate();
  const meses13 = proportionalMonthsInYear(admissao, rescisao);
  const mesesFerias = proportionalVacationMonths(admissao, rescisao);
  const feriasVencidas = parseNumber(inputs.feriasVencidas);
  const fgtsDepositado = parseNumber(inputs.fgtsDepositado);

  const saldoSalario = (remuneracao / 30) * diasSaldo;
  const avisoPrevio = (remuneracao / 30) * avisoDias;
  const decimoTerceiro = (remuneracao / 12) * meses13;
  const feriasProporcionaisBase = (remuneracao / 12) * mesesFerias;
  const feriasProporcionais = feriasProporcionaisBase + feriasProporcionaisBase / 3;
  const feriasVencidasValor = feriasVencidas * (remuneracao + remuneracao / 3);
  const mesesContrato = Math.max(1, fullMonthsBetween(admissao, rescisao));
  const fgtsEstimado = fgtsDepositado || remuneracao * 0.08 * mesesContrato;
  const multaFgts =
    modalidade === "sem_justa_causa"
      ? fgtsEstimado * 0.4
      : modalidade === "acordo"
        ? fgtsEstimado * 0.2
        : 0;

  const total =
    saldoSalario +
    avisoPrevio +
    decimoTerceiro +
    feriasProporcionais +
    feriasVencidasValor +
    multaFgts;

  return result(
    total,
    `Estimativa de verbas rescisórias para ${anos} ano(s) completo(s) de contrato.`,
    [
      { label: "Saldo de salário", value: money(saldoSalario), desc: `${diasSaldo}/30 sobre remuneração média` },
      { label: "Aviso prévio indenizado", value: money(avisoPrevio), desc: avisoIndenizado ? `${avisoDias} dia(s)` : "Não incluído" },
      { label: "13º proporcional", value: money(decimoTerceiro), desc: `${meses13}/12 avos no ano da rescisão` },
      { label: "Férias proporcionais + 1/3", value: money(feriasProporcionais), desc: `${mesesFerias}/12 avos do período aquisitivo` },
      { label: "Férias vencidas + 1/3", value: money(feriasVencidasValor), desc: `${feriasVencidas || 0} período(s)` },
      { label: "Multa FGTS", value: money(multaFgts), desc: modalidade === "acordo" ? "20% sobre FGTS" : modalidade === "sem_justa_causa" ? "40% sobre FGTS" : "Não aplicável" },
    ],
    [
      "FGTS é estimado quando o saldo depositado não é informado.",
      "Descontos de INSS, IRRF, adiantamentos e verbas convencionais não foram abatidos.",
    ],
  );
};

export const calculateFerias = async (inputs) => {
  const salarioBase = parseNumber(inputs.salarioBase);
  const mediaVariaveis = parseNumber(inputs.teveComissoes);
  const remuneracao = salarioBase + mediaVariaveis;
  const diasFeria = parseNumber(inputs.diasFeria, 30);
  const abonoDias = parseNumber(inputs.abonoDias);
  const incluirTerco = inputs.incluirTerco !== false;

  const diasGozados = Math.max(0, diasFeria - abonoDias);
  const valorFerias = (remuneracao / 30) * diasGozados;
  const abono = (remuneracao / 30) * abonoDias;
  const terco = incluirTerco ? (valorFerias + abono) / 3 : 0;
  const total = valorFerias + abono + terco;

  return result(total, `Cálculo de férias com ${diasGozados} dia(s) de gozo.`, [
    { label: "Férias", value: money(valorFerias), desc: `${diasGozados} dia(s) de gozo` },
    { label: "Abono pecuniário", value: money(abono), desc: `${abonoDias} dia(s) vendidos` },
    { label: "1/3 constitucional", value: money(terco), desc: incluirTerco ? "Sobre férias + abono" : "Não incluído" },
  ]);
};

export const calculateHorasExtras = async (inputs) => {
  const salarioBase = parseNumber(inputs.salarioBase);
  const horasExtrasMes = parseNumber(inputs.horasExtrasMes);
  const divisor = parseNumber(inputs.divisorHoras, 220);
  const adicional = parseNumber(inputs.adicional, 50);
  const dsrPercent = parseNumber(inputs.dsrPercentual, 0);

  const valorHora = salarioBase / divisor;
  const valorHoraExtra = valorHora * (1 + adicional / 100);
  const extras = valorHoraExtra * horasExtrasMes;
  const dsr = extras * (dsrPercent / 100);
  const total = extras + dsr;

  return result(total, `${horasExtrasMes} hora(s) extra(s) com adicional de ${adicional}%.`, [
    { label: "Valor hora", value: money(valorHora), desc: `Salário / ${divisor}` },
    { label: "Hora extra", value: money(valorHoraExtra), desc: `Hora + ${percent(adicional)}` },
    { label: "Extras no mês", value: money(extras), desc: `${horasExtrasMes} hora(s)` },
    { label: "DSR/reflexo informado", value: money(dsr), desc: `${percent(dsrPercent)} sobre extras` },
  ]);
};

// ===== CÍVEL / ATUALIZAÇÃO =====

export const calculateCorrecaoMonetaria = async (inputs) => {
  const valorOriginal = parseNumber(inputs.valorOriginal);
  const indices = await getCurrentIndices();
  const inicio = parseDate(inputs.dataInicial, "Data inicial");
  const fim = parseDate(inputs.dataFinal, "Data final");
  if (fim < inicio) throw new Error("A data final não pode ser anterior à inicial.");

  const dias = Math.max(1, diffDays(inicio, fim));
  const taxaAnual = indices[inputs.indice] ?? indices.IPCA;
  const fator = Math.pow(1 + taxaAnual / 100, dias / 365);
  const valorCorrigido = valorOriginal * fator;

  return result(valorCorrigido, `Atualização por ${inputs.indice || "IPCA"} durante ${dias} dia(s).`, [
    { label: "Valor original", value: money(valorOriginal), desc: "Base de cálculo" },
    { label: "Índice anual usado", value: percent(taxaAnual), desc: "Referência configurada no sistema" },
    { label: "Correção", value: money(valorCorrigido - valorOriginal), desc: `Fator ${(fator).toFixed(6)}` },
    { label: "Valor corrigido", value: money(valorCorrigido), desc: "Principal atualizado" },
  ]);
};

export const calculateJurosMoratorios = async (inputs) => {
  const principal = parseNumber(inputs.valorDevido);
  const vencimento = parseDate(inputs.dataVencimento, "Data de vencimento");
  const pagamento = parseDate(inputs.dataPagamento, "Data de pagamento");
  if (pagamento < vencimento) throw new Error("Pagamento não pode ser anterior ao vencimento.");

  const dias = diffDays(vencimento, pagamento);
  const taxaMensal = parseNumber(inputs.taxaJurosMensal, 1);
  const juros = principal * (taxaMensal / 100) * (dias / 30);

  return result(principal + juros, `Juros simples de mora por ${dias} dia(s).`, [
    { label: "Principal", value: money(principal), desc: "Valor devido" },
    { label: "Taxa mensal", value: percent(taxaMensal), desc: "Juros simples" },
    { label: "Juros", value: money(juros), desc: `${dias} dia(s) em atraso` },
    { label: "Total", value: money(principal + juros), desc: "Principal + mora" },
  ]);
};

export const calculateSELIC = async (inputs) => {
  const valorDebito = parseNumber(inputs.valorOriginal);
  const indices = await getCurrentIndices();
  const inicio = parseDate(inputs.dataInicial, "Data inicial");
  const fim = parseDate(inputs.dataFinal, "Data final");
  if (fim < inicio) throw new Error("A data final não pode ser anterior à inicial.");

  const dias = Math.max(1, diffDays(inicio, fim));
  const fator = Math.pow(1 + indices.SELIC / 100, dias / 365);
  const juros = valorDebito * (fator - 1);

  return result(valorDebito + juros, `Atualização pela SELIC de referência por ${dias} dia(s).`, [
    { label: "Principal", value: money(valorDebito), desc: "Valor do débito" },
    { label: "SELIC anual usada", value: percent(indices.SELIC), desc: "Referência configurada" },
    { label: "Acréscimo", value: money(juros), desc: `Fator ${(fator).toFixed(6)}` },
    { label: "Total", value: money(valorDebito + juros), desc: "Principal + SELIC" },
  ]);
};

// ===== PREVIDENCIÁRIO / FAMÍLIA / PROCESSUAL =====

export const calculateAposentadoriaIdade = async (inputs) => {
  const nascimento = parseDate(inputs.dataNascimento, "Data de nascimento");
  const inicio = parseDate(inputs.dataInicio, "Início das contribuições");
  const hoje = new Date();
  const idade = fullYearsBetween(nascimento, hoje);
  const contribuicao = fullYearsBetween(inicio, hoje);
  const idadeMinima = inputs.sexo === "F" ? 62 : 65;
  const contribuicaoMinima = 15;
  const elegivel = idade >= idadeMinima && contribuicao >= contribuicaoMinima;

  return result(elegivel ? 1 : 0, "Análise simplificada de aposentadoria por idade urbana.", [
    { label: "Idade atual", value: `${idade} anos`, desc: `Mínimo: ${idadeMinima}` },
    { label: "Contribuição estimada", value: `${contribuicao} anos`, desc: `Mínimo: ${contribuicaoMinima}` },
    { label: "Elegibilidade", value: elegivel ? "Sim" : "Não", desc: "Conferir CNIS e regras de transição" },
  ]);
};

export const calculatePensaoAlimenticia = async (inputs) => {
  const renda = parseNumber(inputs.rendaMensal);
  const filhos = Math.max(1, parseNumber(inputs.numeroFilhos, 1));
  const percentual = parseNumber(inputs.percentualAlimentista, 30);
  const total = renda * (percentual / 100);

  return result(total, "Estimativa baseada no percentual informado sobre renda líquida.", [
    { label: "Renda líquida", value: money(renda), desc: "Base informada" },
    { label: "Percentual", value: percent(percentual), desc: "Necessidade x possibilidade" },
    { label: "Total sugerido", value: money(total), desc: "Valor mensal" },
    { label: "Por filho", value: money(total / filhos), desc: `${filhos} dependente(s)` },
  ]);
};

export const calculateHonorarios = async (inputs) => {
  const valor = parseNumber(inputs.causaValor);
  const percentuais = { Baixa: 10, Média: 15, Alta: 20 };
  const percentual = parseNumber(inputs.percentualHonorarios, percentuais[inputs.complexidade] || 15);
  const total = valor * (percentual / 100);

  return result(total, `Honorários estimados pela complexidade ${inputs.complexidade || "Média"}.`, [
    { label: "Valor econômico", value: money(valor), desc: "Valor da causa ou proveito econômico" },
    { label: "Percentual", value: percent(percentual), desc: "Parâmetro contratual/sucumbencial" },
    { label: "Honorários", value: money(total), desc: "Estimativa" },
  ]);
};

export const calculatePrazoCPC = async (inputs) => {
  const evento = parseDate(inputs.dataInicial, "Data do evento");
  const prazos = {
    Recurso: { dias: 15, base: "Regra geral recursal" },
    Contestação: { dias: 15, base: "CPC, art. 335" },
    Embargos: { dias: 5, base: "Embargos de declaração" },
    Manifestação: { dias: 5, base: "Prazo comum configurado" },
  };
  const prazo = prazos[inputs.tipoPrazo] || prazos.Recurso;
  const vencimento = addBusinessDays(evento, prazo.dias);

  return result(prazo.dias, `Prazo estimado em ${prazo.dias} dia(s) úteis.`, [
    { label: "Data do evento", value: evento.toLocaleDateString("pt-BR"), desc: "Dia 0 não contado" },
    { label: "Prazo", value: `${prazo.dias} dias úteis`, desc: prazo.base },
    { label: "Vencimento estimado", value: vencimento.toLocaleDateString("pt-BR"), desc: "Não considera feriados locais/suspensões" },
  ], [
    "A contagem ignora feriados nacionais, locais, suspensão de prazos e regras específicas de intimação.",
  ]);
};

export const calculateMultaArt523 = async (inputs) => {
  const principal = parseNumber(inputs.valorDevido || inputs.valorOriginal);
  const multa = principal * 0.1;
  const honorarios = principal * 0.1;
  return result(principal + multa + honorarios, "Cumprimento de sentença: multa e honorários estimados em 10% cada.", [
    { label: "Principal", value: money(principal), desc: "Valor executado" },
    { label: "Multa", value: money(multa), desc: "10%" },
    { label: "Honorários", value: money(honorarios), desc: "10%" },
    { label: "Total", value: money(principal + multa + honorarios), desc: "Principal + acréscimos" },
  ]);
};
