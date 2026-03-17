/**
 * Utilitários de Cálculos Jurídicos Profissionais
 * Fórmulas baseadas na legislação brasileira (CLT, CC, CPC, Lei INSS)
 */

export const getCurrentIndices = async () => {
  return {
    SELIC: 10.50, // % a.a.
    IPCA: 4.85, // % a.a. acumulado
    TR: 0.4385, // Taxa Referencial
    CDI: 10.65, // % a.a.
    salarioMinimoMensal: 1412.00,
  };
};

// ===== TRABALHISTA =====

export const calculateRescisaoCompleta = async (inputs) => {
  const salarioBase = Number(inputs.salarioBase) || 0;
  const teveComissoes = Number(inputs.teveComissoes) || 0;
  const temAviso = inputs.temAviso === true;
  
  const datAdm = new Date(inputs.dataAdmissao);
  const datResc = new Date(inputs.dataRescisao);
  
  if (isNaN(datAdm.getTime()) || isNaN(datResc.getTime())) {
    throw new Error("Datas de admissão ou rescisão inválidas.");
  }

  const diasTrabalhados = Math.floor((datResc.getTime() - datAdm.getTime()) / (1000 * 60 * 60 * 24));
  const anosCompletos = Math.floor(diasTrabalhados / 365);
  
  // FGTS (8%)
  const saldoFGTS = salarioBase * 0.08 * (diasTrabalhados / 30);
  const multaFGTS = saldoFGTS * 0.40;
  const avisoPrevioValor = temAviso ? salarioBase : 0;
  const ferias = (salarioBase / 12) * Math.ceil(diasTrabalhados / 30);
  const decimoTerceiro = (salarioBase / 12) * Math.ceil(diasTrabalhados / 30);
  
  const total = saldoFGTS + multaFGTS + avisoPrevioValor + ferias + decimoTerceiro + teveComissoes;

  return {
    total,
    summary: `Rescisão para ${anosCompletos} anos e ${diasTrabalhados % 365} dias. Sem justa causa (Multa 40%).`,
    details: [
      { label: "Saldo FGTS", value: `R$ ${saldoFGTS.toFixed(2)}`, desc: "8% do período" },
      { label: "Multa FGTS (40%)", value: `R$ ${multaFGTS.toFixed(2)}`, desc: "Lei 8.036/90" },
      { label: "Aviso Prévio", value: `R$ ${avisoPrevioValor.toFixed(2)}`, desc: "CLT Art. 488" },
      { label: "Férias Prop.", value: `R$ ${ferias.toFixed(2)}`, desc: "+ 1/3 Const." },
      { label: "13º Prop.", value: `R$ ${decimoTerceiro.toFixed(2)}`, desc: "Lei 4.090/62" },
      { label: "Comissões", value: `R$ ${teveComissoes.toFixed(2)}`, desc: "Variáveis" },
    ]
  };
};

export const calculateFerias = async (inputs) => {
  const salarioBase = Number(inputs.salarioBase) || 0;
  const diasFeria = Number(inputs.diasFeria) || 0;
  const incluirTerco = inputs.incluirTerco === true;

  const valorFerias = (salarioBase / 30) * diasFeria;
  const tercoConstitucional = incluirTerco ? valorFerias / 3 : 0;
  const total = valorFerias + tercoConstitucional;

  return {
    total,
    summary: `Cálculo de ${diasFeria} dias de férias ${incluirTerco ? 'com 1/3' : ''}.`,
    details: [
      { label: "Base Férias", value: `R$ ${valorFerias.toFixed(2)}`, desc: "Proporcional aos dias" },
      { label: "1/3 Constitucional", value: `R$ ${tercoConstitucional.toFixed(2)}`, desc: "CF/88 Art. 7º" },
    ]
  };
};

export const calculateHorasExtras = async (inputs) => {
  const salarioBase = Number(inputs.salarioBase) || 0;
  const horasExtrasMes = Number(inputs.horasExtrasMes) || 0;
  const adicional = Number(inputs.adicional) || 50;

  const valorHora = salarioBase / 220;
  const adicionalPercent = adicional / 100;
  const valorHoraExtra = valorHora * (1 + adicionalPercent);
  const totalMes = valorHoraExtra * horasExtrasMes;

  return {
    total: totalMes,
    summary: `${horasExtrasMes}h extras a ${adicional}% (CLT Art. 59).`,
    details: [
      { label: "Hora Normal", value: `R$ ${valorHora.toFixed(2)}`, desc: "Base 220h" },
      { label: "Valor Hora Extra", value: `R$ ${valorHoraExtra.toFixed(2)}`, desc: "Com adicional" },
      { label: "Total Ganho", value: `R$ ${totalMes.toFixed(2)}`, desc: "Resultado mensal" },
    ]
  };
};

