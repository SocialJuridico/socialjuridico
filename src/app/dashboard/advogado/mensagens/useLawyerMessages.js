"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import {
  messageBelongsToConversation,
  parseMediaMessage,
  serializeMediaMessage,
} from "@/lib/messages/messagePresentation";
import { supabase } from "@/lib/supabase";
import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_INBOX = {
  conversations: [],
  summary: { total: 0, unread: 0, negotiating: 0, activeCases: 0 },
  limits: {
    conversations: 250,
    summaryMessages: 5000,
    conversationsTruncated: false,
    messagesTruncated: false,
  },
};

function readJson(response) {
  return response.json().catch(() => null);
}

function mergeMessage(list, incoming) {
  if (!incoming?.id) return list;
  const index = list.findIndex((message) => message.id === incoming.id);
  if (index === -1) return [...list, incoming];

  const next = [...list];
  next[index] = incoming;
  return next;
}

function requestUrl(conversation) {
  const params = new URLSearchParams({ caso_id: conversation.caseId });
  if (conversation.interestId) {
    params.set("interest_id", conversation.interestId);
  }
  return `/api/mensagens?${params.toString()}`;
}

export function useLawyerMessages() {
  const router = useRouter();
  const session = useLawyerSession();
  const [inbox, setInbox] = useState(EMPTY_INBOX);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [draft, setDraft] = useState("");
  const [showThreadMobile, setShowThreadMobile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inboxAbortRef = useRef(null);
  const threadAbortRef = useRef(null);
  const selectedRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const selectedConversation = useMemo(
    () =>
      inbox.conversations.find((conversation) => conversation.id === selectedId) ||
      null,
    [inbox.conversations, selectedId],
  );

  useEffect(() => {
    selectedRef.current = selectedConversation;
  }, [selectedConversation]);

  const updateSelectedQuery = useCallback(
    (conversation) => {
      const params = new URLSearchParams();
      if (conversation) {
        params.set("caso", conversation.caseId);
        if (conversation.interestId) {
          params.set("interest", conversation.interestId);
        }
      }
      const suffix = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/dashboard/advogado/mensagens${suffix}`, { scroll: false });
    },
    [router],
  );

  const chooseConversation = useCallback(
    (conversation, options = {}) => {
      if (!conversation) return;
      setSelectedId(conversation.id);
      setShowThreadMobile(true);
      if (options.updateUrl !== false) updateSelectedQuery(conversation);
    },
    [updateSelectedQuery],
  );

  const loadInbox = useCallback(
    async (options = {}) => {
      inboxAbortRef.current?.abort();
      const controller = new AbortController();
      inboxAbortRef.current = controller;
      if (!options.silent) setLoadingInbox(true);
      setError("");

      try {
        const response = await fetch("/api/advogado/mensagens", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJson(response);

        if (response.status === 401) {
          window.location.href =
            "/login?redirectTo=/dashboard/advogado/mensagens";
          return;
        }

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message || "Não foi possível carregar suas conversas.",
          );
        }

        const nextInbox = {
          ...EMPTY_INBOX,
          ...(payload.data || {}),
          conversations: Array.isArray(payload.data?.conversations)
            ? payload.data.conversations
            : [],
          summary: {
            ...EMPTY_INBOX.summary,
            ...(payload.data?.summary || {}),
          },
          limits: {
            ...EMPTY_INBOX.limits,
            ...(payload.data?.limits || {}),
          },
        };

        setInbox(nextInbox);
        setSelectedId((currentId) => {
          if (
            currentId &&
            nextInbox.conversations.some((conversation) => conversation.id === currentId)
          ) {
            return currentId;
          }

          let requested = null;
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const caseId = params.get("caso");
            const interestId = params.get("interest") || null;
            requested = nextInbox.conversations.find(
              (conversation) =>
                conversation.caseId === caseId &&
                String(conversation.interestId || "") === String(interestId || ""),
            );
          }

          return requested?.id || nextInbox.conversations[0]?.id || "";
        });
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[LawyerMessages] Falha no inbox:", loadError);
        setError(
          loadError.message || "Não foi possível carregar suas conversas.",
        );
      } finally {
        if (!controller.signal.aborted && !options.silent) setLoadingInbox(false);
      }
    },
    [],
  );

  const markRead = useCallback(
    async (conversation) => {
      if (!conversation) return;

      try {
        const response = await fetch("/api/advogado/mensagens", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: conversation.caseId,
            interestId: conversation.interestId,
          }),
        });
        const payload = await readJson(response);
        if (!response.ok || !payload?.success) return;

        setMessages((current) =>
          current.map((message) =>
            String(message.sender_id) === String(session.profileData?.id)
              ? message
              : { ...message, is_read: true },
          ),
        );
        setInbox((current) => {
          const target = current.conversations.find(
            (item) => item.id === conversation.id,
          );
          const removedUnread = Number(target?.unreadCount || 0);

          return {
            ...current,
            conversations: current.conversations.map((item) =>
              item.id === conversation.id ? { ...item, unreadCount: 0 } : item,
            ),
            summary: {
              ...current.summary,
              unread: Math.max(0, current.summary.unread - removedUnread),
            },
          };
        });
        await session.refreshNotifications();
      } catch (readError) {
        console.error("[LawyerMessages] Falha ao marcar leitura:", readError);
      }
    },
    [session],
  );

  const loadThread = useCallback(
    async (conversation, options = {}) => {
      if (!conversation) {
        setMessages([]);
        return;
      }

      threadAbortRef.current?.abort();
      const controller = new AbortController();
      threadAbortRef.current = controller;
      if (!options.silent) setLoadingThread(true);
      setThreadError("");

      try {
        const response = await fetch(requestUrl(conversation), {
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        const payload = await readJson(response);

        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message || "Não foi possível carregar esta conversa.",
          );
        }

        setMessages(Array.isArray(payload.data) ? payload.data : []);
        if (conversation.unreadCount > 0) void markRead(conversation);
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[LawyerMessages] Falha na conversa:", loadError);
        setThreadError(
          loadError.message || "Não foi possível carregar esta conversa.",
        );
      } finally {
        if (!controller.signal.aborted && !options.silent) setLoadingThread(false);
      }
    },
    [markRead],
  );

  useEffect(() => {
    void loadInbox();
    return () => inboxAbortRef.current?.abort();
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    void loadThread(selectedConversation);
  }, [loadThread, selectedConversation]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadInbox({ silent: true });
      if (selectedRef.current) {
        void loadThread(selectedRef.current, { silent: true });
      }
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadInbox, loadThread]);

  useEffect(() => {
    const conversation = selectedConversation;
    if (!conversation) return undefined;

    let channel;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (cancelled || !authSession?.access_token) return;

      supabase.realtime.setAuth(authSession.access_token);
      channel = supabase
        .channel(`lawyer-messages-${conversation.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "mensagens",
            filter: `caso_id=eq.${conversation.caseId}`,
          },
          (payload) => {
            const candidate = payload.new || payload.old;
            if (
              !messageBelongsToConversation(
                candidate,
                conversation.caseId,
                conversation.interestId,
              )
            ) {
              return;
            }

            if (payload.eventType === "DELETE") {
              setMessages((current) =>
                current.filter((message) => message.id !== payload.old?.id),
              );
            } else if (payload.new) {
              setMessages((current) => mergeMessage(current, payload.new));
            }

            void loadInbox({ silent: true });
            if (
              payload.new &&
              String(payload.new.sender_id) !== String(session.profileData?.id)
            ) {
              void markRead(conversation);
            }
          },
        )
        .subscribe();
    }

    void subscribe();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [
    loadInbox,
    markRead,
    selectedConversation,
    session.profileData?.id,
  ]);

  useEffect(
    () => () => {
      window.clearInterval(recordingTimerRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      recorder?.stream?.getTracks?.().forEach((track) => track.stop());
    },
    [],
  );

  const sendContent = useCallback(
    async (content, options = {}) => {
      const conversation = selectedRef.current;
      if (!conversation || sending) return false;

      setSending(true);
      try {
        const response = await fetch("/api/mensagens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caso_id: conversation.caseId,
            interest_id: conversation.interestId,
            content,
          }),
        });
        const payload = await readJson(response);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || "Não foi possível enviar a mensagem.");
        }

        setMessages((current) => mergeMessage(current, payload.data));
        if (!options.silentSuccess) toast.success("Mensagem enviada.");
        void loadInbox({ silent: true });
        return true;
      } catch (sendError) {
        console.error("[LawyerMessages] Falha no envio:", sendError);
        toast.error(sendError.message || "Não foi possível enviar a mensagem.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [loadInbox, sending],
  );

  const sendDraft = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;

    setDraft("");
    const sent = await sendContent(content, { silentSuccess: true });
    if (!sent) setDraft(content);
  }, [draft, sendContent]);

  const uploadFile = useCallback(
    async (file) => {
      const conversation = selectedRef.current;
      if (!conversation || !file || uploading) return false;

      if (file.size > 15 * 1024 * 1024) {
        toast.error("O arquivo excede o limite de 15 MB.");
        return false;
      }

      setUploading(true);
      const toastId = toast.loading("Enviando arquivo...");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("casoId", conversation.caseId);
        if (conversation.interestId) {
          formData.append("interestId", conversation.interestId);
        }

        const response = await fetch("/api/mensagens/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await readJson(response);

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || "Não foi possível enviar o arquivo.");
        }

        const content = serializeMediaMessage({
          fileUrl: payload.url,
          fileName: payload.fileName,
          fileType: payload.fileType,
        });
        const sent = await sendContent(content, { silentSuccess: true });
        if (!sent) throw new Error("O arquivo foi enviado, mas a mensagem falhou.");

        toast.success("Arquivo enviado.", { id: toastId });
        return true;
      } catch (uploadError) {
        console.error("[LawyerMessages] Falha no upload:", uploadError);
        toast.error(uploadError.message || "Não foi possível enviar o arquivo.", {
          id: toastId,
        });
        return false;
      } finally {
        setUploading(false);
      }
    },
    [sendContent, uploading],
  );

  const startRecording = useCallback(async () => {
    if (isRecording || uploading) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        window.clearInterval(recordingTimerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingSeconds(0);

        if (!audioChunksRef.current.length) return;
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([blob], `mensagem-de-voz-${Date.now()}.webm`, {
          type: mimeType,
        });
        await uploadFile(file);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
    } catch (recordError) {
      console.error("[LawyerMessages] Microfone indisponível:", recordError);
      toast.error("Não foi possível acessar o microfone.");
    }
  }, [isRecording, uploadFile, uploading]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.ondataavailable = null;
    recorder.onstop = () => {
      window.clearInterval(recordingTimerRef.current);
      recorder.stream.getTracks().forEach((track) => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);
    };
    recorder.stop();
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");

    return inbox.conversations.filter((conversation) => {
      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && conversation.unreadCount > 0) ||
        (filter === "NEGOTIATING" && conversation.mode === "NEGOTIATION") ||
        (filter === "CASE" && conversation.mode === "CASE");
      const haystack = [
        conversation.client?.name,
        conversation.case?.title,
        conversation.case?.area,
        conversation.lastMessage?.preview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return matchesFilter && (!normalizedSearch || haystack.includes(normalizedSearch));
    });
  }, [filter, inbox.conversations, search]);

  return {
    ...session,
    inbox,
    selectedConversation,
    selectedId,
    messages,
    filteredConversations,
    loadingInbox,
    loadingThread,
    sending,
    uploading,
    error,
    threadError,
    search,
    setSearch,
    filter,
    setFilter,
    draft,
    setDraft,
    showThreadMobile,
    setShowThreadMobile,
    isRecording,
    recordingSeconds,
    chooseConversation,
    reloadInbox: loadInbox,
    reloadThread: () => loadThread(selectedRef.current),
    sendDraft,
    uploadFile,
    startRecording,
    stopRecording,
    cancelRecording,
    parseMediaMessage,
  };
}
