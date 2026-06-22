"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Coins,
  Gauge,
  Home,
  Info,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Radar,
  RefreshCw,
  Scale,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { formatDate, formatLimit } from "../dashboardUtils";
import styles from "../LawyerDashboardHome.module.css";
import { useLawyerDashboardHome } from "../useLawyerDashboardHome";

function MetricCard({ icon: Icon, label, value, detail, href }) {
  const content = (
    <>
      <span className={styles.metricIcon}><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
      {href && <ArrowRight size={16} className={styles.metricArrow} />}
    </>
  );
  return href ? (
    <Link href={href} className={styles.metricCard}>{content}</Link>
  ) : (
    <article className={styles.metricCard}>{content}</article>
  );
}

function UsageCard({ item }) {
  const value = item.unlimited
    ? `${item.used.toLocaleString("pt-BR")} usados`
    : `${item.used.toLocaleString("pt-BR")} / ${formatLimit(item.limit)}`;
  return (
    <article className={styles.usageCard}>
      <header>
        <div>
          <small>{item.label}</small>
          <strong>{value}{item.unit ? ` ${item.unit}` : ""}</strong>
        </div>
        <span>{item.unlimited ? "Ilimitado" : `${item.percentage}%`}</span>
      </header>
      <div className={styles.usageTrack} aria-hidden="true">
        <span style={{ width: `${item.unlimited ? 100 : item.percentage}%` }} />
      </div>
      <p>
        {item.unlimited
          ? "Sem limite operacional configurado para o plano atual."
          : `${formatLimit(item.remaining)} ${item.unit || "unidades"} restantes neste ciclo.`}
      </p>
    </article>
  );
}

