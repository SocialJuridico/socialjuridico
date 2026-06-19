"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  BellRing,
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  Check,
  FilePenLine,
  FileText,
  Globe,
  Home,
  Lock,
  LogOut,
  MessageSquare,
  MonitorSmartphone,
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

const SIDEBAR_SCROLL_KEY = "sj:lawyer-sidebar-scroll";

const DIRECT_ROUTES = {
  dashboard: { path: "/dashboard/advogado/dashboard", activeRoute: "dashboard" },
  indicacoes: { path: "/dashboard/advogado/indiqueganhe", activeRoute: "indiqueganhe" },
  oportunidades: { path: "/dashboard/advogado/oportunidade", activeRoute: "oportunidade" },
  "minhas-mensagens": { path: "/dashboard/advogado/mensagens", activeRoute: "mensagens" },
  "quero-site": { path: "/dashboard/advogado/queroumsite", activeRoute: "queroumsite" },
  "meus-casos": { path: "/dashboard/advogado/meuscasos", activeRoute: "meuscasos" },
  "declarei-interesse": { path: "/dashboard/advogado/declareiinteresse", activeRoute: "declareiinteresse" },
  "anuncios-PREPOSTOS": { path: "/dashboard/advogado/anuncioseservicos", activeRoute: "anuncioseservicos" },
  "anuncios-DILIGENCIAS": { path: "/dashboard/advogado/anuncioseservicos?categoria=DILIGENCIAS", activeRoute: "anuncioseservicos" },
  "anuncios-OUTROS": { path: "/dashboard/advogado/anuncioseservicos?categoria=OUTROS", activeRoute: "anuncioseservicos" },
  assinatura: { path: "/dashboard/advogado/assinaturadigital", activeRoute: "assinaturadigital" },
  notificacao: { path: "/dashboard/advogado/notificacaoextrajudicial", activeRoute: "notificacaoextrajudicial" },
  agenda: { path: "/dashboard/advogado/agenda", activeRoute: "agenda" },
  crm: { path: "/dashboard/advogado/meusclientes", activeRoute: "meusclientes" },
  processos: { path: "/dashboard/advogado/processos", activeRoute: "processos" },
  docs: { path: "/dashboard/advogado/smartdoc", activeRoute: "smartdoc" },
  blindagem: { path: "/dashboard/advogado/blindagemdedocumentos", activeRoute: "blindagemdedocumentos" },
  redator: { path: "/dashboard/advogado/redator-ia", activeRoute: "redator-ia" },
  "gerador-documentos": { path: "/dashboard/advogado/geradordedocumentos", activeRoute: "geradordedocumentos" },
  triagem: { path: "/dashboard/advogado/triagem", activeRoute: "triagem" },
  calculadora: { path: "/dashboard/advogado/calculadora", activeRoute: "calculadora" },
  juris: { path: "/dashboard/advogado/jurisprudencia", activeRoute: "jurisprudencia" },
  "cartao-visitas": { path: "/dashboard/advogado/cartaodigital", activeRoute: "cartaodigital" },
  perfil: { path: "/dashboard/advogado/meuperfil", activeRoute: "meuperfil" },
  comunicacao: { path: "/dashboard/advogado/comunicacaointerna", activeRoute: "comunicacaointerna" },
  documentacao: { path: "/dashboard/advogado/documentacao", activeRoute: "documentacao" },
};

const PRIMARY_ITEMS = [
  { tab: "dashboard", label: "Dashboard", icon: Home },
  { tab: "indicacoes", label: "Indique e Ganhe", icon: UserPlus },
  { tab: "oportunidades", label: "Oportunidades", icon: Globe },
  { tab: "minhas-mensagens", label: "Minhas Mensagens", icon: MessageSquare },
  { tab: "quero-site", label: "Quero um Site", icon: MonitorSmartphone },
  { tab: "meus-casos", label: "Meus Casos", icon: Briefcase },
  { tab: "declarei-interesse", label: "Declarei Interesse", icon: Check },
  { tab: "anuncios-PREPOSTOS", label: "Anúncios de Serviços", icon: Zap },
];

const PREMIUM_ITEMS = [
  { tab: "assinatura", label: "Assinatura Digital", icon: PenTool, permission: "ferr_assinatura" },
  { tab: "notificacao", label: "Notificação Extrajudicial", icon: BellRing, permission: "ferr_blindagem", ai: true },
  { tab: "crm", label: "Meus Clientes (CRM)", icon: Users, permission: "ferr_crm", ai: true },
  { tab: "processos", label: "Processos DataJud", icon: Briefcase, permission: "ferr_crm", ai: true },
  { tab: "docs", label: "IA Smart Docs", icon: FileText, permission: "ferr_smart_docs", ai: true },
  { tab: "blindagem", label: "Blindagem de Documentos", icon: Shield, permission: "ferr_blindagem", ai: true },
  { tab: "redator", label: "Redator IA", icon: Sparkles, permission: "ferr_redator_ia", legalOnly: true, ai: true },
  { tab: "gerador-documentos", label: "Gerador de Documentos", icon: FilePenLine, permission: "ferr_redator_ia", legalOnly: true, ai: true },
  { tab: "agenda", label: "Agenda & Prazos", icon: Calendar, permission: "ferr_agenda", ai: true },
  { tab: "triagem", label: "Triagem de Casos", icon: Search, permission: "ferr_triagem", ai: true },
  { tab: "calculadora", label: "Calculadoras", icon: Calculator, permission: "ferr_calculadora", proOnly: true },
  { tab: "juris", label: "JurisprudÃªncia", icon: BookOpen, permission: "ferr_jurisprudencia", legalOnly: true, proOnly: true, ai: true },
];

