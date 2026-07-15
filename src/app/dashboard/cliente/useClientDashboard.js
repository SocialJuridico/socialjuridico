"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { updatePasswordAction } from "@/app/actions/authActions";
import { supabase } from "@/lib/supabase";

async function readJson(response) {
  return response.json().catch(() => null);
}

function parseMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function calculateSummary({ cases, interests, notifications, lawyers }) {
  return {
    totalCases: cases.length,
    activeCases: cases.filter((item) =>
      ["ABERTO", "NEGOCIANDO", "CONTRATADO"].includes(item.status),
    ).length,
    conversations: cases.filter((item) => Boolean(item.advogado_id)).length,
    interests: interests.length,
    unreadNotifications: notifications.filter((item) => !item.lida).length,
    lawyers: lawyers.length,
  };
}

export function useClientDashboard() {
  const [activeTab, setActiveTab] = useState("painel");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState(null);
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [interests, setInterests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({
    totalCases: 0,
    activeCases: 0,
    conversations: 0,
    interests: 0,
    unreadNotifications: 0,
    lawyers: 0,
  });
  const [onlineLawyerIds, setOnlineLawyerIds] = useState([]);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [expandedSpecialties, setExpandedSpecialties] = useState({});
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const notificationIdsRef = useRef(new Set());
  const notificationBootstrappedRef = useRef(false);

  const setDashboardData = useCallback((data) => {
    const nextProfile = data?.profile || null;
    const nextCases = data?.cases || [];
    const nextLawyers = data?.lawyers || [];
    const nextInterests = data?.interests || [];
    const nextNotifications = (data?.notifications || []).map((item) => ({
      ...item,
      meta: parseMeta(item.meta),
    }));

    setProfile(nextProfile);
    setCases(nextCases);
    setLawyers(nextLawyers);
    setInterests(nextInterests);
    setNotifications(nextNotifications);
    setSummary(
      data?.summary ||
        calculateSummary({
          cases: nextCases,
          interests: nextInterests,
          notifications: nextNotifications,
          lawyers: nextLawyers,
        }),
    );

    notificationIdsRef.current = new Set(
      nextNotifications.map((item) => item.id).filter(Boolean),
    );
    notificationBootstrappedRef.current = true;
  }, []);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/client/dashboard", {
          cache: "no-store",
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (response.status === 403) {
            window.location.href = "/dashboard/advogado";
            return;
          }
          throw new Error(data?.message || "Não foi possível carregar o painel.");
        }

        setDashboardData(data.data);
      } catch (error) {
        console.error("[Cliente/Dashboard] Falha ao carregar:", error);
        setLoadError(error.message || "Não foi possível carregar o painel.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [setDashboardData],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const sync = () => {
      setIsMobile(media.matches);
      if (media.matches) setSidebarCollapsed(true);
    };

    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!profile) return;

    const localCompleted =
      window.localStorage.getItem("sj_client_tutorial_completed") === "true";
    const shouldShow =
      profile.onboarding_complete !== true || localCompleted !== true;
    setShowOnboarding(shouldShow);
  }, [profile]);

  const showNotificationToast = useCallback((notification) => {
    toast.custom(
      (item) => (
        <button
          type="button"
          onClick={() => {
            setActiveTab("notificacoes");
            toast.dismiss(item.id);
          }}
          style={{
            display: "flex",
            gap: 10,
            maxWidth: 380,
            padding: 14,
            border: "1px solid rgba(212,175,55,.24)",
            borderRadius: 12,
            color: "#fff",
            background: "#111",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span aria-hidden="true">🔔</span>
          <span>
            <strong style={{ display: "block", marginBottom: 4 }}>
              {notification.titulo}
            </strong>
            <small style={{ color: "rgba(255,255,255,.55)" }}>
              {notification.mensagem}
            </small>
          </span>
        </button>
      ),
      { duration: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!profile?.id) return undefined;

    let notificationChannel;
    let presenceChannel;
    let cancelled = false;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;

      supabase.realtime.setAuth(session.access_token);

      notificationChannel = supabase
        .channel(`cliente-notificacoes-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificacoes",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const incoming = {
              ...payload.new,
              meta: parseMeta(payload.new?.meta),
            };
            if (!incoming.id || notificationIdsRef.current.has(incoming.id)) {
              return;
            }

            notificationIdsRef.current.add(incoming.id);
            setNotifications((current) => [incoming, ...current]);
            setSummary((current) => ({
              ...current,
              unreadNotifications: current.unreadNotifications + 1,
            }));
            showNotificationToast(incoming);
          },
        )
        .subscribe();

      const syncPresence = () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState();
        const ids = Object.values(state)
          .flat()
          .map((entry) => entry.user_id)
          .filter(Boolean);
        setOnlineLawyerIds([...new Set(ids)]);
      };

      presenceChannel = supabase
        .channel("lawyer-presence-room")
        .on("presence", { event: "sync" }, syncPresence)
        .on("presence", { event: "join" }, syncPresence)
        .on("presence", { event: "leave" }, syncPresence)
        .subscribe();
    };

    void setup();

    return () => {
      cancelled = true;
      if (notificationChannel) supabase.removeChannel(notificationChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
    };
  }, [profile?.id, showNotificationToast]);

  const groupedLawyers = useMemo(() => {
    const term = lawyerSearch.trim().toLowerCase();
    const groups = {};

    lawyers.forEach((lawyer) => {
      const name = String(lawyer.name || "").toLowerCase();
      const oab = String(lawyer.oab || "").toLowerCase();
      const specialties = String(lawyer.specialties || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (term && !name.includes(term) && !oab.includes(term)) return;

      specialties.forEach((specialty) => {
        if (!groups[specialty]) groups[specialty] = [];
        groups[specialty].push(lawyer);
      });
    });

    return groups;
  }, [lawyerSearch, lawyers]);

  const offices = useMemo(() => {
    const grouped = {};
    lawyers.forEach((lawyer) => {
      if (!lawyer.escritorio_id || !lawyer.nome_escritorio) return;
      if (!grouped[lawyer.escritorio_id]) {
        grouped[lawyer.escritorio_id] = {
          id: lawyer.escritorio_id,
          nome: lawyer.nome_escritorio,
          logo_url: lawyer.logo_escritorio,
          advogados: [],
        };
      }
      grouped[lawyer.escritorio_id].advogados.push(lawyer);
    });
    return Object.values(grouped);
  }, [lawyers]);

  const conversations = useMemo(
    () => cases.filter((item) => Boolean(item.advogado_id)),
    [cases],
  );

  const activeCase = useMemo(
    () =>
      cases.find((item) =>
        ["ABERTO", "NEGOCIANDO", "CONTRATADO"].includes(item.status),
      ) || cases[0] || null,
    [cases],
  );

  const refreshAfterMutation = useCallback(async () => {
    await loadDashboard({ silent: true });
  }, [loadDashboard]);

  const markNotificationRead = useCallback(async (notification) => {
    if (notification.lida) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, lida: true } : item,
      ),
    );
    setSummary((current) => ({
      ...current,
      unreadNotifications: Math.max(0, current.unreadNotifications - 1),
    }));

    await fetch("/api/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notification.id }),
    }).catch(() => null);
  }, []);

  const openNotification = useCallback(
    async (notification) => {
      await markNotificationRead(notification);
      const meta = parseMeta(notification.meta);
      const caseId = meta.caseId || meta.caso_id || meta.case_id;

      if (caseId) {
        window.location.href = `/chat/${caseId}`;
        return;
      }

      if (
        notification.link &&
        String(notification.link).startsWith("/") &&
        !String(notification.link).startsWith("//")
      ) {
        window.location.href = notification.link;
      }
    },
    [markNotificationRead],
  );

  const deleteNotification = useCallback(async (notificationId) => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/notificacoes?id=${encodeURIComponent(notificationId)}`,
        { method: "DELETE" },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível remover a notificação.");
      }

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );
      setModal(null);
      toast.success("Notificação removida.");
    } catch (error) {
      toast.error(error.message || "Não foi possível remover a notificação.");
    } finally {
      setBusy(false);
    }
  }, []);

  const clearNotifications = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/notificacoes?id=all", {
        method: "DELETE",
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível limpar as notificações.");
      }

      setNotifications([]);
      setSummary((current) => ({ ...current, unreadNotifications: 0 }));
      setModal(null);
      toast.success("Notificações limpas.");
    } catch (error) {
      toast.error(error.message || "Não foi possível limpar as notificações.");
    } finally {
      setBusy(false);
    }
  }, []);

  const openCaseEditor = useCallback((caseItem) => {
    setModal({
      type: "case-edit",
      item: caseItem,
      form: {
        titulo: caseItem.titulo || "",
        area: caseItem.area_atuacao || "",
        descricao: caseItem.descricao || "",
        cidade: caseItem.cidade || "",
        estado: caseItem.estado || "",
      },
    });
  }, []);

  const updateCase = useCallback(async () => {
    if (modal?.type !== "case-edit") return;
    setBusy(true);

    try {
      const response = await fetch("/api/casos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: modal.item.id,
          titulo: modal.form.titulo,
          area_atuacao: modal.form.area,
          descricao: modal.form.descricao,
          cidade: modal.form.cidade,
          estado: modal.form.estado,
          updated_at: modal.item.updated_at,
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível atualizar o caso.");
      }

      toast.success("Caso atualizado.");
      setModal(null);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error.message || "Não foi possível atualizar o caso.");
    } finally {
      setBusy(false);
    }
  }, [modal, refreshAfterMutation]);

  const changeCaseStatus = useCallback(
    async (caseItem, status) => {
      setBusy(true);
      try {
        const response = await fetch("/api/casos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: caseItem.id,
            status,
            updated_at: caseItem.updated_at,
          }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível atualizar o caso.");
        }

        toast.success(status === "FECHADO" ? "Caso finalizado." : "Caso atualizado.");
        setModal(null);
        await refreshAfterMutation();
      } catch (error) {
        toast.error(error.message || "Não foi possível atualizar o caso.");
      } finally {
        setBusy(false);
      }
    },
    [refreshAfterMutation],
  );

  const cancelCase = useCallback(
    async (caseItem) => {
      setBusy(true);
      try {
        const query = new URLSearchParams({
          id: caseItem.id,
          updated_at: caseItem.updated_at || "",
        });
        const response = await fetch(`/api/casos?${query.toString()}`, {
          method: "DELETE",
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível cancelar o caso.");
        }

        toast.success(data.message || "Caso cancelado.");
        setModal(null);
        setCases((current) => current.filter((item) => item.id !== caseItem.id));
        await refreshAfterMutation();
      } catch (error) {
        toast.error(error.message || "Não foi possível cancelar o caso.");
      } finally {
        setBusy(false);
      }
    },
    [refreshAfterMutation],
  );

  const respondInterest = useCallback(
    async (interest, action) => {
      setBusy(true);
      try {
        const response = await fetch("/api/casos/interesse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interestId: interest.id, action }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível processar a resposta.");
        }

        toast.success(data.message || "Resposta registrada.");
        if (action === "HIRE") {
          setModal({
            type: "rating",
            item: {
              advogado_id: interest.lawyer_id,
              advogado_nome: interest.lawyer_name,
              caso_id: interest.case_id,
              caso_titulo: interest.caso_titulo,
            },
            rating: 0,
            hover: 0,
            justification: "",
          });
        } else {
          setModal(null);
        }
        await refreshAfterMutation();
      } catch (error) {
        toast.error(error.message || "Não foi possível processar a resposta.");
      } finally {
        setBusy(false);
      }
    },
    [refreshAfterMutation],
  );

  const submitRating = useCallback(async () => {
    if (modal?.type !== "rating" || !modal.rating) return;
    setBusy(true);

    try {
      const response = await fetch("/api/avaliacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advogado_id: modal.item.advogado_id,
          caso_id: modal.item.caso_id,
          nota: modal.rating,
          justificativa: modal.justification,
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível enviar a avaliação.");
      }

      toast.success("Avaliação enviada. Obrigado pelo feedback.");
      setModal(null);
      await refreshAfterMutation();
    } catch (error) {
      toast.error(error.message || "Não foi possível enviar a avaliação.");
    } finally {
      setBusy(false);
    }
  }, [modal, refreshAfterMutation]);

  const openLawyer = useCallback((lawyer) => {
    setModal({ type: "lawyer", item: lawyer });
  }, []);

  const openOffice = useCallback((office) => {
    setModal({ type: "office", item: office });
  }, []);

  const openChatSelector = useCallback((lawyer) => {
    if (!lawyer.is_premium) {
      toast.error("Este profissional não aceita contato direto no momento.");
      return;
    }
    setModal({ type: "case-select", item: lawyer });
  }, []);

  const startChat = useCallback(async (lawyer, caseId) => {
    setBusy(true);
    try {
      const response = await fetch("/api/casos/cliente-iniciar-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, lawyerId: lawyer.id }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível iniciar a conversa.");
      }

      window.location.href = `/chat/${caseId}`;
    } catch (error) {
      toast.error(error.message || "Não foi possível iniciar a conversa.");
      setBusy(false);
    }
  }, []);

  const updateProfile = useCallback(
    async ({ name, phone, password }) => {
      setBusy(true);
      try {
        const response = await fetch("/api/client/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível atualizar o perfil.");
        }

        if (password) {
          const result = await updatePasswordAction(password);
          if (!result?.success) {
            throw new Error(result?.message || "Não foi possível atualizar a senha.");
          }
        }

        setProfile((current) => ({ ...current, ...data.data }));
        toast.success("Perfil atualizado com sucesso.");
        return true;
      } catch (error) {
        toast.error(error.message || "Não foi possível atualizar o perfil.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const requestAccountDeletion = useCallback(async () => {
    if (modal?.type !== "account-deletion") return;
    setBusy(true);

    try {
      const response = await fetch("/api/solicitacoes-exclusao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: modal.confirmedName,
          motivo: modal.reason,
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível registrar a solicitação.");
      }

      toast.success(data.message || "Solicitação registrada.");
      setModal({ type: "deletion-requested", item: data.data });
    } catch (error) {
      toast.error(error.message || "Não foi possível registrar a solicitação.");
    } finally {
      setBusy(false);
    }
  }, [modal]);

  const shareCase = useCallback(async (caseItem) => {
    if (!caseItem?.id) return;

    try {
      const response = await fetch(
        `/api/client/cases/${caseItem.id}/share`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar o link.");
      }

      const { shareUrl, description } = data.data;

      // Link público com card/preview (og:image) — mesmo comportamento do
      // painel do advogado. A descrição é a versão anonimizada gerada por IA,
      // sem dados sensíveis do relato original.
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${caseItem.titulo || "Meu caso"} — Social Jurídico`,
            text: description,
            url: shareUrl,
          });
          return;
        } catch (shareError) {
          if (shareError?.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link do caso copiado para compartilhar.");
      } catch {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer,width=640,height=640",
        );
      }
    } catch (error) {
      toast.error(error.message || "Não foi possível compartilhar este caso.");
    }
  }, []);

  const restartTour = useCallback(() => {
    window.localStorage.removeItem("sj_client_tutorial_completed");
    setActiveTab("painel");
    setShowOnboarding(true);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }, []);

  return {
    activeTab,
    sidebarCollapsed,
    isMobile,
    loading,
    loadError,
    profile,
    cases,
    lawyers,
    interests,
    notifications,
    summary,
    onlineLawyerIds,
    lawyerSearch,
    expandedSpecialties,
    groupedLawyers,
    offices,
    conversations,
    activeCase,
    modal,
    busy,
    showOnboarding,
    setActiveTab,
    setSidebarCollapsed,
    setLawyerSearch,
    setExpandedSpecialties,
    setModal,
    setShowOnboarding,
    loadDashboard,
    refreshAfterMutation,
    openNotification,
    deleteNotification,
    clearNotifications,
    openCaseEditor,
    updateCase,
    changeCaseStatus,
    cancelCase,
    respondInterest,
    submitRating,
    openLawyer,
    openOffice,
    openChatSelector,
    startChat,
    updateProfile,
    requestAccountDeletion,
    shareCase,
    restartTour,
    logout,
  };
}
