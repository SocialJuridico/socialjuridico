"use client";

import {
  AlertTriangle,
  Archive,
  BriefcaseBusiness,
  Globe2,
  Megaphone,
  Radar,
  RefreshCw,
  ShieldCheck,
  Siren,
} from "lucide-react";

import AdvogadoMesPopup from "@/components/AdvogadoMesPopup/AdvogadoMesPopup";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { useLawyerSession } from "../../LawyerSessionContext";
import styles from "../Oportunidade.module.css";
import { useLawyerOpportunities } from "../useLawyerOpportunities";
import OpportunityBannerRail from "./OpportunityBannerRail";
import {
  InterestConfirmModal,
  OpportunityDetailsModal,
} from "./OpportunityModals";
import EmergencyOpportunities from "./EmergencyOpportunities";
import PlatformOpportunities from "./PlatformOpportunities";
import RadarPanel from "./RadarPanel";

function RouteLoading() {
  return (
    <section className={styles.panel} aria-live="polite">
      <div className={styles.stateBox}>
        <div className={styles.stateContent}>
          <RefreshCw size={26} className={styles.spinner} aria-hidden="true" />
          <h3>Preparando suas oportunidades</h3>
          <p>Carregando perfil, saldo e configurações de acesso.</p>
        </div>
      </div>
    </section>
  );
}

function OpportunityLocked({ onVerify }) {
  return (
    <LawyerDashboardShell
      activeRoute="oportunidade"
      title="Oportunidades"
      subtitle="Recurso exclusivo para advogados com OAB verificada"
      icon={Globe2}
    >
      <section className={styles.panel} aria-live="polite">
        <div className={styles.stateBox}>
          <div className={styles.stateContent}>
            <ShieldCheck size={30} aria-hidden="true" />
            <h3>Verifique sua OAB para acessar as Oportunidades</h3>
            <p>
              Esta área é exclusiva para advogados com a OAB verificada. Conclua a
              verificação com nosso suporte para liberar os casos publicados na
              plataforma e todos os demais benefícios.
            </p>
            <button type="button" className={styles.button} onClick={onVerify}>
              Verificar OAB
            </button>
          </div>
        </div>
      </section>
    </LawyerDashboardShell>
  );
}

