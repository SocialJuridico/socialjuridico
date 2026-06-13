"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

function messageTime(message) {
  const value = new Date(message?.createdAt || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function mergeMessages(current, incoming) {
  const cache = new Map();
  [...current, ...incoming].forEach((message) => {
    if (!message?.id) return;
    cache.set(message.id, { ...(cache.get(message.id) || {}), ...message });
  });
  return [...cache.values()].sort((a, b) => messageTime(a) - messageTime(b));
}

export function useChatConversation() {
  const { casoId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interestId = searchParams.get("interest") || null;
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState({
    hasMore: false,
    nextCursor: null,
    limit: 50,
  });
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoStarting, setVideoStarting] = useState(false);
  const [videoJoiningId, setVideoJoiningId] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);
  const markingReadRef = useRef(false);

  const baseUrl = useMemo(
    () => `/api/chat/${encodeURIComponent(String(casoId || ""))}`,
    [casoId],
  );

  const querySuffix = useMemo(
    () => (interestId ? `?interest=${encodeURIComponent(interestId)}` : ""),
    [interestId],
  );

  const markRead = useCallback(async () => {
    if (markingReadRef.current) return;
    markingReadRef.current = true;
    try {
      await fetch(`${baseUrl}${querySuffix}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interestId,
          requestId: createRequestId(),
        }),
      });
      if (mountedRef.current) {
        setMessages((current) =>
          current.map((message) =>
            message.own ? message : { ...message, read: true },
          ),
        );
      }
    } finally {
      markingReadRef.current = false;
    }
  }, [baseUrl, interestId, querySuffix]);

  const loadLatest = useCallback(
    async ({ silent = false, replace = false } = {}) => {
      if (!casoId) return;
      if (!silent) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setLoading(true);
      }
      setError("");

      try {
        const response = await fetch(`${baseUrl}${querySuffix}`, {
          cache: "no-store",
          signal: silent ? undefined : abortRef.current?.signal,
        });
        const data = await readJson(response);

        if (response.status === 401) {
          const redirectTo = `/chat/${casoId}${
            interestId ? `?interest=${interestId}` : ""
          }`;
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível carregar a conversa.");
        }

        if (!mountedRef.current) return;
        setContext(data.data);
        setMessages((current) =>
          replace || !current.length
            ? data.data.messages || []
            : mergeMessages(current, data.data.messages || []),
        );
        setPagination(data.data.pagination || {});

        if (
          (data.data.messages || []).some(
            (message) => !message.own && !message.read,
          )
        ) {
          void markRead();
        }
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[Chat] Falha ao carregar:", loadError);
        if (!silent && mountedRef.current) {
          setError(
            loadError.message || "Não foi possível carregar a conversa.",
          );
        }
      } finally {
        if (!silent && mountedRef.current) setLoading(false);
      }
    },
    [baseUrl, casoId, interestId, markRead, querySuffix, router],
  );

  const loadOlder = useCallback(async () => {
    if (!pagination.hasMore || !pagination.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const joiner = querySuffix ? "&" : "?";
      const response = await fetch(
        `${baseUrl}${querySuffix}${joiner}cursor=${encodeURIComponent(
          pagination.nextCursor,
        )}`,
        { cache: "no-store" },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar mensagens antigas.",
        );
      }
      setMessages((current) =>
        mergeMessages(data.data.messages || [], current),
      );
      setPagination(data.data.pagination || {});
    } catch (loadError) {
      toast.error(
        loadError.message || "Não foi possível carregar mensagens antigas.",
      );
    } finally {
      setLoadingOlder(false);
    }
  }, [baseUrl, loadingOlder, pagination, querySuffix]);

  useEffect(() => {
    mountedRef.current = true;
    setMessages([]);
    setContext(null);
    void loadLatest({ replace: true });
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [loadLatest]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadLatest({ silent: true });
      }
    }, 3500);
    return () => window.clearInterval(interval);
  }, [loadLatest]);

  const sendText = useCallback(
    async (rawText) => {
      const text = String(rawText || "").trim();
      if (!text || sending || !context?.conversation?.canSend) return false;

      const requestId = createRequestId();
      const tempId = `temp-${requestId}`;
      const optimistic = {
        id: tempId,
        senderId: context.currentUser.id,
        own: true,
        read: false,
        createdAt: new Date().toISOString(),
        deleted: false,
        type: "TEXT",
        text,
        pending: true,
      };
      setMessages((current) => [...current, optimistic]);
      setSending(true);

      try {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interestId, requestId, text }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível enviar a mensagem.");
        }
        setMessages((current) =>
          mergeMessages(
            current.filter((message) => message.id !== tempId),
            [data.data],
          ),
        );
        return true;
      } catch (sendError) {
        setMessages((current) =>
          current.filter((message) => message.id !== tempId),
        );
        toast.error(
          sendError.message || "Não foi possível enviar a mensagem.",
        );
        return false;
      } finally {
        setSending(false);
      }
    },
    [baseUrl, context, interestId, sending],
  );

  const sendAttachment = useCallback(
    async (file) => {
      if (!file || uploading || !context?.conversation?.canSend) return false;
      setUploading(true);
      const toastId = toast.loading(
        file.type?.startsWith("audio/")
          ? "Enviando mensagem de voz..."
          : "Enviando arquivo...",
      );

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("requestId", createRequestId());
        if (interestId) formData.append("interestId", interestId);

        const response = await fetch(`${baseUrl}/attachments`, {
          method: "POST",
          body: formData,
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível enviar o arquivo.");
        }
        setMessages((current) => mergeMessages(current, [data.data]));
        toast.success("Arquivo enviado.", { id: toastId });
        return true;
      } catch (uploadError) {
        toast.error(
          uploadError.message || "Não foi possível enviar o arquivo.",
          { id: toastId },
        );
        return false;
      } finally {
        setUploading(false);
      }
    },
    [baseUrl, context, interestId, uploading],
  );

  const startVideo = useCallback(async () => {
    if (!context?.conversation?.canStartVideo || videoStarting) return null;
    setVideoStarting(true);
    try {
      const response = await fetch(`${baseUrl}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: createRequestId() }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível iniciar a videochamada.",
        );
      }
      setContext((current) =>
        current
          ? {
              ...current,
              currentUser: {
                ...current.currentUser,
                balance: data.data.newBalance,
              },
            }
          : current,
      );
      setActiveVideo(data.data);
      toast.success(data.message || "Videochamada iniciada.");
      void loadLatest({ silent: true });
      return data.data;
    } catch (videoError) {
      toast.error(
        videoError.message || "Não foi possível iniciar a videochamada.",
      );
      return null;
    } finally {
      setVideoStarting(false);
    }
  }, [baseUrl, context, loadLatest, videoStarting]);

  const joinVideo = useCallback(
    async (sessionId) => {
      if (!sessionId || videoJoiningId) return null;
      setVideoJoiningId(sessionId);
      try {
        const response = await fetch(`${baseUrl}/video`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            requestId: createRequestId(),
          }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível entrar na videochamada.",
          );
        }
        setActiveVideo(data.data);
        return data.data;
      } catch (videoError) {
        toast.error(
          videoError.message || "Não foi possível entrar na videochamada.",
        );
        return null;
      } finally {
        setVideoJoiningId(null);
      }
    },
    [baseUrl, videoJoiningId],
  );

  const askAssistant = useCallback(
    async ({ scope = "GLOBAL", messageId = null } = {}) => {
      if (assistantLoading) return;
      setAssistantOpen(true);
      setAssistantLoading(true);
      setAnalysis(null);
      try {
        const response = await fetch(`${baseUrl}/assistant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interestId,
            requestId: createRequestId(),
            scope,
            messageId,
          }),
        });
        const data = await readJson(response);
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível consultar o assistente.",
          );
        }
        setAnalysis(data.data);
      } catch (assistantError) {
        toast.error(
          assistantError.message ||
            "Não foi possível consultar o assistente.",
        );
      } finally {
        setAssistantLoading(false);
      }
    },
    [assistantLoading, baseUrl, interestId],
  );

  return {
    caseId: String(casoId || ""),
    interestId,
    context,
    messages,
    pagination,
    loading,
    loadingOlder,
    error,
    sending,
    uploading,
    videoStarting,
    videoJoiningId,
    activeVideo,
    assistantOpen,
    assistantLoading,
    analysis,
    reload: () => loadLatest({ replace: true }),
    loadOlder,
    sendText,
    sendAttachment,
    startVideo,
    joinVideo,
    closeVideo: () => setActiveVideo(null),
    askAssistant,
    closeAssistant: () => setAssistantOpen(false),
  };
}
