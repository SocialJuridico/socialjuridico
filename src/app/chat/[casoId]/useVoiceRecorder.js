"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useVoiceRecorder({ onComplete, onError }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    setSeconds(0);
  }, []);

  const start = useCallback(async () => {
    if (recording || typeof MediaRecorder === "undefined") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const cancelled = cancelledRef.current;
        const chunks = [...chunksRef.current];
        const type = recorder.mimeType || "audio/webm";
        chunksRef.current = [];
        cleanup();
        if (cancelled || !chunks.length) return;

        const file = new File(
          [new Blob(chunks, { type })],
          `mensagem-de-voz-${Date.now()}.webm`,
          { type },
        );
        await onComplete?.(file);
      };

      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setSeconds((current) => current + 1),
        1000,
      );
    } catch (error) {
      cleanup();
      onError?.(error);
    }
  }, [cleanup, onComplete, onError, recording]);

  const stopAndSend = useCallback(() => {
    if (!recorderRef.current || !recording) return;
    cancelledRef.current = false;
    recorderRef.current.stop();
    recorderRef.current = null;
  }, [recording]);

  const cancel = useCallback(() => {
    if (!recorderRef.current || !recording) return;
    cancelledRef.current = true;
    recorderRef.current.stop();
    recorderRef.current = null;
  }, [recording]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
      cleanup();
    },
    [cleanup],
  );

  return { recording, seconds, start, stopAndSend, cancel };
}
