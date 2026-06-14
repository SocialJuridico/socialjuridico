"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLawyerSession } from "../LawyerSessionContext";
import {
  buildCaseReport,
  buildUsageItem,
  normalizePlanType,
} from "./dashboardUtils";

async function readJson(response) {
  return response.json().catch(() => null);
}

async function requestJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  return { response, data: await readJson(response) };
}

function settledValue(result) {
  return result.status === "fulfilled" ? result.value : null;
}

export function useLawyerDashboardHome() {
  const router = useRouter();
  const session = useLawyerSession();
  const [cases, setCases] = useState([]);
  const [summary, setSummary] = useState({ available: 0, negotiating: 0 });
  const [radar, setRadar] = useState({ data: [], pagination: { total: 0 } });
  const [clientsData, setClientsData] = useState(null);
  const [redatorData, setRedatorData] = useState(null);
  const [triageData, setTriageData] = useState(null);
  const [agendaData, setAgendaData] = useState(null);
  const [smartDocData, setSmartDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setWarnings([]);

    const results = await Promise.allSettled([
      requestJson("/api/advogado/oportunidades?page=1&limit=30"),
      requestJson("/api/radar?page=1&limit=6"),
      requestJson("/api/advogado/clientes?page=1&pageSize=1&status=all&scope=all"),
      requestJson("/api/advogado/redator-ia"),
      requestJson("/api/advogado/triagem"),
      requestJson("/api/advogado/agenda?page=1&pageSize=1"),
      requestJson("/api/advogado/smartdoc?page=1&pageSize=1&type=all&protection=all"),
    ]);

    const values = results.map(settledValue);
    if (values.some((item) => item?.response?.status === 401)) {
      router.replace(
        `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/dashboard")}`,
      );
      return;
    }

    const nextWarnings = [];
    const opportunities = values[0];
    if (opportunities?.response?.ok && opportunities.data?.success) {
      setCases(opportunities.data.data || []);
      setSummary(opportunities.data.summary || { available: 0, negotiating: 0 });
    } else {
      setCases([]);
      setSummary({ available: 0, negotiating: 0 });
      setError(
        opportunities?.data?.message ||
          "Não foi possível carregar o relatório de oportunidades.",
      );
    }

    const radarResult = values[1];
    if (radarResult?.response?.ok && radarResult.data?.success) {
      setRadar(radarResult.data);
    } else {
      setRadar({ data: [], pagination: { total: 0 } });
      nextWarnings.push("Radar Jurídico temporariamente indisponível.");
    }

    const optionalModules = [
      [2, "CRM", setClientsData],
      [3, "Redator IA", setRedatorData],
      [4, "Triagem IA", setTriageData],
      [5, "Agenda", setAgendaData],
      [6, "SmartDoc", setSmartDocData],
    ];

    for (const [index, label, setter] of optionalModules) {
      const item = values[index];
      if (item?.response?.ok && item.data?.success) {
        setter(item.data);
      } else {
        setter(item?.data || null);
        if (!item?.data?.upgradeRequired && !item?.data?.permissionDenied) {
          nextWarnings.push(`${label} sem métricas atualizadas.`);
        }
      }
    }

    setWarnings(nextWarnings);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(
    () => buildCaseReport(cases, summary),
    [cases, summary],
  );

  const usageItems = useMemo(() => {
    const crm = clientsData?.usage?.crmClients || {};
    const redator = redatorData?.usage || {};
    const triage = triageData?.usage || {};
    const agenda = agendaData?.governance?.quota || {};
    const storage = smartDocData?.usage || {};

    return [
      buildUsageItem("crm", "Clientes no CRM", crm),
      buildUsageItem("redator", "Minutas do Redator IA", redator),
      buildUsageItem("triagem", "Triagens inteligentes", triage),
      buildUsageItem(
        "agenda",
        "Registros de agenda",
        {
          used: agenda.used,
          limit: agenda.unlimited ? null : agenda.max,
          remaining: agenda.remaining,
        },
      ),
      buildUsageItem(
        "storage",
        "Armazenamento SmartDoc",
        {
          used: storage.usedStorageMb,
          limit: storage.storageLimitMb,
          remaining: storage.remainingStorageMb,
        },
        "MB",
      ),
    ];
  }, [agendaData, clientsData, redatorData, smartDocData, triageData]);

  const profile = session.profileData || {};
  const planType = normalizePlanType(profile);
  const firstName = String(profile.name || "Advogado").trim().split(/\s+/)[0];

  return {
    ...session,
    profile,
    firstName,
    planType,
    jurisBalance: Number(profile.balance || 0),
    cases,
    report,
    radarItems: radar.data || [],
    radarTotal: Number(radar.pagination?.total || 0),
    clientMetrics: clientsData?.metrics || {},
    usageItems,
    loading,
    error,
    warnings,
    reload: load,
  };
}
