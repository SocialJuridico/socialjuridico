"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { supabase } from "@/lib/supabase";

const EMPTY_CASE_FORM = {
  titulo: "",
  area: "",
  descricao: "",
  cidade: "",
  estado: "",
  videoLink: "",
  shareOnFacebook: false,
};

const CLIENT_RULES = {
  ATTACHMENT: {
    maxCount: 5,
    maxSize: 10 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ],
  },
  VIDEO: {
    maxCount: 1,
    maxSize: 180 * 1024 * 1024,
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  },
  AUDIO: {
    maxCount: 1,
    maxSize: 25 * 1024 * 1024,
    mimeTypes: ["audio/webm", "audio/ogg", "audio/mpeg", "audio/mp4"],
  },
};

async function readJson(response) {
  return response.json().catch(() => null);
}

function fileKey(file) {
  return `${file.name}:${file.size}:${file.lastModified}:${Math.random()}`;
}

function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "audio/webm";

  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  ) || "audio/webm";
}

export function useCaseComposer({ onCreated }) {
  const [form, setForm] = useState(EMPTY_CASE_FORM);
  const [uploads, setUploads] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioTimerRef = useRef(null);
  const streamRef = useRef(null);

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const uploadsByCategory = useMemo(
    () => ({
      ATTACHMENT: uploads.filter((item) => item.category === "ATTACHMENT"),
      VIDEO: uploads.filter((item) => item.category === "VIDEO"),
      AUDIO: uploads.filter((item) => item.category === "AUDIO"),
    }),
    [uploads],
  );

  const hasPendingUploads = uploads.some((item) => item.status === "uploading");
  const hasFailedUploads = uploads.some((item) => item.status === "failed");
  const isDirty = useMemo(
    () =>
      Object.entries(form).some(([key, value]) =>
        key === "shareOnFacebook" ? value === true : String(value || "").trim(),
      ) || uploads.length > 0,
    [form, uploads.length],
  );

  useEffect(() => {
    if (!isDirty || submitting) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, submitting]);

  useEffect(
    () => () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    },
    [audioPreviewUrl],
  );

  const issueAndUpload = useCallback(async (file, category) => {
    const localId = fileKey(file);
    const optimistic = {
      localId,
      category,
      file,
      name: file.name,
      size: file.size,
      mime: file.type,
      status: "uploading",
      ticket: null,
    };
    setUploads((current) => [...current, optimistic]);

    try {
      const ticketResponse = await fetch("/api/client/case-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        }),
      });
      const ticketData = await readJson(ticketResponse);

      if (!ticketResponse.ok || !ticketData?.success) {
        throw new Error(
          ticketData?.message || "Não foi possível preparar o arquivo.",
        );
      }

      const ticket = ticketData.data;
      const { error: uploadError } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        await fetch(`/api/client/case-uploads?id=${ticket.id}`, {
          method: "DELETE",
        }).catch(() => null);
        throw new Error(uploadError.message || "Falha ao enviar o arquivo.");
      }

      setUploads((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "ready", ticket }
            : item,
        ),
      );

      return ticket;
    } catch (error) {
      setUploads((current) =>
        current.map((item) =>
          item.localId === localId
            ? { ...item, status: "failed", error: error.message }
            : item,
        ),
      );
      toast.error(error.message || "Não foi possível enviar o arquivo.");
      return null;
    }
  }, []);

  const addFiles = useCallback(
    async (fileList, category = "ATTACHMENT") => {
      const rules = CLIENT_RULES[category];
      const files = Array.from(fileList || []);
      const currentCount = uploadsByCategory[category].length;

      if (currentCount + files.length > rules.maxCount) {
        toast.error(
          category === "ATTACHMENT"
            ? "Você pode anexar no máximo cinco arquivos."
            : `Você pode anexar somente um ${category === "VIDEO" ? "vídeo" : "áudio"}.`,
        );
        return;
      }

      const validFiles = [];
      for (const file of files) {
        if (!rules.mimeTypes.includes(file.type)) {
          toast.error(`O formato de “${file.name}” não é permitido.`);
          continue;
        }
        if (file.size <= 0 || file.size > rules.maxSize) {
          toast.error(`O arquivo “${file.name}” excede o limite permitido.`);
          continue;
        }
        validFiles.push(file);
      }

      for (const file of validFiles) {
        await issueAndUpload(file, category);
      }
    },
    [issueAndUpload, uploadsByCategory],
  );

  const removeUpload = useCallback(
    async (localId) => {
      const item = uploads.find((upload) => upload.localId === localId);
      if (!item) return;

      setUploads((current) =>
        current.map((upload) =>
          upload.localId === localId
            ? { ...upload, status: "removing" }
            : upload,
        ),
      );

      try {
        if (item.ticket?.id) {
          const response = await fetch(
            `/api/client/case-uploads?id=${item.ticket.id}`,
            { method: "DELETE" },
          );
          const data = await readJson(response);
          if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Não foi possível remover o arquivo.");
          }
        }

        setUploads((current) =>
          current.filter((upload) => upload.localId !== localId),
        );

        if (item.category === "AUDIO" && audioPreviewUrl) {
          URL.revokeObjectURL(audioPreviewUrl);
          setAudioPreviewUrl(null);
        }
      } catch (error) {
        setUploads((current) =>
          current.map((upload) =>
            upload.localId === localId
              ? { ...upload, status: item.status }
              : upload,
          ),
        );
        toast.error(error.message || "Não foi possível remover o arquivo.");
      }
    },
    [audioPreviewUrl, uploads],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `relato-${Date.now()}.${extension}`, {
          type: mimeType.split(";")[0],
        });

        const previewUrl = URL.createObjectURL(blob);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(previewUrl);
        await addFiles([file], "AUDIO");
      };

      recorder.start(1000);
      setRecordingTime(0);
      setIsRecording(true);
      audioTimerRef.current = setInterval(
        () => setRecordingTime((current) => current + 1),
        1000,
      );
    } catch (error) {
      console.error("[Cliente/Áudio] Erro:", error);
      toast.error(
        "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
      );
    }
  }, [addFiles, audioPreviewUrl]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRecording(false);

    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
  }, [isRecording]);

  const reset = useCallback(() => {
    setForm(EMPTY_CASE_FORM);
    setUploads([]);
    setSubmitting(false);
    setRecordingTime(0);
    setIsRecording(false);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
  }, [audioPreviewUrl]);

  const shareCase = useCallback(async (payload) => {
    const siteUrl = "https://socialjuridico.com.br";
    const text = `⚖️ NOVO CASO JURÍDICO PUBLICADO NO SOCIAL JURÍDICO\n\n📌 TÍTULO: ${payload.titulo}\n📝 DESCRIÇÃO: ${payload.descricao}\n\n🌐 Veja mais em: ${siteUrl}`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto do caso copiado para a publicação.");
    } catch {
      // O compartilhamento continua mesmo quando o clipboard não está disponível.
    }

    const shareUrl = `${siteUrl}/compartilhar?t=${encodeURIComponent(payload.titulo)}&d=${encodeURIComponent(payload.descricao.slice(0, 150))}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank",
      "noopener,noreferrer,width=640,height=640",
    );
  }, []);

  const submit = useCallback(
    async (event) => {
      event?.preventDefault?.();

      if (hasPendingUploads) {
        toast.error("Aguarde a conclusão dos uploads antes de publicar.");
        return;
      }
      if (hasFailedUploads) {
        toast.error("Remova ou envie novamente os arquivos com falha.");
        return;
      }

      setSubmitting(true);
      try {
        const response = await fetch("/api/casos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: form.titulo,
            descricao: form.descricao,
            area_atuacao: form.area,
            cidade: form.cidade,
            estado: form.estado,
            video_link: form.videoLink || null,
            upload_ids: uploads
              .filter((item) => item.status === "ready" && item.ticket?.id)
              .map((item) => item.ticket.id),
          }),
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível publicar o caso.");
        }

        if (form.shareOnFacebook) {
          await shareCase({
            titulo: form.titulo,
            descricao: form.descricao,
          });
        }

        setSuccess(true);
        toast.success("Caso publicado e enviado aos advogados.");
        await onCreated?.(data.data);
        reset();
        setTimeout(() => setSuccess(false), 3000);
      } catch (error) {
        toast.error(error.message || "Não foi possível publicar o caso.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      form,
      hasFailedUploads,
      hasPendingUploads,
      onCreated,
      reset,
      shareCase,
      uploads,
    ],
  );

  return {
    form,
    uploads,
    uploadsByCategory,
    submitting,
    success,
    isRecording,
    recordingTime,
    audioPreviewUrl,
    hasPendingUploads,
    hasFailedUploads,
    isDirty,
    updateForm,
    addFiles,
    removeUpload,
    startRecording,
    stopRecording,
    submit,
    reset,
  };
}