export default function OpportunityDashboard() {
  const { oabVerified, openOabModal } = useLawyerSession();
  const controller = useLawyerOpportunities();
  const notice = controller.notices[0] || null;
  const balance = controller.profileData?.balance || 0;
  const busyInterest = Boolean(
    controller.pendingInterest &&
      controller.busyCaseId === controller.pendingInterest.id,
  );

  function requestInterest(item) {
    controller.setSelectedCase(null);
    controller.setPendingInterest(item);
  }

  if (!oabVerified) {
    return <OpportunityLocked onVerify={openOabModal} />;
  }

  return (
    <LawyerDashboardShell
      activeRoute="oportunidade"
      title="Oportunidades"
      subtitle="Casos publicados na plataforma e oportunidades públicas organizadas"
      icon={Globe2}
    >
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="opportunities-hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} aria-hidden="true" />
              Central profissional de oportunidades
            </span>
            <h2 id="opportunities-hero-title" className={styles.heroTitle}>
              Novos casos. <span>Novas possibilidades.</span>
            </h2>
            <p className={styles.heroDescription}>
              Analise oportunidades compatíveis com sua atuação, manifeste interesse
              com rastreabilidade e acompanhe publicações públicas organizadas pelo
              Radar Jurídico.
            </p>
          </div>

          <div className={styles.heroStats} aria-label="Resumo das oportunidades">
            <article className={styles.statCard}>
              <strong>{controller.summary.available || 0}</strong>
              <span>casos disponíveis na plataforma</span>
            </article>
            <article className={styles.statCard}>
              <strong>{controller.summary.negotiating || 0}</strong>
              <span>casos ainda disponíveis em negociação</span>
            </article>
            <article className={styles.statCard}>
              <strong>{controller.radarCount || 0}</strong>
              <span>oportunidades públicas no Radar</span>
            </article>
            <article className={styles.statCard}>
              <strong>{balance}</strong>
              <span>Juris disponíveis no seu saldo</span>
            </article>
          </div>
        </section>

        <nav className={styles.feedTabs} aria-label="Fontes de oportunidades">
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "platform" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("platform")}
            aria-pressed={controller.activeFeed === "platform"}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            Casos de Alta Intenção
            <span className={styles.tabCount}>
              {controller.tierCounts.alta || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "media" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("media")}
            aria-pressed={controller.activeFeed === "media"}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            Casos de Média Intenção
            <span className={styles.tabCount}>
              {controller.tierCounts.media || 0}
            </span>
          </button>
          {/* Aba "Oráculos Jurídicos" (baixa intenção) não é exibida aqui —
              este dashboard é exclusivo de advogados. Esses casos ainda são
              classificados e reservados no backend (tier ORACULO), prontos
              para uma futura tela própria dos Oráculos (estagiários/
              bacharéis sem OAB — ver triagemCliente.md seção 7). */}
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "legado" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("legado")}
            aria-pressed={controller.activeFeed === "legado"}
          >
            <Archive size={17} aria-hidden="true" />
            Casos sem Triagem
            <span className={styles.tabCount}>
              {controller.tierCounts.legado || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.feedTab} ${styles.feedTabEmergency} ${
              controller.activeFeed === "emergency" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("emergency")}
            aria-pressed={controller.activeFeed === "emergency"}
          >
            <Siren size={17} aria-hidden="true" />
            Emergências
            <span className={styles.tabCount}>
              {controller.emergencyCount || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "radar" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("radar")}
            aria-pressed={controller.activeFeed === "radar"}
          >
            <Radar size={17} aria-hidden="true" />
            Radar Jurídico
            <span className={styles.tabCount}>{controller.radarCount || 0}</span>
          </button>
        </nav>

        {notice && (
          <aside className={styles.noticeStrip} aria-label="Aviso importante">
            <Megaphone size={17} aria-hidden="true" />
            <span className={styles.noticeText}>
              <strong>{notice.titulo || "Aviso"}:</strong>{" "}
              {notice.mensagem ||
                notice.conteudo ||
                "Há uma nova comunicação disponível."}
            </span>
          </aside>
        )}

        {controller.sessionError && !controller.profileData ? (
          <section className={styles.panel} role="alert">
            <div className={styles.stateBox}>
              <div className={styles.stateContent}>
                <AlertTriangle size={36} aria-hidden="true" />
                <h3>Não foi possível carregar seu perfil</h3>
                <p>{controller.sessionError}</p>
                <button
                  type="button"
                  className={styles.button}
                  onClick={controller.refreshProfile}
                >
                  <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
                </button>
              </div>
            </div>
          </section>
        ) : controller.loadingProfile ? (
          <RouteLoading />
        ) : (
          <div className={styles.workspace}>
            <OpportunityBannerRail
              banners={controller.bannerGroups.left}
              loading={controller.supportLoading}
              side="esquerda"
            />

            {controller.activeFeed === "radar" ? (
              <RadarPanel />
            ) : controller.activeFeed === "emergency" ? (
              <EmergencyOpportunities controller={controller} />
            ) : (
              <PlatformOpportunities controller={controller} />
            )}

            <OpportunityBannerRail
              banners={controller.bannerGroups.right}
              loading={controller.supportLoading}
              side="direita"
            />
          </div>
        )}
      </div>

      <OpportunityDetailsModal
        item={controller.selectedCase}
        busy={Boolean(controller.busyCaseId)}
        onClose={() => controller.setSelectedCase(null)}
        onInterest={requestInterest}
      />
      <InterestConfirmModal
        item={controller.pendingInterest}
        balance={balance}
        busy={busyInterest}
        onClose={() => {
          if (!busyInterest) controller.setPendingInterest(null);
        }}
        onConfirm={controller.manifestInterest}
      />

      <AdvogadoMesPopup />
    </LawyerDashboardShell>
  );
}
