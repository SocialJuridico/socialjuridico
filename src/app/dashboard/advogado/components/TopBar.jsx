"use client";

import React from "react";
import { useDashboard } from "../DashboardContext";
import styles from "../Dashboard.module.css";
import {
  Globe,
  Briefcase,
  Check,
  Bell,
  Users,
  FileText,
  Shield,
  Sparkles,
  Calculator,
  Scale,
  Calendar,
  Filter,
  Eye,
  User,
  BookOpen,
  Zap,
  Coins,
  MessageSquare
} from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";

export default function TopBar() {
  const { activeTab, profileData, setShowBuyModal, userName } = useDashboard();

  return (
    <header className={styles.topBar}>
      <div className={styles.breadcrumb}>
        {activeTab === "oportunidades" && (
          <Globe size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "meus-casos" && (
          <Briefcase size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "declarei-interesse" && (
          <Check size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "minhas-mensagens" && (
          <Bell size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "crm" && (
          <Users size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "docs" && (
          <FileText size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "blindagem" && (
          <Shield size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "redator" && (
          <Sparkles size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "calculadora" && (
          <Calculator size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "juris" && (
          <Scale size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "agenda" && (
          <Calendar size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "triagem" && (
          <Filter size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "cartao-visitas" && (
          <Eye size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "perfil" && (
          <User size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "documentacao" && (
          <BookOpen size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab === "comunicacao" && (
          <MessageSquare size={20} className={styles.breadcrumbIcon} />
        )}
        {activeTab?.startsWith("anuncios-") && (
          <Zap size={20} className={styles.breadcrumbIcon} />
        )}
        <span>
          {activeTab === "oportunidades"
            ? "Oportunidades em Aberto"
            : activeTab === "meus-casos"
              ? "Meus Casos"
              : activeTab === "declarei-interesse"
                ? "Declarei Interesse"
                : activeTab === "minhas-mensagens"
                  ? "Minhas Mensagens"
                : activeTab === "crm"
                  ? "CRM & KYC"
                  : activeTab === "docs"
                    ? "Smart Docs"
                    : activeTab === "blindagem"
                      ? "Blindagem de Documentos"
                    : activeTab === "redator"
                      ? "Redator IA"
                      : activeTab === "calculadora"
                        ? "Calculadora"
                        : activeTab === "juris"
                          ? "Jurisprudência"
                          : activeTab === "agenda"
                            ? "Agenda"
                            : activeTab === "triagem"
                              ? "Triagem"
                              : activeTab === "cartao-visitas"
                                ? "Cartão Digital"
                                : activeTab === "perfil"
                                  ? "Perfil"
                                  : activeTab === "comunicacao"
                                    ? "Comunicação Interna"
                                    : activeTab?.startsWith("anuncios-")
                                      ? `Anúncios: ${activeTab.split("-")[1]}`
                                      : "Documentação"}
        </span>
      </div>

      <div className={styles.userActions}>
        <div className={styles.jurisBadge}>
          <Coins size={14} color="var(--brand-gold)" />
          <span className={styles.jurisCount}>
            {profileData?.balance || 0} Juris
          </span>
          <button
            className={styles.buyJurisBtn}
            onClick={() => setShowBuyModal(true)}
          >
            Comprar
          </button>
        </div>

        <div className={styles.userInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={styles.userName} style={{ margin: 0 }}>{userName}</span>
            {profileData?.oab_verification_status === "VERIFIED" && <VerifiedBadge size={16} />}
          </div>
          <span className={styles.userOAB}>
            {profileData?.oab || "OAB Pendente"}
          </span>
        </div>

        <div className={styles.avatar}>
          {userName.substring(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
