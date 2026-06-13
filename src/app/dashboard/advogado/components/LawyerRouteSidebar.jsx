"use client";

import {
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  Check,
  FileText,
  Globe,
  Lock,
  LogOut,
  MessageSquare,
  PenTool,
  Search,
  Shield,
  Sparkles,
  User,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";
import sidebarStyles from "./LawyerRouteSidebar.module.css";
import styles from "./LawyerShell.module.css";

const DIRECT_ROUTES = {
  indicacoes: {
    path: "/dashboard/advogado/indiqueganhe",
    activeRoute: "indiqueganhe",
  },
  oportunidades: {
    path: "/dashboard/advogado/oportunidade",
    activeRoute: "oportunidade",
  },
  "minhas-mensagens": {
    path: "/dashboard/advogado/mensagens",
    activeRoute: "mensagens",
  },
};

const PRIMARY_ITEMS = [
  { tab: "indicacoes", label: "Indique e Ganhe", icon: UserPlus },
  { tab: "oportunidades", label: "Oportunidades", icon: Globe },
  { tab: "minhas-mensagens", label: "Minhas Mensagens", icon: MessageSquare },
  { tab: "meus-casos", label: "Meus Casos", icon: Briefcase },
  { tab: "declarei-interesse", label: "Declarei Interesse", icon: Check },
  { tab: "anuncios-PREPOSTOS", label: "Anúncios de Serviços", icon: Zap },
];

const PREMIUM_ITEMS = [
  {
    tab: "assinatura",
    label: "Assinatura Digital",
    icon: PenTool,
    permission: "ferr_assinatura",
  },
  {
    tab: "crm",
    label: "Meus Clientes (CRM)",
    icon: Users,
    permission: "ferr_crm",
  },
  {
    tab: "docs",
    label: "IA Smart Docs",
    icon: FileText,
    permission: "ferr_smart_docs",
  },
  {
    tab: "blindagem",
    label: "Blindagem de Documentos",
    icon: Shield,
    permission: "ferr_blindagem",
  },
  {
    tab: "redator",
    label: "Redator IA",
    icon: Sparkles,
    permission: "ferr_redator_ia",
    legalOnly: true,
  },
  {
    tab: "agenda",
    label: "Agenda & Prazos",
    icon: Calendar,
    permission: "ferr_agenda",
  },
  {
    tab: "triagem",
    label: "Triagem de Casos",
    icon: Search,
    permission: "ferr_triagem",
  },
  {
    tab: "calculadora",
    label: "Calculadoras",
    icon: Calculator,
    permission: "ferr_calculadora",
    proOnly: true,
  },
  {
    tab: "juris",
    label: "Jurisprudência",
    icon: BookOpen,
    permission: "ferr_jurisprudencia",
    legalOnly: true,
    proOnly: true,
  },
];

const ACCOUNT_ITEMS = [
  { tab: "cartao-visitas", label: "Cartão Digital", icon: User },
  { tab: "perfil", label: "Meu Perfil", icon: User },
  { tab: "comunicacao", label: "Comunicação Interna", icon: MessageSquare },
  { tab: "documentacao", label: "Documentação", icon: BookOpen },
];

function getPermission(profile, item) {
  const cargo = profile?.cargo;
  const permissions = profile?.permissoes || {};

  if (item.legalOnly && cargo === "secretaria") return false;
  if (cargo !== "estagiario" || !item.permission) return true;
  return Boolean(permissions[item.permission]);
}

export default function LawyerRouteSidebar({ activeRoute }) {
  const router = useRouter();
  const {
    profileData,
    isSidebarOpen,
    setIsSidebarOpen,
    unreadMessagesCount,
    openPlansModal,
    logout,
  } = useLawyerSession();

  const planType = profileData?.plan_type || "FREE";
  const hasPremium =
    profileData?.is_premium === true ||
    planType === "START" ||
    planType === "PRO";

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function navigateTo(tab) {
    closeSidebar();

    const directRoute = DIRECT_ROUTES[tab];
    if (directRoute) {
      router.push(directRoute.path);
      return;
    }

    router.push(
      `/dashboard/advogado?legacy=1&tab=${encodeURIComponent(tab)}`,
    );
  }

  function navigatePremium(item) {
    if (!getPermission(profileData, item)) {
      toast.error(
        profileData?.cargo === "secretaria" && item.legalOnly
          ? "Acesso restrito para este perfil do escritório."
          : "Recurso bloqueado pelas permissões do escritório.",
      );
      return;
    }

    if (!hasPremium || (item.proOnly && planType !== "PRO")) {
      openPlansModal();
      return;
    }

    navigateTo(item.tab);
  }

  function renderItem(item, premium = false) {
    const Icon = item.icon;
    const isActive = DIRECT_ROUTES[item.tab]?.activeRoute === activeRoute;
    const allowed = !premium || getPermission(profileData, item);
    const planLocked =
      premium && (!hasPremium || (item.proOnly && planType !== "PRO"));

    return (
      <button
        key={item.tab}
        type="button"
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
        onClick={() =>
          premium ? navigatePremium(item) : navigateTo(item.tab)
        }
        aria-current={isActive ? "page" : undefined}
      >
        <Icon size={17} aria-hidden="true" />
        <span>{item.label}</span>
        {item.tab === "minhas-mensagens" && unreadMessagesCount > 0 && (
          <span className={styles.navBadge}>{unreadMessagesCount}</span>
        )}
        {premium && (!allowed || planLocked) && (
          <Lock size={12} className={styles.navLock} aria-label="Bloqueado" />
        )}
      </button>
    );
  }

  return (
    <aside
      className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
      aria-label="Navegação do advogado"
    >
      <header className={styles.brand}>
        <div className={styles.brandText}>
          <strong>Social Jurídico</strong>
          <span>Área do advogado</span>
        </div>
        <button
          type="button"
          className={styles.closeSidebar}
          onClick={closeSidebar}
          aria-label="Fechar menu"
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      {profileData?.nome_escritorio && (
        <div
          className={styles.workspaceBadge}
          title={profileData.nome_escritorio}
        >
          <Users size={15} aria-hidden="true" />
          <span>{profileData.nome_escritorio}</span>
        </div>
      )}

      <button
        type="button"
        className={`${styles.planBadge} ${sidebarStyles.planTrigger}`}
        onClick={openPlansModal}
        title="Ver planos disponíveis"
      >
        <Sparkles size={15} aria-hidden="true" />
        <span>Plano {hasPremium ? planType : "FREE"}</span>
      </button>

      <div className={styles.navScroll}>
        <nav className={styles.navGroup} aria-label="Navegação principal">
          <span className={styles.navLabel}>Navegação</span>
          {PRIMARY_ITEMS.map((item) => renderItem(item))}
        </nav>

        <nav
          className={styles.navGroup}
          aria-label="Ferramentas profissionais"
        >
          <span className={styles.navLabel}>Ferramentas profissionais</span>
          {PREMIUM_ITEMS.map((item) => renderItem(item, true))}
        </nav>

        <nav className={styles.navGroup} aria-label="Conta e suporte">
          <span className={styles.navLabel}>Conta e suporte</span>
          {ACCOUNT_ITEMS.map((item) => renderItem(item))}
          <button
            type="button"
            className={`${styles.navItem} ${styles.navItemDanger}`}
            onClick={logout}
          >
            <LogOut size={17} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