const ACCOUNT_ITEMS = [
  { tab: "cartao-visitas", label: "CartÃ£o Digital", icon: User },
  { tab: "perfil", label: "Meu Perfil", icon: User },
  { tab: "comunicacao", label: "ComunicaÃ§Ã£o Interna", icon: MessageSquare },
  { tab: "documentacao", label: "DocumentaÃ§Ã£o", icon: BookOpen },
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
  const navScrollRef = useRef(null);
  const {
    profileData,
    isSidebarOpen,
    setIsSidebarOpen,
    unreadMessagesCount,
    openPlansModal,
    logout,
  } = useLawyerSession();

  const planType = String(profileData?.plan_type || "FREE").toUpperCase();
  const hasPremium =
    profileData?.is_premium === true ||
    planType === "START" ||
    planType === "PRO" ||
    planType.startsWith("ENTERPRISE_");

  const readSavedSidebarScroll = useCallback(() => {
    const savedScroll = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0);
    return Number.isFinite(savedScroll) && savedScroll > 0 ? savedScroll : 0;
  }, []);

  const restoreSidebarScroll = useCallback(() => {
    const element = navScrollRef.current;
    if (!element) return;

    const savedScroll = readSavedSidebarScroll();
    if (Number.isFinite(savedScroll) && savedScroll > 0) {
      element.scrollTop = savedScroll;
    }
  }, [readSavedSidebarScroll]);

  useLayoutEffect(() => {
    restoreSidebarScroll();
    const frame = requestAnimationFrame(restoreSidebarScroll);
    const timer = window.setTimeout(restoreSidebarScroll, 90);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [activeRoute, hasPremium, planType, profileData?.escritorio_id, profileData?.nome_escritorio, restoreSidebarScroll]);

  useEffect(() => {
    const element = navScrollRef.current;
    if (!element) return undefined;

    const saveScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(element.scrollTop));
    };
    element.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      saveScroll();
      element.removeEventListener("scroll", saveScroll);
    };
  }, []);

  function saveSidebarScroll() {
    const element = navScrollRef.current;
    if (!element) return;
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(element.scrollTop));
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  function navigateTo(tab) {
    saveSidebarScroll();
    closeSidebar();
    const directRoute = DIRECT_ROUTES[tab];
    const path = directRoute
      ? directRoute.path
      : `/dashboard/advogado?legacy=1&tab=${encodeURIComponent(tab)}`;
    router.push(path);
    requestAnimationFrame(restoreSidebarScroll);
    window.setTimeout(restoreSidebarScroll, 120);
  }

  function navigatePremium(item) {
    if (!getPermission(profileData, item)) {
      toast.error(
        profileData?.cargo === "secretaria" && item.legalOnly
          ? "Acesso restrito para este perfil do escritÃ³rio."
          : "Recurso bloqueado pelas permissÃµes do escritÃ³rio.",
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
    const planLocked = premium && (!hasPremium || (item.proOnly && planType !== "PRO"));
    return (
      <button
        key={item.tab}
        type="button"
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
        onClick={() => (premium ? navigatePremium(item) : navigateTo(item.tab))}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon size={17} aria-hidden="true" />
        <span className={styles.navText}>{item.label}</span>
        {item.ai && (
          <span className={styles.navAiBadge} title="Recurso com inteligÃªncia artificial">
            IA
          </span>
        )}
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
    <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`} aria-label="NavegaÃ§Ã£o do advogado">
      <header className={styles.brand}>
        <div className={styles.brandText}><strong>Social JurÃ­dico</strong><span>Ãrea do advogado</span></div>
        <button type="button" className={styles.closeSidebar} onClick={closeSidebar} aria-label="Fechar menu"><X size={19} aria-hidden="true" /></button>
      </header>

      {profileData?.nome_escritorio && (
        <div className={styles.workspaceBadge} title={profileData.nome_escritorio}><Users size={15} aria-hidden="true" /><span>{profileData.nome_escritorio}</span></div>
      )}

      <button type="button" className={`${styles.planBadge} ${sidebarStyles.planTrigger}`} onClick={openPlansModal} title="Ver planos disponÃ­veis">
        <Sparkles size={15} aria-hidden="true" /><span>Plano {hasPremium ? planType : "FREE"}</span>
      </button>

      <div className={styles.navScroll} ref={navScrollRef}>
        <nav className={styles.navGroup} aria-label="NavegaÃ§Ã£o principal"><span className={styles.navLabel}>NavegaÃ§Ã£o</span>{PRIMARY_ITEMS.map((item) => renderItem(item))}</nav>
        <nav className={styles.navGroup} aria-label="Ferramentas profissionais"><span className={styles.navLabel}>Ferramentas profissionais</span>{PREMIUM_ITEMS.map((item) => renderItem(item, true))}</nav>
        <nav className={styles.navGroup} aria-label="Conta e suporte">
          <span className={styles.navLabel}>Conta e suporte</span>
          {ACCOUNT_ITEMS.filter((item) => item.tab !== "comunicacao" || Boolean(profileData?.escritorio_id)).map((item) => renderItem(item))}
          <button type="button" className={`${styles.navItem} ${styles.navItemDanger}`} onClick={logout}><LogOut size={17} aria-hidden="true" /><span>Sair</span></button>
        </nav>
      </div>
    </aside>
  );
}

