"use client";

import {
  AlertTriangle,
  BriefcaseBusiness,
  Globe2,
  Megaphone,
  Radar,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import AdvogadoMesPopup from "@/components/AdvogadoMesPopup/AdvogadoMesPopup";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../Oportunidade.module.css";
import { useLawyerOpportunities } from "../useLawyerOpportunities";
import OpportunityBannerRail from "./OpportunityBannerRail";
import {
  InterestConfirmModal,
  OpportunityDetailsModal,
} from "./OpportunityModals";
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

export default function OpportunityDashboard() {
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
            Casos da plataforma
            <span className={styles.tabCount}>
              {controller.summary.available || 0}
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
