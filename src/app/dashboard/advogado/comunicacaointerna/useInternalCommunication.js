"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";

import { useLawyerSession } from "../LawyerSessionContext";

const EMPTY_DATA = {
  user: null,
  canais: [],
  mensagens: [],
  participantesVoz: [],
};

const CHANNEL_TYPES = Object.freeze([
  { value: "texto", label: "Canal de texto" },
  { value: "voz", label: "Sala de voz" },
  { value: "video", label: "Sala de video" },
]);

function readJson(response) {
  return response.json().catch(() => null);
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function useInternalCommunication() {
  const { profileData, loadingProfile, sessionError } = useLawyerSession();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeMeetingRoom, setActiveMeetingRoom] = useState(null);
  const [message, setMessage] = useState("");
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({
    nome: "",
    tipo: "texto",
    limite: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const messageListRef = useRef(null);

  const officeId = profileData?.escritorio_id || null;
  const isOfficeAdmin = data.user?.cargo === "admin" || profileData?.cargo === "admin";

  const loadCommunication = useCallback(async () => {
    if (!officeId) {
      setLoading(false);
      return null;
    }

    setError("");
    try {
      const response = await fetch("/api/escritorio/comunicacao", {
        cache: "no-store",
      });
      const payload = await readJson(response);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel carregar a comunicacao.");
      }

      setData({
        user: payload.user || null,
        canais: payload.canais || [],
        mensagens: payload.mensagens || [],
        participantesVoz: payload.participantesVoz || [],
      });
      return payload;
    } catch (loadError) {
      console.error("[ComunicacaoInterna] Falha ao carregar:", loadError);
      setError(loadError.message || "Nao foi possivel carregar a comunicacao.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    if (!loadingProfile) {
      void loadCommunication();
    }
  }, [loadCommunication, loadingProfile]);

  useEffect(() => {
    if (!officeId) return undefined;

    const channel = supabase
      .channel(`escritorio-comunicacao-${officeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escritorio_mensagens",
          filter: `escritorio_id=eq.${officeId}`,
        },
        () => void loadCommunication(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escritorio_canais",
          filter: `escritorio_id=eq.${officeId}`,
        },
        () => void loadCommunication(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escritorio_voz_participantes",
          filter: `escritorio_id=eq.${officeId}`,
        },
        () => void loadCommunication(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCommunication, officeId]);

  useEffect(() => {
    const node = messageListRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [data.mensagens, activeChannelId]);

  const channelsByType = useMemo(() => {
    const result = { texto: [], voz: [], video: [] };
    for (const channel of data.canais || []) {
      if (result[channel.tipo]) result[channel.tipo].push(channel);
    }
    return result;
  }, [data.canais]);

  const currentTextChannel = useMemo(
    () => data.canais.find((channel) => channel.id === activeChannelId) || null,
    [activeChannelId, data.canais],
  );

  const currentMeeting = useMemo(
    () => data.canais.find((channel) => channel.id === activeMeetingRoom) || null,
    [activeMeetingRoom, data.canais],
  );

  const visibleMessages = useMemo(
    () =>
      (data.mensagens || []).filter(
        (item) => (item.canal_id || null) === (activeChannelId || null),
      ),
    [activeChannelId, data.mensagens],
  );

  const myVoice = useMemo(
    () =>
      (data.participantesVoz || []).find(
        (participant) => participant.member_id === profileData?.id,
      ) || null,
    [data.participantesVoz, profileData?.id],
  );

  const activeVoiceRoom = useMemo(
    () => data.canais.find((channel) => channel.id === myVoice?.canal_id) || null,
    [data.canais, myVoice?.canal_id],
  );

  async function postAction(body, successMessage) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/escritorio/comunicacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await readJson(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel executar a acao.");
      }
      if (successMessage) toast.success(successMessage);
      await loadCommunication();
      return payload;
    } catch (postError) {
      toast.error(postError.message || "Nao foi possivel executar a acao.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const mensagem = normalizeText(message, 2000);
    if (!mensagem) return;

    const payload = await postAction({
      action: "SEND_MESSAGE",
      channelId: activeChannelId,
      mensagem,
    });

    if (payload?.success) setMessage("");
  }

  async function createChannel(event) {
    event?.preventDefault();
    const nome = normalizeText(channelForm.nome, 60);
    if (!nome) {
      toast.error("Informe o nome do canal.");
      return;
    }

    const payload = await postAction(
      {
        action: "CREATE_CHANNEL",
        tipo: channelForm.tipo,
        nome,
        limite: Number(channelForm.limite || 0),
      },
      "Canal criado com sucesso.",
    );

    if (payload?.success) {
      setChannelForm({ nome: "", tipo: "texto", limite: 0 });
      setIsChannelModalOpen(false);
    }
  }

  async function deleteChannel(event, channelId) {
    event.stopPropagation();
    if (!window.confirm("Excluir este canal e suas mensagens?")) return;
    const payload = await postAction(
      { action: "DELETE_CHANNEL", channelId },
      "Canal excluido.",
    );
    if (payload?.success) {
      if (activeChannelId === channelId) setActiveChannelId(null);
      if (activeMeetingRoom === channelId) setActiveMeetingRoom(null);
    }
  }

  async function joinVoice(channelId) {
    await postAction(
      { action: "JOIN_VOICE", channelId },
      "Conectado a sala de voz.",
    );
  }

  async function leaveVoice() {
    await postAction({ action: "LEAVE_VOICE" }, "Voce saiu da sala de voz.");
  }

  async function toggleMute() {
    await postAction({
      action: "TOGGLE_MUTE",
      mutado: !myVoice?.mutado,
    });
  }

  function selectTextChannel(channelId) {
    setActiveChannelId(channelId || null);
    setActiveMeetingRoom(null);
  }

  function selectMeeting(channelId) {
    setActiveMeetingRoom(channelId);
    setActiveChannelId(null);
  }

  function openMeeting() {
    if (!currentMeeting || !officeId) return;
    const roomName = `sj-meet-${officeId}-${currentMeeting.id}`;
    window.open(
      `https://meet.jit.si/${roomName}#config.startWithVideoMuted=true`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return {
    profileData,
    loadingProfile,
    sessionError,
    loading,
    error,
    data,
    officeId,
    isOfficeAdmin,
    channelsByType,
    activeChannelId,
    activeMeetingRoom,
    currentTextChannel,
    currentMeeting,
    visibleMessages,
    message,
    messageListRef,
    isChannelModalOpen,
    channelForm,
    submitting,
    myVoice,
    activeVoiceRoom,
    channelTypes: CHANNEL_TYPES,
    setMessage,
    setChannelForm,
    setIsChannelModalOpen,
    loadCommunication,
    selectTextChannel,
    selectMeeting,
    sendMessage,
    createChannel,
    deleteChannel,
    joinVoice,
    leaveVoice,
    toggleMute,
    openMeeting,
  };
}
