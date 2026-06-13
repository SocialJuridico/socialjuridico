"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import LawyerPlansModalHost from "@/components/LawyerPlans/LawyerPlansModalHost";
import { supabase } from "@/lib/supabase";

const LawyerSessionContext = createContext(null);
const PLAN_QUERY_VALUES = new Set([
  "plans",
  "planos",
  "plano",
  "pro",
  "upgrade",
  "true",
  "1",
]);

function readJson(response) {
  return response.json().catch(() => null);
}

function getCurrentLawyerRoute() {
  if (typeof window === "undefined") {
    return "/dashboard/advogado/oportunidade";
  }

  const route = `${window.location.pathname}${window.location.search}`;
  return route.startsWith("/dashboard/advogado")
    ? route
    : "/dashboard/advogado/oportunidade";
}

function shouldOpenPlansFromLocation() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const value =
    params.get("open") || params.get("modal") || params.get("planModal");

  return value
    ? PLAN_QUERY_VALUES.has(String(value).trim().toLowerCase())
    : false;
}

function parseNotificationMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function isUnreadMessageNotification(item) {
  if (!item || item.lida) return false;
  if (String(item.tipo || "").toUpperCase() === "MENSAGEM") return true;

  const meta = parseNotificationMeta(item.meta);
  return Boolean(meta.case_id || meta.caso_id);
}

export function LawyerSessionProvider({ children }) {
  const [profileData, setProfileData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const notificationIdsRef = useRef(new Set());

  const refreshProfile = useCallback(async () => {
    setSessionError("");
    try {
      const response = await fetch("/api/perfil", { cache: "no-store" });
      const data = await readJson(response);

      if (response.status === 401) {
        const redirectTo = encodeURIComponent(getCurrentLawyerRoute());
        window.location.href = `/login?redirectTo=${redirectTo}`;
        return null;
      }

      if (
        response.status === 403 ||
        data?.blocked ||
        data?.data?.oab_verification_status === "ERROR"
      ) {
        await supabase.auth.signOut();
        window.location.href = "/login?oab_error=true";
        return null;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar seu perfil.");
      }

      setProfileData(data.data);
      return data.data;
    } catch (error) {
      console.error("[Advogado/Session] Falha no perfil:", error);
      setSessionError(error.message || "Não foi possível carregar seu perfil.");
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notificacoes", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok || !data?.success) return;

      const items = data.data || [];
      setNotifications(items);
      notificationIdsRef.current = new Set(
        items.map((item) => item.id).filter(Boolean),
      );
    } catch (error) {
      console.error("[Advogado/Session] Falha nas notificações:", error);
    }
  }, []);

  const openPlansModal = useCallback(() => {
    setIsSidebarOpen(false);
    setIsPlansModalOpen(true);
  }, []);

  const closePlansModal = useCallback(() => {
    setIsPlansModalOpen(false);
  }, []);

  useEffect(() => {
    void Promise.all([refreshProfile(), refreshNotifications()]);
    if (shouldOpenPlansFromLocation()) setIsPlansModalOpen(true);
  }, [refreshNotifications, refreshProfile]);

  useEffect(() => {
    const handleOpenPlans = () => openPlansModal();
    const handleClosePlans = () => closePlansModal();

    window.addEventListener("sj:open-lawyer-plans", handleOpenPlans);
    window.addEventListener("sj:close-lawyer-plans", handleClosePlans);
    return () => {
      window.removeEventListener("sj:open-lawyer-plans", handleOpenPlans);
      window.removeEventListener("sj:close-lawyer-plans", handleClosePlans);
    };
  }, [closePlansModal, openPlansModal]);

  useEffect(() => {
    let channel;
    let cancelled = false;

    const subscribe = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;

      supabase.realtime.setAuth(session.access_token);
      channel = supabase
        .channel(`lawyer-session-notifications-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificacoes",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            const incoming = payload.new;
            if (!incoming?.id || notificationIdsRef.current.has(incoming.id)) {
              return;
            }
            notificationIdsRef.current.add(incoming.id);
            setNotifications((current) => [incoming, ...current]);
          },
        )
        .subscribe();
    };

    void subscribe();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("[Advogado/Session] Falha no logout:", error);
      toast.error("Não foi possível sair agora.");
    }
  }, []);

  const unreadMessagesCount = useMemo(
    () => notifications.filter(isUnreadMessageNotification).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      profileData,
      setProfileData,
      userName: profileData?.name || "Advogado",
      notifications,
      unreadMessagesCount,
      loadingProfile,
      sessionError,
      isSidebarOpen,
      setIsSidebarOpen,
      isPlansModalOpen,
      openPlansModal,
      closePlansModal,
      refreshProfile,
      refreshNotifications,
      logout,
    }),
    [
      closePlansModal,
      isPlansModalOpen,
      isSidebarOpen,
      loadingProfile,
      logout,
      notifications,
      openPlansModal,
      profileData,
      refreshNotifications,
      refreshProfile,
      sessionError,
      unreadMessagesCount,
    ],
  );

  return (
    <LawyerSessionContext.Provider value={value}>
      {children}
      <LawyerPlansModalHost
        isOpen={isPlansModalOpen}
        profileData={profileData}
        onClose={closePlansModal}
        onProfileRefresh={refreshProfile}
      />
    </LawyerSessionContext.Provider>
  );
}

export function useLawyerSession() {
  const context = useContext(LawyerSessionContext);
  if (!context) {
    throw new Error(
      "useLawyerSession deve ser utilizado dentro de LawyerSessionProvider.",
    );
  }
  return context;
}
