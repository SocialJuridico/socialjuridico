"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Lock,
  Radar,
  RefreshCw,
} from "lucide-react";

import { useLawyerSession } from "../../LawyerSessionContext";
import styles from "../Oportunidade.module.css";
import { useRadarOpportunities } from "../useRadarOpportunities";
import RadarCard from "./RadarCard";
import RadarFilters from "./RadarFilters";
import { RadarAccessModal, RadarReportModal } from "./RadarModals";

function RadarSkeleton() {
  return (
    <div className={styles.loadingGrid} aria-label="Carregando Radar Jurídico">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={styles.loadingCard} aria-hidden="true" />
      ))}
    </div>
  );
}

export default function RadarPanel() {
  const session = useLawyerSession();
  const controller = useRadarOpportunities(true);
  const {
    pendingAccess,
    reportTarget,
    busyId,
    reporting,
    setPendingAccess,
    closeReport,
  } = controller;
  const modalOpen = Boolean(pendingAccess || reportTarget);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key !== "Escape" || busyId || reporting) return;
      setPendingAccess(null);
      closeReport();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busyId, closeReport, modalOpen, reporting, setPendingAccess]);

  return (
    <section className={styles.panel} aria-labelledby="radar-title">
      <div className={styles.radarNotice}>
        <Radar size={22} aria-hidden="true" />
        <div>
          <h3 id="radar-title">Radar Jurídico</h3>
          <p>
            Oportunidades identificadas em publicações públicas, organizadas por
            relevância. Confirme a origem e respeite as regras éticas da advocacia
            antes de qualquer contato.
          </p>
        </div>
      </div>

      <RadarFilters controller={controller} />

      <div className={styles.statusBar}>
        <span>
          <strong>{controller.pagination.total || 0}</strong> oportunidade(s)
          pública(s)
        </span>
        <span>Publicações permanecem por até 5 dias ou 5 acessos</span>
      </div>

      {controller.loading ? (
        <RadarSkeleton />
      ) : controller.error ? (
        <div className={styles.stateBox} role="alert">
          <div className={styles.stateContent}>
            <AlertTriangle size={34} aria-hidden="true" />
            <h3>Não foi possível carregar o Radar</h3>
            <p>{controller.error}</p>
            <button
              type="button"
              className={styles.button}
              onClick={controller.reload}
            >
              <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : controller.items.length === 0 ? (
        <div className={styles.stateBox}>
          <div className={styles.stateContent}>
            <Radar size={36} aria-hidden="true" />
            <h3>Nenhuma oportunidade pública encontrada</h3>
            <p>
              Ajuste os filtros ou retorne mais tarde para verificar novas detecções.
            </p>
            <button
              type="button"
              className={styles.buttonSecondary}
              onClick={controller.clearFilters}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      ) : (
        <div className={controller.isDemo ? styles.demoWrap : undefined}>
          <div className={controller.isDemo ? styles.demoContent : undefined}>
            <div className={styles.radarGrid}>
              {controller.items.map((item) => (
                <RadarCard key={item.id} item={item} controller={controller} />
              ))}
            </div>
          </div>

          {controller.isDemo && (
            <div className={styles.demoOverlay}>
              <div className={styles.demoCard}>
                <Lock size={28} aria-hidden="true" />
                <h3>Radar disponível nos planos START e PRO</h3>
                <p>
                  Ative um plano para visualizar a fonte, o resumo inteligente e
                  acessar a publicação original com controle de disponibilidade.
                </p>
                <button
                  type="button"
                  className={styles.button}
                  onClick={session.openPlansModal}
                >
                  Ver planos
                </button>
              </div>
            </div>
          )}

          {controller.pagination.pages > 1 && !controller.isDemo && (
            <nav className={styles.pagination} aria-label="Paginação do Radar">
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() =>
                  controller.setPage((current) => Math.max(1, current - 1))
                }
                disabled={controller.page <= 1}
              >
                <ChevronLeft size={15} aria-hidden="true" /> Anterior
              </button>
              <span>
                Página {controller.pagination.page} de {controller.pagination.pages}
              </span>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() =>
                  controller.setPage((current) =>
                    Math.min(controller.pagination.pages, current + 1),
                  )
                }
                disabled={controller.page >= controller.pagination.pages}
              >
                Próxima <ChevronRight size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      )}

      <RadarAccessModal
        controller={controller}
        balance={session.profileData?.balance}
      />
      <RadarReportModal controller={controller} />
    </section>
  );
}
