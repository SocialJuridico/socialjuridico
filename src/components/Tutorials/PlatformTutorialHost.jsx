"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, HelpCircle, PlayCircle, X } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  listTutorials,
  recordTutorialProgress,
} from "@/services/tutorialService";
import { resolveLawyerTutorialRoute } from "@/lib/platformTutorials/tutorialRoutes";
import styles from "./PlatformTutorialHost.module.css";

export default function PlatformTutorialHost({
  routeKey: explicitRouteKey = "",
  autoOpenEnabled = true,
}) {
  const pathname = usePathname();
  const [tutorials, setTutorials] = useState([]);
  const [current, setCurrent] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const shownRef = useRef(new Set());

  const routeKey = useMemo(() => {
    if (explicitRouteKey) return explicitRouteKey;
    const search = typeof window === "undefined" ? "" : window.location.search;
    return resolveLawyerTutorialRoute(pathname, search) || "";
  }, [explicitRouteKey, pathname]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listTutorials(routeKey);
      setTutorials(result.data || []);
      const automatic = autoOpenEnabled ? result.automatic || null : null;
      const automaticKey = automatic ? `${automatic.id}:${automatic.version}` : "";
      if (automatic && !shownRef.current.has(automaticKey)) {
        shownRef.current.add(automaticKey);
        setCurrent(automatic);
        void recordTutorialProgress(automatic, "SHOWN").catch(() => null);
      }
    } catch (requestError) {
      if (![401, 403].includes(requestError.status)) {
        setError(requestError.message || "Não foi possível carregar os tutoriais.");
      }
    } finally {
      setLoading(false);
    }
  }, [autoOpenEnabled, routeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!current) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        const position = Math.floor(videoRef.current?.currentTime || 0);
        void recordTutorialProgress(current, "DISMISSED", position).catch(() => null);
        setCurrent(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [current]);

  const openTutorial = useCallback((tutorial) => {
    setLibraryOpen(false);
    setCurrent(tutorial);
    const key = `${tutorial.id}:${tutorial.version}`;
    if (!shownRef.current.has(key) && tutorial.isNew) {
      shownRef.current.add(key);
      void recordTutorialProgress(tutorial, "SHOWN").catch(() => null);
    }
  }, []);

  const closeTutorial = useCallback(() => {
    if (!current) return;
    const position = Math.floor(videoRef.current?.currentTime || 0);
    void recordTutorialProgress(current, "DISMISSED", position).catch(() => null);
    setCurrent(null);
  }, [current]);

  const currentRouteTutorials = tutorials.filter((item) => item.routeKey === routeKey);
  const otherTutorials = tutorials.filter((item) => item.routeKey !== routeKey);

  return (
    <>
      <div className={styles.host}>
        {libraryOpen && (
          <section className={styles.library} aria-label="Tutoriais disponíveis">
            <header>
              <div>
                <span>Central de ajuda</span>
                <strong>Tutoriais da plataforma</strong>
              </div>
              <button type="button" onClick={() => setLibraryOpen(false)} aria-label="Fechar tutoriais">
                <X size={17} />
              </button>
            </header>
            {loading ? (
              <p className={styles.feedback}>Carregando tutoriais...</p>
            ) : error ? (
              <p className={styles.feedback}>{error}</p>
            ) : tutorials.length === 0 ? (
              <p className={styles.feedback}>Nenhum tutorial foi publicado para o seu perfil.</p>
            ) : (
              <div className={styles.tutorialList}>
                {currentRouteTutorials.length > 0 && <small>Nesta tela</small>}
                {currentRouteTutorials.map((tutorial) => (
                  <button key={tutorial.id} type="button" onClick={() => openTutorial(tutorial)}>
                    <PlayCircle size={18} />
                    <span><strong>{tutorial.title}</strong><small>{tutorial.isNew ? "Novo" : "Disponível para rever"}</small></span>
                  </button>
                ))}
                {otherTutorials.length > 0 && <small>Outros tutoriais</small>}
                {otherTutorials.map((tutorial) => (
                  <button key={tutorial.id} type="button" onClick={() => openTutorial(tutorial)}>
                    <BookOpen size={18} />
                    <span><strong>{tutorial.title}</strong><small>{tutorial.isNew ? "Novo" : "Já visualizado"}</small></span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        <button
          type="button"
          className={styles.floatingButton}
          onClick={() => setLibraryOpen((value) => !value)}
          aria-label="Abrir central de tutoriais"
          aria-expanded={libraryOpen}
        >
          <HelpCircle size={22} />
          {tutorials.some((item) => item.isNew) && <span aria-label="Novos tutoriais" />}
        </button>
      </div>

      {current && (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTutorial(); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="platform-tutorial-title">
            <header>
              <div><span>Tutorial · versão {current.version}</span><h2 id="platform-tutorial-title">{current.title}</h2>{current.description && <p>{current.description}</p>}</div>
              <button type="button" onClick={closeTutorial} aria-label="Fechar tutorial"><X size={19} /></button>
            </header>
            <div className={styles.videoWrap}>
              <video
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                src={current.playbackUrl}
                onEnded={() => {
                  void recordTutorialProgress(current, "COMPLETED", Math.floor(videoRef.current?.duration || 0)).catch(() => null);
                }}
                onPause={() => {
                  const position = Math.floor(videoRef.current?.currentTime || 0);
                  if (position > 0) void recordTutorialProgress(current, "PROGRESS", position).catch(() => null);
                }}
              >
                Seu navegador não oferece suporte à reprodução deste vídeo.
              </video>
            </div>
            <footer><button type="button" onClick={closeTutorial}>Fechar tutorial</button></footer>
          </section>
        </div>
      )}
    </>
  );
}
