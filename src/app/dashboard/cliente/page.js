"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import AdvogadoMesPopup from "@/components/AdvogadoMesPopup/AdvogadoMesPopup";
import ClientTutorial from "@/components/Onboarding/ClientTutorial";
import PesquisaSatisfacaoClientePopup from "@/components/PesquisaSatisfacaoClientePopup/PesquisaSatisfacaoClientePopup";

import ClientCaseComposer from "./components/ClientCaseComposer";
import { ClientCases, ClientConversations } from "./components/ClientCases";
import ClientDirectory from "./components/ClientDirectory";
import ClientModalsGoverned from "./components/ClientModalsGoverned";
import ClientNotifications from "./components/ClientNotifications";
import ClientOverview from "./components/ClientOverview";
import ClientProfile from "./components/ClientProfile";
import ClientShell from "./components/ClientShell";
import ClientUsefulLinks from "./components/ClientUsefulLinks";
import { useCaseComposer } from "./useCaseComposer";
import { useClientDashboard } from "./useClientDashboard";
import styles from "./ClientDashboard.module.css";

const ACTIVE_CASE_STATUSES = new Set([
  "ABERTO",
  "NEGOCIANDO",
  "CONTRATADO",
  "EM_ANDAMENTO",
]);

function ActiveContent({ controller, composer }) {
  switch (controller.activeTab) {
    case "novo":
      return (
        <ClientCaseComposer
          composer={composer}
          onCancel={() => controller.setActiveTab("painel")}
        />
      );
    case "meus-casos":
      return <ClientCases controller={controller} />;
    case "profissionais":
      return <ClientDirectory controller={controller} />;
    case "conversas":
      return <ClientConversations controller={controller} />;
    case "notificacoes":
      return <ClientNotifications controller={controller} />;
    case "perfil":
      return <ClientProfile controller={controller} />;
    case "links-uteis":
      return <ClientUsefulLinks />;
    case "painel":
    default:
      return <ClientOverview controller={controller} />;
  }
}

export default function ClientDashboardPage() {
  const baseController = useClientDashboard();
  const activeCases = baseController.cases.filter((item) =>
    ACTIVE_CASE_STATUSES.has(item.status),
  );
  const controller = {
    ...baseController,
    activeCase: activeCases[0] || baseController.cases[0] || null,
    summary: {
      ...baseController.summary,
      totalCases: baseController.cases.length,
      activeCases: activeCases.length,
      conversations: baseController.cases.filter((item) => item.advogado_id)
        .length,
      interests: baseController.interests.length,
      unreadNotifications: baseController.notifications.filter(
        (item) => !item.lida,
      ).length,
      lawyers: baseController.lawyers.length,
    },
  };
  const composer = useCaseComposer({
    onCreated: async () => {
      await controller.refreshAfterMutation();
      controller.setActiveTab("painel");
    },
  });

  if (controller.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando sua área jurídica</h1>
        <p>Sincronizando casos, conversas, profissionais e notificações.</p>
      </main>
    );
  }

  if (controller.loadError && !controller.profile) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar seu painel</h1>
        <p>{controller.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.loadDashboard()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <ClientShell controller={controller}>
      {controller.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Alguns dados podem estar desatualizados</strong>
            <p>{controller.loadError}</p>
          </div>
          <button type="button" onClick={() => controller.loadDashboard()}>
            Atualizar
          </button>
        </div>
      )}

      <ActiveContent controller={controller} composer={composer} />

      {controller.showOnboarding && (
        <ClientTutorial
          activeTab={controller.activeTab}
          setActiveTab={controller.setActiveTab}
          onComplete={() => controller.setShowOnboarding(false)}
        />
      )}

      <ClientModalsGoverned controller={controller} />
      <AdvogadoMesPopup />
      <PesquisaSatisfacaoClientePopup />
    </ClientShell>
  );
}
