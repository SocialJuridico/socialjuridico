"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  DEFAULT_LIMITS,
  EMPTY_OFFICE,
  EMPTY_STAFF,
} from "../utils/officeConstants";

function matchesPlanFilter(plan, filter) {
  const value = String(plan || "");

  if (filter === "ALL") return true;
  if (filter === "pro_plus") return value.startsWith("pro_plus");
  if (filter === "pro") {
    return value.startsWith("pro") && !value.startsWith("pro_plus");
  }
  if (filter === "start") return value.startsWith("start");

  return false;
}

export function useAdminOffices() {
  const router = useRouter();
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [dossierTab, setDossierTab] = useState("geral");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [officeForm, setOfficeForm] = useState({ ...EMPTY_OFFICE });
  const [staffForm, setStaffForm] = useState({ ...EMPTY_STAFF });
  const [limitsEdit, setLimitsEdit] = useState({ ...DEFAULT_LIMITS });
  const [planDraft, setPlanDraft] = useState("start");
  const [balanceDraft, setBalanceDraft] = useState(0);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadOffices = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/escritorios", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        toast.error(data?.message || "Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar os escritórios.",
        );
      }

      setOffices(data.data || []);
    } catch (error) {
      console.error("[Admin/Escritórios] Erro ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar escritórios.");
      toast.error(error.message || "Erro ao carregar escritórios.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  const filteredOffices = useMemo(() => {
    const term = search.trim().toLowerCase();

    return offices.filter((office) => {
      if (term) {
        const searchable = `${office.nome || ""} ${office.cnpj || ""} ${
          office.nome_responsavel || ""
        } ${office.email || ""}`.toLowerCase();

        if (!searchable.includes(term)) return false;
      }

      return matchesPlanFilter(office.plano, planFilter);
    });
  }, [offices, search, planFilter]);

  const summary = useMemo(
    () => ({
      total: offices.length,
      visible: filteredOffices.length,
      start: offices.filter((office) =>
        matchesPlanFilter(office.plano, "start"),
      ).length,
      pro: offices.filter((office) =>
        matchesPlanFilter(office.plano, "pro"),
      ).length,
      proPlus: offices.filter((office) =>
        matchesPlanFilter(office.plano, "pro_plus"),
      ).length,
      lawyerCapacity: offices.reduce(
        (sum, office) => sum + Number(office.max_advogados || 0),
        0,
      ),
      internCapacity: offices.reduce(
        (sum, office) => sum + Number(office.max_estagiarios || 0),
        0,
      ),
    }),
    [offices, filteredOffices.length],
  );

  const loadStaff = useCallback(async (officeId) => {
    setStaffLoading(true);

    try {
      const response = await fetch(
        `/api/admin/escritorios/funcionarios?escritorioId=${officeId}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar os membros.");
      }

      setStaff(data.data || []);
    } catch (error) {
      console.error("[Admin/Escritórios] Erro ao carregar membros:", error);
      toast.error(error.message || "Erro ao carregar membros.");
      setStaff([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const openOffice = useCallback(
    (office) => {
      setSelectedOffice(office);
      setDossierTab("geral");
      setLimitsEdit({ ...DEFAULT_LIMITS, ...(office.limites || {}) });
      setPlanDraft(office.plano || "start");
      setBalanceDraft(Number(office.balance || 0));
      loadStaff(office.id);
    },
    [loadStaff],
  );

  const syncOffice = useCallback((updatedOffice) => {
    setSelectedOffice(updatedOffice);
    setOffices((current) =>
      current.map((office) =>
        office.id === updatedOffice.id ? updatedOffice : office,
      ),
    );
    setLimitsEdit({ ...DEFAULT_LIMITS, ...(updatedOffice.limites || {}) });
    setPlanDraft(updatedOffice.plano || "start");
    setBalanceDraft(Number(updatedOffice.balance || 0));
  }, []);

  const createOffice = useCallback(
    async (event) => {
      event.preventDefault();
      setBusy(true);

      try {
        const response = await fetch("/api/admin/escritorios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(officeForm),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Erro ao cadastrar escritório.");
        }

        setOffices((current) => [data.data, ...current]);
        setOfficeForm({ ...EMPTY_OFFICE });
        setModal(null);
        toast.success(data.message || "Escritório cadastrado com sucesso.");
      } catch (error) {
        console.error("[Admin/Escritórios] Erro ao cadastrar:", error);
        toast.error(error.message || "Erro ao cadastrar escritório.");
      } finally {
        setBusy(false);
      }
    },
    [officeForm],
  );

  const updateOffice = useCallback(
    async (action, value, successMessage) => {
      if (!selectedOffice) return false;
      setBusy(true);

      try {
        const response = await fetch("/api/admin/escritorios", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedOffice.id,
            action,
            value,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Erro ao atualizar escritório.");
        }

        syncOffice(data.data);

        if (action === "UPDATE_PLAN") {
          await loadStaff(selectedOffice.id);
        }

        toast.success(
          successMessage || data.message || "Escritório atualizado.",
        );
        return true;
      } catch (error) {
        console.error("[Admin/Escritórios] Erro ao atualizar:", error);
        toast.error(error.message || "Erro ao atualizar escritório.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loadStaff, selectedOffice, syncOffice],
  );

  const savePlan = useCallback(
    () =>
      updateOffice(
        "UPDATE_PLAN",
        planDraft,
        "Plano e benefícios da equipe atualizados.",
      ),
    [planDraft, updateOffice],
  );

  const saveBalance = useCallback(
    () =>
      updateOffice(
        "UPDATE_GENERAL",
        { balance: Number(balanceDraft || 0) },
        "Saldo de Juris atualizado.",
      ),
    [balanceDraft, updateOffice],
  );

  const saveLimits = useCallback(
    () =>
      updateOffice(
        "UPDATE_LIMITS",
        limitsEdit,
        "Limites e bônus atualizados.",
      ),
    [limitsEdit, updateOffice],
  );

  const createStaff = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedOffice) return;
      setBusy(true);

      try {
        const response = await fetch("/api/admin/escritorios/funcionarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            escritorioId: selectedOffice.id,
            ...staffForm,
          }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Erro ao adicionar membro.");
        }

        setStaffForm({ ...EMPTY_STAFF });
        setModal(null);
        await loadStaff(selectedOffice.id);
        toast.success(data.message || "Membro adicionado com sucesso.");
      } catch (error) {
        console.error("[Admin/Escritórios] Erro ao adicionar membro:", error);
        toast.error(error.message || "Erro ao adicionar membro.");
      } finally {
        setBusy(false);
      }
    },
    [loadStaff, selectedOffice, staffForm],
  );

  const deleteOffice = useCallback(async () => {
    const office = modal?.office;
    if (!office) return;
    setBusy(true);

    try {
      const response = await fetch(`/api/admin/escritorios?id=${office.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Erro ao excluir escritório.");
      }

      setOffices((current) =>
        current.filter((item) => item.id !== office.id),
      );
      if (selectedOffice?.id === office.id) setSelectedOffice(null);
      setModal(null);
      toast.success(data.message || "Escritório excluído.");
    } catch (error) {
      console.error("[Admin/Escritórios] Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir escritório.");
    } finally {
      setBusy(false);
    }
  }, [modal, selectedOffice]);

  const uploadLogo = useCallback((file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setOfficeForm((current) => ({
        ...current,
        logo_url: reader.result,
      }));
      toast.success("Logo carregada localmente.");
    };
    reader.onerror = () => toast.error("Erro ao ler a imagem.");
    reader.readAsDataURL(file);
  }, []);

  return {
    offices,
    filteredOffices,
    summary,
    loading,
    loadError,
    search,
    planFilter,
    selectedOffice,
    dossierTab,
    staff,
    staffLoading,
    officeForm,
    staffForm,
    limitsEdit,
    planDraft,
    balanceDraft,
    modal,
    busy,
    setSearch,
    setPlanFilter,
    setSelectedOffice,
    setDossierTab,
    setOfficeForm,
    setStaffForm,
    setLimitsEdit,
    setPlanDraft,
    setBalanceDraft,
    setModal,
    loadOffices,
    openOffice,
    createOffice,
    createStaff,
    savePlan,
    saveBalance,
    saveLimits,
    deleteOffice,
    uploadLogo,
  };
}
