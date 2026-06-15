"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CLIENT_QUESTIONS,
  LAWYER_QUESTIONS,
  PLATFORM_UPDATE_QUESTIONS,
  SURVEY_TABS,
  getQuestionsByTab,
} from "../config/surveyQuestions";

const EMPTY_DATA = { advogados: [], clientes: [], atualizacao: [] };

function calculateAverage(item, questions) {
  if (!questions.length) return 0;
  const total = questions.reduce(
    (sum, question) => sum + Number(item?.[question.key] || 0),
    0,
  );
  return total / questions.length;
}

function calculateGroupAverage(items, questions) {
  if (!items.length) return 0;
  const total = items.reduce(
    (sum, item) => sum + calculateAverage(item, questions),
    0,
  );
  return total / items.length;
}

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

export function useAdminSurveys() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState(SURVEY_TABS.LAWYERS);
  const [expandedId, setExpandedId] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/pesquisas", {
        method: "GET",
        cache: "no-store",
      });
      const payload = await readJson(response);
      setData({
        advogados: payload.data?.advogados || [],
        clientes: payload.data?.clientes || [],
        atualizacao: payload.data?.atualizacao || [],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar pesquisas.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const stats = useMemo(() => {
    const lawyerAverage = calculateGroupAverage(data.advogados, LAWYER_QUESTIONS);
    const clientAverage = calculateGroupAverage(data.clientes, CLIENT_QUESTIONS);
    const platformUpdateAverage = calculateGroupAverage(
      data.atualizacao,
      PLATFORM_UPDATE_QUESTIONS,
    );
    const total =
      data.advogados.length + data.clientes.length + data.atualizacao.length;
    const overallAverage = total
      ? (
          lawyerAverage * data.advogados.length +
          clientAverage * data.clientes.length +
          platformUpdateAverage * data.atualizacao.length
        ) / total
      : 0;

    return {
      lawyerCount: data.advogados.length,
      clientCount: data.clientes.length,
      platformUpdateCount: data.atualizacao.length,
      total,
      lawyerAverage,
      clientAverage,
      platformUpdateAverage,
      overallAverage,
    };
  }, [data]);

  const activeItems =
    activeTab === SURVEY_TABS.LAWYERS
      ? data.advogados
      : activeTab === SURVEY_TABS.PLATFORM_UPDATE
        ? data.atualizacao
        : data.clientes;
  const activeQuestions = getQuestionsByTab(activeTab);

  const toggleExpanded = useCallback((id) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const generateAiSummary = useCallback(async () => {
    setGeneratingAi(true);
    const toastId = toast.loading("Analisando avaliações com IA...");

    try {
      const response = await fetch("/api/admin/pesquisas/summary", {
        method: "POST",
      });
      const payload = await readJson(response);
      setAiSummary(payload.data);
      toast.success("Resumo inteligente gerado com sucesso.", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao gerar resumo.";
      toast.error(message, { id: toastId });
    } finally {
      setGeneratingAi(false);
    }
  }, []);

  return {
    data,
    loading,
    loadError,
    activeTab,
    activeItems,
    activeQuestions,
    expandedId,
    aiSummary,
    generatingAi,
    stats,
    setActiveTab,
    toggleExpanded,
    loadSurveys,
    generateAiSummary,
    calculateAverage,
  };
}
