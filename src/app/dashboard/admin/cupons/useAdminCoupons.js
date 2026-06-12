"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  codigo: "",
  tipo: "PLANO_PRO",
  desconto_tipo: "PERCENTUAL",
  valor: "",
  limite_por_usuario: 1,
  limite_total: "",
  starts_at: "",
  expira_em: "",
  ativo: true,
  description: "",
};

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formFromCoupon(coupon) {
  return {
    codigo: coupon.codigo || "",
    tipo: coupon.tipo || "PLANO_PRO",
    desconto_tipo: coupon.desconto_tipo || "PERCENTUAL",
    valor: String(coupon.valor ?? ""),
    limite_por_usuario: coupon.limite_por_usuario || 1,
    limite_total: coupon.limite_total ?? "",
    starts_at: toDateTimeLocal(coupon.starts_at),
    expira_em: toDateTimeLocal(coupon.expira_em),
    ativo: coupon.ativo === true,
    description: coupon.description || "",
  };
}

function comparable(form) {
  if (!form) return "";
  return JSON.stringify({
    codigo: String(form.codigo || "").trim().toUpperCase(),
    tipo: form.tipo,
    desconto_tipo: form.desconto_tipo,
    valor: String(form.valor ?? ""),
    limite_por_usuario: String(form.limite_por_usuario ?? ""),
    limite_total: String(form.limite_total ?? ""),
    starts_at: form.starts_at || "",
    expira_em: form.expira_em || "",
    ativo: form.ativo === true,
    description: String(form.description || "").trim(),
  });
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useAdminCoupons() {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [auditAvailable, setAuditAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadCoupons = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/admin/cupons", { cache: "no-store" });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          if ([401, 403].includes(response.status)) {
            router.replace("/dashboard/cliente");
            return;
          }

          throw new Error(data?.message || "Não foi possível carregar os cupons.");
        }

        setCoupons(data.data || []);
        setSummary(data.summary || null);
        setRecentAudit(data.recentAudit || []);
        setAuditAvailable(data.auditAvailable !== false);
      } catch (error) {
        console.error("[Admin/Cupons] Falha ao carregar:", error);
        setLoadError(error.message || "Não foi possível carregar os cupons.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      if (typeFilter !== "all" && coupon.tipo !== typeFilter) return false;
      if (
        statusFilter !== "all" &&
        coupon.publication_status !== statusFilter
      ) {
        return false;
      }

      if (!term) return true;
      return [coupon.codigo, coupon.description, coupon.stripe_coupon_id]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term));
    });
  }, [coupons, search, statusFilter, typeFilter]);

  const ensureGovernance = useCallback(() => {
    if (auditAvailable) return true;
    toast.error("Execute as migrações de governança dos cupons antes desta operação.");
    return false;
  }, [auditAvailable]);

  const openCreate = useCallback(() => {
    if (!ensureGovernance()) return;
    setModal({
      type: "create",
      form: { ...EMPTY_FORM },
      originalForm: { ...EMPTY_FORM },
    });
  }, [ensureGovernance]);

  const openEdit = useCallback(
    (coupon) => {
      if (!ensureGovernance()) return;
      const form = formFromCoupon(coupon);
      setModal({
        type: "edit",
        item: coupon,
        form,
        originalForm: { ...form },
      });
    },
    [ensureGovernance],
  );

  const openArchive = useCallback(
    (coupon) => {
      if (!ensureGovernance()) return;
      setModal({ type: "archive", item: coupon, reason: "" });
    },
    [ensureGovernance],
  );

  const modalDirty = useMemo(() => {
    if (!modal?.form || !modal?.originalForm) return false;
    return comparable(modal.form) !== comparable(modal.originalForm);
  }, [modal]);

  useEffect(() => {
    if (!modalDirty) return undefined;

    const warnBeforeLeave = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [modalDirty]);

  const updateModalForm = useCallback((field, value) => {
    setModal((current) => {
      if (!current?.form) return current;
      return {
        ...current,
        form: { ...current.form, [field]: value },
      };
    });
  }, []);

  const closeModal = useCallback(() => {
    if (saving || busyId) return;

    if (
      modalDirty &&
      typeof window !== "undefined" &&
      !window.confirm("Descartar as alterações não salvas deste cupom?")
    ) {
      return;
    }

    setModal(null);
  }, [busyId, modalDirty, saving]);

  const saveCoupon = useCallback(async () => {
    if (!ensureGovernance() || !modal?.form) return;

    const startsAt = toIsoOrNull(modal.form.starts_at);
    const expiresAt = toIsoOrNull(modal.form.expira_em);
    if (startsAt === undefined || expiresAt === undefined) {
      toast.error("Informe datas válidas para a disponibilidade do cupom.");
      return;
    }

    const payload = {
      ...modal.form,
      codigo: String(modal.form.codigo || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ""),
      limite_por_usuario: Number(modal.form.limite_por_usuario),
      limite_total:
        modal.form.limite_total === "" || modal.form.limite_total === null
          ? null
          : Number(modal.form.limite_total),
      starts_at: startsAt,
      expira_em: expiresAt,
    };

    if (!payload.codigo || !payload.valor) {
      toast.error("Preencha o código e o valor do desconto.");
      return;
    }

    setSaving(true);
    try {
      const editing = modal.type === "edit";
      const response = await fetch("/api/admin/cupons", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                ...payload,
                id: modal.item.id,
                updated_at: modal.item.updated_at,
              }
            : payload,
        ),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível salvar o cupom.");
      }

      toast.success(data.message || "Cupom salvo.");
      setModal(null);
      await loadCoupons({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar o cupom.");
    } finally {
      setSaving(false);
    }
  }, [ensureGovernance, loadCoupons, modal]);

  const toggleCoupon = useCallback(
    async (coupon) => {
      if (!ensureGovernance()) return;

      setBusyId(coupon.id);
      try {
        const response = await fetch("/api/admin/cupons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: coupon.id,
            ativo: !coupon.ativo,
            updated_at: coupon.updated_at,
          }),
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível alterar o cupom.");
        }

        toast.success(data.message || "Cupom alterado.");
        await loadCoupons({ silent: true });
      } catch (error) {
        toast.error(error.message || "Não foi possível alterar o cupom.");
      } finally {
        setBusyId(null);
      }
    },
    [ensureGovernance, loadCoupons],
  );

  const archiveCoupon = useCallback(async () => {
    if (!ensureGovernance() || modal?.type !== "archive") return;

    const reason = String(modal.reason || "").trim();
    if (reason.length < 10) {
      toast.error("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }

    const coupon = modal.item;
    setBusyId(coupon.id);
    try {
      const response = await fetch("/api/admin/cupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coupon.id,
          reason,
          updated_at: coupon.updated_at,
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível arquivar o cupom.");
      }

      toast.success(data.message || "Cupom arquivado.");
      setModal(null);
      await loadCoupons({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível arquivar o cupom.");
    } finally {
      setBusyId(null);
    }
  }, [ensureGovernance, loadCoupons, modal]);

  const copyCode = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  }, []);

  return {
    coupons,
    filtered,
    summary,
    recentAudit,
    auditAvailable,
    loading,
    loadError,
    search,
    typeFilter,
    statusFilter,
    modal,
    modalDirty,
    saving,
    busyId,
    setSearch,
    setTypeFilter,
    setStatusFilter,
    setModal,
    openCreate,
    openEdit,
    openArchive,
    updateModalForm,
    closeModal,
    saveCoupon,
    toggleCoupon,
    archiveCoupon,
    copyCode,
    loadCoupons,
  };
}