// ===== CÍVEL =====

export const calculateCorrecaoMonetaria = async (inputs) => {
  const valorOriginal = Number(inputs.valorOriginal) || 0;
  const indices = await getCurrentIndices();
  const datIni = new Date(inputs.dataInicial);
  const datFim = new Date(inputs.dataFinal);
  
  if (isNaN(datIni.getTime()) || isNaN(datFim.getTime())) {
    throw new Error("Datas inicial ou final inválidas.");
  }

  const meses = Math.ceil((datFim.getTime() - datIni.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  let taxaMensal = 0;
  if (inputs.indice === 'IPCA') taxaMensal = indices.IPCA / 100 / 12;
  else if (inputs.indice === 'TR') taxaMensal = indices.TR / 100;
  else if (inputs.indice === 'SELIC') taxaMensal = indices.SELIC / 100 / 12;

  const valorCorrigido = valorOriginal * Math.pow(1 + taxaMensal, meses);
  return {
    total: valorCorrigido,
    summary: `Atualização por ${meses} meses via ${inputs.indice}.`,
    details: [
      { label: "Original", value: `R$ ${valorOriginal.toFixed(2)}`, desc: "Valor base" },
      { label: "Corrigido", value: `R$ ${valorCorrigido.toFixed(2)}`, desc: "Valor final" },
      { label: "Variação", value: `R$ ${(valorCorrigido - valorOriginal).toFixed(2)}`, desc: "Correção pura" },
    ]
  };
};

export const calculateJurosMoratorios = async (inputs) => {
  const valorDevido = Number(inputs.valorDevido) || 0;
  const datVenc = new Date(inputs.dataVencimento);
  const datPag = new Date(inputs.dataPagamento);

  if (isNaN(datVenc.getTime()) || isNaN(datPag.getTime())) {
    throw new Error("Datas de vencimento ou pagamento inválidas.");
  }

  const diasAtraso = Math.ceil((datPag.getTime() - datVenc.getTime()) / (1000 * 60 * 60 * 24));
  const taxaMensal = 0.01; // 1%
  const meses = diasAtraso / 30;
  const juros = valorDevido * taxaMensal * meses;

  return {
    total: valorDevido + juros,
    summary: `Juros de mora (1% a.m.) por ${diasAtraso} dias.`,
    details: [
      { label: "Principal", value: `R$ ${valorDevido.toFixed(2)}`, desc: "Débito original" },
      { label: "Juros", value: `R$ ${juros.toFixed(2)}`, desc: "Mora acumulada" },
      { label: "Total", value: `R$ ${(valorDevido + juros).toFixed(2)}`, desc: "Final a pagar" },
    ]
  };
};

// ===== PREVIDENCIÁRIO =====

export const calculateAposentadoriaIdade = async (inputs) => {
  const datNasc = new Date(inputs.dataNascimento);
  const datIni = new Date(inputs.dataInicio);

  if (isNaN(datNasc.getTime()) || isNaN(datIni.getTime())) {
    throw new Error("Datas de nascimento ou início inválidas.");
  }

  const idadeAtual = new Date().getFullYear() - datNasc.getFullYear();
  const tempoContribuicao = new Date().getFullYear() - datIni.getFullYear();
  const idadeRequerida = inputs.sexo === 'F' ? 62 : 65;
  const tempoRequerido = 15;

  return {
    total: 0,
    summary: `Análise de elegibilidade (Regime Geral).`,
    details: [
      { label: "Idade", value: `${idadeAtual} anos`, desc: `Mín: ${idadeRequerida}` },
      { label: "Tempo Contrib.", value: `${tempoContribuicao} anos`, desc: `Mín: ${tempoRequerido}` },
      { label: "Elegível?", value: (idadeAtual >= idadeRequerida && tempoContribuicao >= tempoRequerido) ? "SIM" : "NÃO", desc: "Status atual" },
    ]
  };
};

// ===== FAMÍLIA =====

export const calculatePensaoAlimenticia = async (inputs) => {
  const rendaMensal = Number(inputs.rendaMensal) || 0;
  const numeroFilhos = Number(inputs.numeroFilhos) || 1;
  const percentualAlimentista = Number(inputs.percentualAlimentista || 30);
  
  const percentual = percentualAlimentista / 100;
  const pensaoTotal = rendaMensal * percentual;
  const pensaoPorFilho = pensaoTotal / numeroFilhos;

  return {
    total: pensaoTotal,
    summary: `Pensão para ${numeroFilhos} filho(s) (CC Art. 1694).`,
    details: [
      { label: "Pensão Total", value: `R$ ${pensaoTotal.toFixed(2)}`, desc: `${(percentual * 100).toFixed(0)}% da renda` },
      { label: "Por Filho", value: `R$ ${pensaoPorFilho.toFixed(2)}`, desc: "Divisão igualitária" },
    ]
  };
};

// ===== PROCESSUAL =====

export const calculateHonorarios = async (inputs) => {
  const causaValor = Number(inputs.causaValor) || 0;
  const percentuais = { 'Baixa': 0.10, 'Média': 0.15, 'Alta': 0.20 };
  const percentual = percentuais[inputs.complexidade] || 0.10;
  const total = causaValor * percentual;

  return {
    total,
    summary: `Honorários advocatícios (Complexidade ${inputs.complexidade || 'Média'}).`,
    details: [
      { label: "Valor Causa", value: `R$ ${causaValor.toFixed(2)}`, desc: "Base de cálculo" },
      { label: "Honorários", value: `R$ ${total.toFixed(2)}`, desc: `${(percentual * 100).toFixed(0)}% do valor` },
    ]
  };
};

// ===== TRIBUTÁRIO =====

export const calculateSELIC = async (inputs) => {
  const valorDebito = Number(inputs.valorOriginal) || 0;
  const indices = await getCurrentIndices();
  const datIni = new Date(inputs.dataInicial);
  const datFim = new Date(inputs.dataFinal);

  if (isNaN(datIni.getTime()) || isNaN(datFim.getTime())) {
    throw new Error("Datas inicial ou final inválidas.");
  }

  const meses = Math.ceil((datFim.getTime() - datIni.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const taxaMensal = indices.SELIC / 100 / 12;
  const juros = valorDebito * taxaMensal * meses;

  return {
    total: valorDebito + juros,
    summary: `SELIC acumulada por ${meses} meses (Taxa média: ${(indices.SELIC / 12).toFixed(2)}% a.m.).`,
    details: [
      { label: "Débito Fiscal", value: `R$ ${valorDebito.toFixed(2)}`, desc: "Valor principal" },
      { label: "Juros SELIC", value: `R$ ${juros.toFixed(2)}`, desc: `${meses} meses acumulados` },
      { label: "Total a Pagar", value: `R$ ${(valorDebito + juros).toFixed(2)}`, desc: "Débito + SELIC" },
    ]
  };
};

export const calculatePrazoCPC = async (inputs) => {
  const datIni = new Date(inputs.dataInicial);
  if (isNaN(datIni.getTime())) throw new Error("Data inicial inválida.");

  let dias = 15;
  let baseLegal = "CPC Art. 1004";
  
  if (inputs.tipoPrazo === "Recurso") {
    dias = 15;
    baseLegal = "CPC Art. 1004 (Recurso)";
  } else if (inputs.tipoPrazo === "Contestação") {
    dias = 15;
    baseLegal = "CPC Art. 335 (Contestação)";
  } else if (inputs.tipoPrazo === "Embargos") {
    dias = 5;
    baseLegal = "CPC Art. 1023 (Embargos)";
  }

  const dataVencimento = new Date(datIni.getTime() + dias * 24 * 60 * 60 * 1000);

  return {
    total: dias,
    summary: `Prazo de ${dias} dias úteis (Simulação - Art. 219 CPC).`,
    details: [
      { label: "Data Evento", value: datIni.toLocaleDateString("pt-BR"), desc: "Dia do começo" },
      { label: "Prazo Legal", value: `${dias} dias`, desc: baseLegal },
      { label: "Vencimento", value: dataVencimento.toLocaleDateString("pt-BR"), desc: "Data limite estimada" },
    ]
  };
};