function RankingList({ title, items }) {
  return (
    <div className={styles.rankingBlock}>
      <h4>{title}</h4>
      {items.length ? (
        <ol>
          {items.map((item) => (
            <li key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyText}>Sem dados suficientes para este recorte.</p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingPanel}>
      <Loader2 size={22} className={styles.spin} />
      <span>Montando seu painel profissional...</span>
    </div>
  );
}

const NOTICE_ICON = {
  INFO: Info,
  SUCCESS: Sparkles,
  WARNING: AlertTriangle,
  CRITICAL: AlertTriangle,
};

function PlatformNotices({ notices }) {
  if (!notices?.length) return null;

  return (
    <section className={styles.platformNotices} aria-label="Avisos internos da plataforma">
      {notices.map((notice) => {
        const Icon = NOTICE_ICON[notice.severity] || Info;
        return (
          <article
            key={notice.id}
            className={`${styles.noticeCard} ${styles[`notice_${notice.severity}`] || ""}`}
          >
            <span className={styles.noticeIcon}><Icon size={18} /></span>
            <div>
              <small>Aviso da plataforma</small>
              <h3>{notice.title}</h3>
              <p>{notice.message}</p>
            </div>
            {notice.cta_url && notice.cta_label && (
              <Link
                href={notice.cta_url}
                target={notice.cta_url.startsWith("/") ? undefined : "_blank"}
                rel={notice.cta_url.startsWith("/") ? undefined : "noopener noreferrer"}
              >
                {notice.cta_label} <ArrowRight size={14} />
              </Link>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default function LawyerHomeDashboard() {
  const controller = useLawyerDashboardHome();

  return (
    <LawyerDashboardShell
      activeRoute="dashboard"
      title="Dashboard"
      subtitle="Visão geral da sua operação no Social Jurídico"
      icon={Home}
    >
      {controller.loading || controller.loadingProfile ? (
        <LoadingState />
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>Área profissional</span>
              <h2>Bem-vindo, {controller.firstName}.</h2>
              <p>
                Acompanhe oportunidades, consumo do plano, Juris e os indicadores
                mais importantes da sua atuação em um único lugar.
              </p>
              <div className={styles.heroActions}>
                <Link href="/dashboard/advogado/oportunidade">
                  Ver oportunidades <ArrowRight size={16} />
                </Link>
                <Link href="/dashboard/advogado/geradordedocumentos">
                  Gerar documento <FileShortcutIcon />
                </Link>
                <Link href="/dashboard/advogado/monitoramento">
                  Monitorar OAB <MonitorSmartphone size={16} />
                </Link>
              </div>
            </div>
            <div className={styles.identityCards}>
              <article>
                <span><WalletCards size={18} /></span>
                <div><small>Plano atual</small><strong>{controller.planType}</strong></div>
              </article>
              <article>
                <span><Coins size={18} /></span>
                <div><small>Juris na carteira</small><strong>{controller.jurisBalance}</strong></div>
              </article>
            </div>
          </section>

          <PlatformNotices notices={controller.platformNotices} />

          {controller.error && (
            <section className={styles.errorNotice}>
              <AlertTriangle size={18} />
              <span>{controller.error}</span>
              <button type="button" onClick={controller.reload}>
                <RefreshCw size={15} /> Atualizar
              </button>
            </section>
          )}

          <section className={styles.metricsGrid} aria-label="Resumo do painel">
            <MetricCard
              icon={BriefcaseBusiness}
              label="Casos disponíveis"
              value={controller.report.available}
              detail="Oportunidades abertas na plataforma"
              href="/dashboard/advogado/oportunidade"
            />
            <MetricCard
              icon={Scale}
              label="Em negociação"
              value={controller.report.negotiating}
              detail="Casos em fase de conversa"
              href="/dashboard/advogado/declareiinteresse"
            />
            <MetricCard
              icon={Radar}
              label="Radar Jurídico"
              value={controller.radarTotal}
              detail="Oportunidades públicas recentes"
              href="/dashboard/advogado/oportunidade"
            />
            <MetricCard
              icon={Users}
              label="Clientes no CRM"
              value={controller.clientMetrics.total || 0}
              detail={`${controller.clientMetrics.active || 0} clientes ativos`}
              href="/dashboard/advogado/meusclientes"
            />
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div><BarChart3 size={19} /><h3>Relatório de casos na plataforma</h3></div>
                <Link href="/dashboard/advogado/oportunidade">Abrir relatório <ArrowRight size={14} /></Link>
              </header>
              <div className={styles.reportHighlights}>
                <div><small>Casos recentes carregados</small><strong>{controller.report.loaded}</strong></div>
                <div><small>Publicados nos últimos 7 dias</small><strong>{controller.report.recent}</strong></div>
              </div>
              <div className={styles.rankingsGrid}>
                <RankingList title="Áreas com mais oportunidades" items={controller.report.topAreas} />
                <RankingList title="Estados com mais oportunidades" items={controller.report.topStates} />
              </div>
              <div className={styles.caseList}>
                <h4>Casos mais recentes</h4>
                {controller.cases.slice(0, 5).map((item) => (
                  <Link key={item.id} href="/dashboard/advogado/oportunidade">
                    <div>
                      <strong>{item.title}</strong>
                      <span><MapPin size={13} /> {item.city || "Cidade não informada"}/{item.state || "--"}</span>
                    </div>
                    <time><Clock3 size={13} /> {formatDate(item.createdAt)}</time>
                  </Link>
                ))}
                {!controller.cases.length && <p className={styles.emptyText}>Nenhum caso disponível neste momento.</p>}
              </div>
            </article>

            <article className={styles.panel}>
              <header className={styles.panelHeader}>
                <div><Radar size={19} /><h3>Radar Jurídico</h3></div>
                <Link href="/dashboard/advogado/oportunidade">Explorar <ArrowRight size={14} /></Link>
              </header>
              <p className={styles.panelLead}>
                Sinais públicos recentes organizados para facilitar sua prospecção jurídica.
              </p>
              <div className={styles.radarList}>
                {controller.radarItems.slice(0, 5).map((item) => (
                  <article key={item.id}>
                    <span className={styles.radarScore}>{item.score_intencao || 0}%</span>
                    <div>
                      <strong>{item.titulo}</strong>
                      <p>{item.categoria || "Direito Geral"}</p>
                      <small><MapPin size={12} /> {item.cidade || "Local não informado"} {item.estado ? `- ${item.estado}` : ""}</small>
                    </div>
                  </article>
                ))}
                {!controller.radarItems.length && <p className={styles.emptyText}>Nenhuma oportunidade recente no Radar.</p>}
              </div>
            </article>
          </section>

          <section className={styles.usageSection}>
            <header className={styles.sectionHeader}>
              <div><Gauge size={20} /><div><h3>Limites de uso detalhados</h3><p>Consumo atualizado dos principais módulos do seu plano.</p></div></div>
              <span>Plano {controller.planType}</span>
            </header>
            <div className={styles.usageGrid}>
              {controller.usageItems.map((item) => <UsageCard key={item.id} item={item} />)}
            </div>
            {controller.warnings.length > 0 && (
              <div className={styles.warnings}>
                {controller.warnings.map((warning) => <span key={warning}>{warning}</span>)}
              </div>
            )}
          </section>

          <section className={styles.evolutionBanner}>
            <span><Sparkles size={20} /></span>
            <div>
              <h3>O Social Jurídico está em constante evolução.</h3>
              <p>
                Novos recursos, integrações e melhorias são desenvolvidos continuamente para
                tornar sua operação mais simples, segura e eficiente.
              </p>
            </div>
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}

function FileShortcutIcon() {
  return <Sparkles size={16} aria-hidden="true" />;
}
