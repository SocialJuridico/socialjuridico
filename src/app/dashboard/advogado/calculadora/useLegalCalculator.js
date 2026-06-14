"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import * as CalcUtils from "@/lib/calculators";

import { useLawyerSession } from "../LawyerSessionContext";

export const CALCULATOR_GROUPS = [
  {
    title: "Trabalhista",
    items: [
      { id: "rescisao", label: "Rescisão Completa", description: "Saldo, férias, 13º, aviso e FGTS." },
      { id: "ferias", label: "Férias", description: "Férias, 1/3 e abono pecuniário." },
      { id: "hextras", label: "Horas Extras", description: "Hora extra, adicional e DSR informado." },
    ],
  },
  {
    title: "Cível e Tributário",
    items: [
      { id: "correcao", label: "Correção Monetária", description: "Atualização por índice anual de referência." },
      { id: "juros", label: "Juros Moratórios", description: "Juros simples por atraso." },
      { id: "selic", label: "Atualização SELIC", description: "Atualização fiscal por taxa SELIC de referência." },
      { id: "art523", label: "Multa Art. 523 CPC", description: "Principal + multa + honorários de 10%." },
    ],
  },
  {
    title: "Processual",
    items: [
      { id: "cpc", label: "Prazo CPC", description: "Contagem simples em dias úteis." },
      { id: "honorarios", label: "Honorários", description: "Percentual sobre valor econômico." },
    ],
  },
  {
    title: "Família e Previdenciário",
    items: [
      { id: "pensao", label: "Pensão Alimentícia", description: "Estimativa por percentual da renda." },
      { id: "prev", label: "Aposentadoria por Idade", description: "Elegibilidade urbana simplificada." },
    ],
  },
];

const DEFAULT_INPUTS = {
  salarioBase: "",
  dataAdmissao: "",
  dataRescisao: "",
  teveComissoes: "",
  temAviso: true,
  modalidadeRescisao: "sem_justa_causa",
  feriasVencidas: "0",
  fgtsDepositado: "",
  diasFeria: "30",
  abonoDias: "0",
  incluirTerco: true,
  horasExtrasMes: "",
  divisorHoras: "220",
  adicional: "50",
  dsrPercentual: "0",
  valorOriginal: "",
  dataInicial: "",
  dataFinal: "",
  indice: "IPCA",
  valorDevido: "",
  dataVencimento: "",
  dataPagamento: "",
  taxaJurosMensal: "1",
  dataNascimento: "",
  dataInicio: "",
  sexo: "M",
  rendaMensal: "",
  numeroFilhos: "1",
  percentualAlimentista: "30",
  causaValor: "",
  complexidade: "Média",
  percentualHonorarios: "",
  tipoPrazo: "Recurso",
};

const CALCULATORS = {
  rescisao: CalcUtils.calculateRescisaoCompleta,
  ferias: CalcUtils.calculateFerias,
  hextras: CalcUtils.calculateHorasExtras,
  correcao: CalcUtils.calculateCorrecaoMonetaria,
  juros: CalcUtils.calculateJurosMoratorios,
  selic: CalcUtils.calculateSELIC,
  cpc: CalcUtils.calculatePrazoCPC,
  prev: CalcUtils.calculateAposentadoriaIdade,
  pensao: CalcUtils.calculatePensaoAlimenticia,
  honorarios: CalcUtils.calculateHonorarios,
  art523: CalcUtils.calculateMultaArt523,
};

export function getCalculatorMeta(id) {
  return CALCULATOR_GROUPS.flatMap((group) => group.items).find((item) => item.id === id);
}

export function useLegalCalculator() {
  const session = useLawyerSession();
  const [activeCalculator, setActiveCalculator] = useState("rescisao");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const planType = String(session.profileData?.plan_type || "FREE").toUpperCase();
  const hasProAccess =
    planType === "PRO" ||
    planType === "ENTERPRISE_PRO" ||
    planType === "ENTERPRISE_PRO_PLUS" ||
    (session.profileData?.is_premium === true && planType === "FREE");
  const permissions = session.profileData?.permissoes || {};
  const canUse =
    hasProAccess &&
    (session.profileData?.cargo !== "estagiario" || permissions.ferr_calculadora === true);

  const activeMeta = useMemo(
    () => getCalculatorMeta(activeCalculator),
    [activeCalculator],
  );

  function updateInput(name, value) {
    setInputs((current) => ({ ...current, [name]: value }));
  }

  function selectCalculator(id) {
    setActiveCalculator(id);
    setResult(null);
  }

  function clearCurrent() {
    setResult(null);
    setInputs((current) => ({
      ...DEFAULT_INPUTS,
      indice: current.indice,
      tipoPrazo: current.tipoPrazo,
      complexidade: current.complexidade,
    }));
  }

  async function calculate() {
    const fn = CALCULATORS[activeCalculator];
    if (!fn) return;
    setCalculating(true);
    try {
      const nextResult = await fn(inputs);
      setResult(nextResult);
      toast.success("Cálculo realizado.");
    } catch (error) {
      toast.error(error.message || "Não foi possível calcular.");
    } finally {
      setCalculating(false);
    }
  }

  return {
    ...session,
    activeCalculator,
    activeMeta,
    inputs,
    result,
    calculating,
    canUse,
    hasProAccess,
    updateInput,
    selectCalculator,
    clearCurrent,
    calculate,
  };
}
