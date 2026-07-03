"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Phone,
  Siren,
  Video,
  X,
} from "lucide-react";

import { useEmergency } from "../useEmergency";
import styles from "../ClientDashboard.module.css";

// Detecta dispositivo móvel: ponteiro grosso (touch) + largura de tela pequena,
// com fallback pelo user agent. O botão de emergência é exclusivo do celular.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const coarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      const narrow = window.innerWidth <= 768;
      const uaMobile =
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
          navigator.userAgent || "",
        );
      setIsMobile((coarse && narrow) || uaMobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

function EmergencyResult({ emergency }) {
  const { status, result, error, reset } = emergency;

  const showPolice = status === "done" && result?.showPoliceButton;

  return (
    <div className={styles.emergencyOverlay} role="dialog" aria-modal="true">
      <section className={styles.emergencyModal}>
        <header className={styles.emergencyModalHeader}>
          <span className={styles.emergencyModalTitle}>
            <Siren size={18} aria-hidden="true" /> Emergência
          </span>
          {(status === "done" || status === "error") && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={reset}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </header>

        {(status === "uploading" || status === "analyzing") && (
          <div className={styles.emergencyProgress} aria-live="polite">
            <Loader2 size={30} className={styles.analysisSpinner} aria-hidden="true" />
            <strong>
              {status === "uploading"
                ? "Enviando seu vídeo com segurança…"
                : "A IA está analisando e publicando seu caso…"}
            </strong>
            <p>Não feche esta tela. Isso leva apenas alguns segundos.</p>
          </div>
        )}

        {status === "error" && (
          <div className={styles.emergencyProgress} aria-live="assertive">
            <span className={styles.emergencyErrorIcon}>
              <AlertTriangle size={28} aria-hidden="true" />
            </span>
            <strong>Não foi possível registrar a emergência</strong>
            <p>{error}</p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={reset}
            >
              Fechar e tentar novamente
            </button>
          </div>
        )}

        {status === "done" && result && (
          <div className={styles.emergencyResult}>
            {showPolice && (
              <a
                href="tel:190"
                className={styles.policeButton}
                aria-label="Ligar para a Polícia Militar 190"
              >
                <Phone size={26} aria-hidden="true" />
                <span>
                  <strong>LIGAR 190</strong>
                  <small>Polícia Militar — risco à vida detectado</small>
                </span>
              </a>
            )}

            <div className={styles.emergencySuccess}>
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <strong>Caso registrado e enviado aos advogados</strong>
                <p>{result.classificacao?.titulo}</p>
              </div>
            </div>

            <div className={styles.emergencyTags}>
              {result.classificacao?.prioridade &&
                result.classificacao.prioridade !== "NORMAL" && (
                  <span
                    className={`${styles.caseTag} ${
                      result.classificacao.prioridade === "URGENTE"
                        ? styles.caseTagUrgent
                        : styles.caseTagPreferencial
                    }`}
                  >
                    {result.classificacao.prioridadeLabel}
                  </span>
                )}
              {result.classificacao?.isSocial && (
                <span className={`${styles.caseTag} ${styles.caseTagSocial}`}>
                  {result.classificacao.tipoSocialLabel}
                </span>
              )}
            </div>

            {result.classificacao?.resumo && (
              <p className={styles.emergencySummary}>
                {result.classificacao.resumo}
              </p>
            )}

            <button
              type="button"
              className={styles.primaryButton}
              onClick={reset}
            >
              Concluir
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function EmergencyButton({ onPosted }) {
  const isMobile = useIsMobile();
  const inputRef = useRef(null);
  const emergency = useEmergency({ onPosted });

  if (!isMobile) return null;

  return (
    <>
      <button
        type="button"
        className={styles.emergencyFab}
        onClick={() => inputRef.current?.click()}
        aria-label="Botão de emergência — gravar vídeo agora"
      >
        <Siren size={22} aria-hidden="true" />
        <span>EMERGÊNCIA</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) emergency.start(file);
        }}
      />

      {emergency.open && <EmergencyResult emergency={emergency} />}
    </>
  );
}
