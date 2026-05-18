"use client";

import React from "react";
import { useDashboard } from "../DashboardContext";
import styles from "../Dashboard.module.css";
import {
  Menu,
  Sparkles,
  UserPlus,
  Globe,
  MessageSquare,
  Briefcase,
  Check,
  Zap,
  ChevronDown,
  Users,
  PlusCircle,
  FileText,
  Shield,
  Calendar,
  Search,
  Calculator,
  BookOpen,
  User,
  LogOut,
  Lock,
  Eye,
  PenTool
} from "lucide-react";

export default function Sidebar() {
  const {
    activeTab,
    isSidebarOpen,
    setIsSidebarOpen,
    profileData,
    setShowProModal,
    handleTabChange,
    unreadMessagesCount,
    showAnunciosSubmenu,
    setShowAnunciosSubmenu,
    logout
  } = useDashboard();

  const isPremiumUser = profileData?.is_premium || profileData?.plan_type === 'START' || profileData?.plan_type === 'PRO';

  // Permissões de estagiário
  const isEstagiario = profileData?.cargo === "estagiario";
  const perms = profileData?.permissoes || {};

  const hasAssinaturaAccess = !isEstagiario || !!perms.ferr_assinatura;
  const hasCrmAccess = !isEstagiario || !!perms.ferr_crm;
  const hasSmartDocsAccess = !isEstagiario || !!perms.ferr_smart_docs;
  const hasBlindagemAccess = !isEstagiario || !!perms.ferr_blindagem;
  const hasRedatorIaAccess = !isEstagiario || !!perms.ferr_redator_ia;
  const hasAgendaAccess = !isEstagiario || !!perms.ferr_agenda;
  const hasTriagemAccess = !isEstagiario || !!perms.ferr_triagem;
  const hasCalculadoraAccess = !isEstagiario || !!perms.ferr_calculadora;
  const hasJurisprudenciaAccess = !isEstagiario || !!perms.ferr_jurisprudencia;

  // Import alert handling toast directly if not present
  const handleTabClick = (tabName, allowed) => {
    if (!allowed) {
      const toastModule = require("react-hot-toast").default;
      toastModule.error("Recurso premium bloqueado pelo Administrador do Escritório.");
      return;
    }
    handleTabChange(tabName);
  };

  return (
    <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarActive : ""}`}>
      <div className={styles.sidebarHeader}>
        <button 
          className={styles.mobileToggle}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={24} />
        </button>
        <div className={styles.logoWrapper}>
          <span className={styles.logoText}>SocialJurídico</span>
          <span className={styles.logoSub}>Advogado</span>
        </div>
      </div>

      {profileData?.nome_escritorio && (
        <div 
          style={{
            background: "rgba(0, 180, 216, 0.08)",
            border: "1px solid rgba(0, 180, 216, 0.25)",
            borderRadius: "8px",
            padding: "6px 12px",
            margin: "0 16px 10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#00b4d8",
            fontSize: "0.82rem",
            fontWeight: 600
          }}
        >
          <Users size={14} style={{ flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profileData.nome_escritorio}
          </span>
        </div>
      )}

      {profileData?.is_premium || profileData?.plan_type === 'START' ? (
        <div className={`${styles.premiumActiveBadge} ${profileData?.plan_type === 'START' ? styles.startActiveBadge : ''}`}>
          <Sparkles size={14} /> Plano {profileData?.plan_type === 'START' ? 'START' : 'PRO'} Ativo
        </div>
      ) : (
        <button
          className={styles.premiumBtn}
          onClick={() => setShowProModal(true)}
        >
          Seja Premium
        </button>
      )}

      <div className={styles.sidebarScroll}>
        {/* CONSUMO DO PLANO */}
        <div className={styles.usageSection}>
          <div className={styles.navGroupLabel}>Uso do Plano ({profileData?.plan_type || 'FREE'})</div>
          
          {/* IA Generator Usage */}
          {(() => {
            const planType = profileData?.plan_type || 'FREE';
            const baseLimit = planType === 'PRO' ? 200 : (planType === 'START' ? 20 : 0);
            const totalLimit = baseLimit + (profileData?.extra_redator_ia || 0);
            const usage = profileData?.uso_redator_ia || 0;
            const percent = totalLimit > 0 ? (usage / totalLimit) * 100 : 0;
            
            return (
              <div className={styles.usageItem}>
                <div className={styles.usageHeader}>
                  <span>Redator IA</span>
                  <span>{usage} / {totalLimit}</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div 
                    className={styles.usageBarFill} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}

          {/* CRM Usage */}
          {(() => {
            const planType = profileData?.plan_type || 'FREE';
            const totalLimit = planType === 'PRO' ? Infinity : (planType === 'START' ? 10 : 0);
            const usage = profileData?.crm_count || 0;
            const percent = totalLimit > 0 ? (usage / (totalLimit === Infinity ? 1000 : totalLimit)) * 100 : 0;
            
            return (
              <div className={styles.usageItem}>
                <div className={styles.usageHeader}>
                  <span>Clientes CRM</span>
                  <span>{usage} / {totalLimit === Infinity ? '∞' : totalLimit}</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div 
                    className={styles.usageBarFill} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}

          {/* Triagem Usage */}
          {(() => {
            const planType = profileData?.plan_type || 'FREE';
            const baseLimit = planType === 'PRO' ? 200 : (planType === 'START' ? 10 : 0);
            const totalLimit = baseLimit + (profileData?.extra_triagem || 0);
            const usage = profileData?.uso_triagem || 0;
            const percent = totalLimit > 0 ? (usage / totalLimit) * 100 : 0;
            
            return (
              <div className={styles.usageItem}>
                <div className={styles.usageHeader}>
                  <span>Triagem IA</span>
                  <span>{usage} / {totalLimit}</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div 
                    className={styles.usageBarFill} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}

          {/* Agenda Usage */}
          {(() => {
            const planType = profileData?.plan_type || 'FREE';
            const totalLimit = planType === 'PRO' ? Infinity : (planType === 'START' ? 30 : 0);
            const usage = profileData?.uso_agenda || 0;
            const percent = totalLimit > 0 ? (usage / (totalLimit === Infinity ? 1000 : totalLimit)) * 100 : 0;
            
            return (
              <div className={styles.usageItem}>
                <div className={styles.usageHeader}>
                  <span>Agenda</span>
                  <span>{usage} / {totalLimit === Infinity ? '∞' : totalLimit}</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div 
                    className={styles.usageBarFill} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}

          {/* Storage Usage (Smart Docs) */}
          {(() => {
            const planType = profileData?.plan_type || 'FREE';
            const baseLimit = planType === 'PRO' ? 10240 : (planType === 'START' ? 500 : 0); // 10GB vs 500MB
            const totalLimit = baseLimit + (profileData?.extra_storage_mb || 0);
            const usage = profileData?.uso_storage_mb || 0;
            const percent = totalLimit > 0 ? (usage / totalLimit) * 100 : 0;
            
            return (
              <div className={styles.usageItem}>
                <div className={styles.usageHeader}>
                  <span>Armazenamento (IA)</span>
                  <span>{usage >= 1024 ? (usage/1024).toFixed(1) + 'GB' : usage + 'MB'} / {totalLimit >= 1024 ? (totalLimit/1024).toFixed(0) + 'GB' : totalLimit + 'MB'}</span>
                </div>
                <div className={styles.usageBarBg}>
                  <div 
                    className={styles.usageBarFill} 
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>
              </div>
            );
          })()}
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroupLabel}>Navegação</div>
          <div
            className={`${styles.navItem} ${activeTab === "indicacoes" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("indicacoes")}
          >
            <UserPlus size={18} /> <span>Indique e Ganhe</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "oportunidades" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("oportunidades")}
          >
            <Globe size={18} /> <span>Oportunidades</span>
          </div>
          <div className={styles.navItemWrapper}>
            <div
              className={`${styles.navItem} ${activeTab === "minhas-mensagens" ? styles.activeNavItem : ""}`}
              onClick={() => handleTabChange("minhas-mensagens")}
              style={{ width: "100%" }}
            >
              <MessageSquare size={18} />
              <span>Minhas Mensagens</span>
            </div>
            {unreadMessagesCount > 0 && (
              <div className={`${styles.unreadBadge} ${styles.unreadBadgeActive}`}>
                {unreadMessagesCount}
              </div>
            )}
          </div>

          <div
            className={`${styles.navItem} ${activeTab === "quero-site" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("quero-site")}
            style={{ border: '1px solid rgba(212, 175, 55, 0.3)', background: 'rgba(212, 175, 55, 0.05)' }}
          >
            <Globe size={18} color="var(--color-gold)" /> <span style={{ color: 'var(--color-gold)', fontWeight: '800' }}>QUERO UM SITE</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "meus-casos" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("meus-casos")}
          >
            <Briefcase size={18} /> <span>Meus Casos</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "declarei-interesse" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("declarei-interesse")}
          >
            <Check size={18} /> <span>Declarei Interesse</span>
          </div>

          <div
            className={`${styles.anunciosNav}`}
            onClick={() => setShowAnunciosSubmenu(!showAnunciosSubmenu)}
          >
            <Zap size={18} fill="currentColor" />
            <span>Anúncios de Serviços</span>
            <ChevronDown 
              size={16} 
              style={{ marginLeft: "auto", transform: showAnunciosSubmenu ? "rotate(180deg)" : "none", transition: "0.2s" }} 
            />
          </div>
          
          {showAnunciosSubmenu && (
            <div className={styles.anuncioSubmenu}>
              <div 
                className={`${styles.subNavItem} ${activeTab === "anuncios-PREPOSTOS" ? styles.activeSubNav : ""}`}
                onClick={() => handleTabChange("anuncios-PREPOSTOS")}
              >
                <Users size={14} />
                <span>PREPOSTOS</span>
              </div>
              <div 
                className={`${styles.subNavItem} ${activeTab === "anuncios-DILIGENCIAS" ? styles.activeSubNav : ""}`}
                onClick={() => handleTabChange("anuncios-DILIGENCIAS")}
              >
                <Briefcase size={14} />
                <span>DILIGÊNCIAS</span>
              </div>
              <div 
                className={`${styles.subNavItem} ${activeTab === "anuncios-OUTROS" ? styles.activeSubNav : ""}`}
                onClick={() => handleTabChange("anuncios-OUTROS")}
              >
                <PlusCircle size={14} />
                <span>OUTROS</span>
              </div>
            </div>
          )}

          <div className={styles.navGroupLabel}>Ferramentas Premium</div>
          <div
            className={`${styles.navItem} ${activeTab === "assinatura" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("assinatura", hasAssinaturaAccess)}
          >
            <PenTool size={18} /> <span>Assinatura Digital</span>
            {(!isPremiumUser || !hasAssinaturaAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasAssinaturaAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "crm" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("crm", hasCrmAccess)}
          >
            <Users size={18} /> <span>Meus Clientes (CRM)</span>
            {(!isPremiumUser || !hasCrmAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasCrmAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "docs" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("docs", hasSmartDocsAccess)}
          >
            <FileText size={18} /> <span>IA Smart Docs</span>
            {(!isPremiumUser || !hasSmartDocsAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasSmartDocsAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "blindagem" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("blindagem", hasBlindagemAccess)}
          >
            <Shield size={18} /> <span>Blindagem de Documentos</span>
            {(!isPremiumUser || !hasBlindagemAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasBlindagemAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "redator" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("redator", hasRedatorIaAccess)}
          >
            <Sparkles size={18} /> <span>Redator IA</span>
            {(!isPremiumUser || !hasRedatorIaAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasRedatorIaAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "agenda" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("agenda", hasAgendaAccess)}
          >
            <Calendar size={18} /> <span>Agenda & Prazos</span>
            {(!isPremiumUser || !hasAgendaAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasAgendaAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "triagem" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("triagem", hasTriagemAccess)}
          >
            <Search size={18} /> <span>Triagem de Casos</span>
            {(!isPremiumUser || !hasTriagemAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasTriagemAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>

          <div
            className={`${styles.navItem} ${activeTab === "calculadora" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("calculadora", hasCalculadoraAccess)}
          >
            <Calculator size={18} /> <span>Calculadora</span>
            {(!isPremiumUser || !hasCalculadoraAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasCalculadoraAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "juris" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabClick("juris", hasJurisprudenciaAccess)}
          >
            <BookOpen size={18} /> <span>Jurisprudência</span>
            {(!isPremiumUser || !hasJurisprudenciaAccess) && (
              <Lock size={12} style={{ marginLeft: "auto", opacity: 0.5, color: !hasJurisprudenciaAccess ? "#f87171" : "currentColor" }} />
            )}
          </div>
          {profileData?.escritorio_id && (
            <>
              <div className={styles.navGroupLabel}>Escritório</div>
              <div
                className={`${styles.navItem} ${activeTab === "comunicacao" ? styles.activeNavItem : ""}`}
                onClick={() => handleTabChange("comunicacao")}
              >
                <MessageSquare size={18} /> <span>Comunicação Interna</span>
              </div>
            </>
          )}
          <div className={styles.navGroupLabel}>Sistema</div>
          <div
            className={`${styles.navItem} ${activeTab === "documentacao" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("documentacao")}
          >
            <BookOpen size={18} /> <span>Documentação</span>
          </div>
          <div
            className={`${styles.navItem} ${activeTab === "cartao-visitas" ? styles.activeNavItem : ""}`}
            onClick={() => handleTabChange("cartao-visitas")}
          >
            <Eye size={18} /> <span>Cartão Digital</span>
          </div>
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
        <div
          className={`${styles.navItem} ${activeTab === "perfil" ? styles.activeNavItem : ""}`}
          onClick={() => handleTabChange("perfil")}
        >
          <User size={18} /> <span>Meu Perfil</span>
        </div>
        <div
          className={`${styles.navItem} ${styles.footerLogout}`}
          onClick={logout}
        >
          <LogOut size={18} /> <span>Sair</span>
        </div>
      </div>
    </aside>
  );
}
