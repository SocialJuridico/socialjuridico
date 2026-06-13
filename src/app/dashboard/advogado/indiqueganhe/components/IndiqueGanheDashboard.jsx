"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  Copy,
  Gift,
  Loader2,
  MessageCircle,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../IndiqueGanhe.module.css";
import { useIndiqueGanhe } from "../useIndiqueGanhe";
import ReferralHistory from "./ReferralHistory";

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className={`${styles.statCard} ${accent ? styles[accent] : ""}`}>
      <span className={styles.statIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState} aria-live="polite">
      <Loader2 size={28} className={styles.spinner} aria-hidden="true" />
      <strong>Carregando seu programa de indicações</strong>
      <span>Estamos consultando os cadastros e recompensas.</span>
    </div>
  );
}

export default function IndiqueGanheDashboard() {
  const controller = useIndiqueGanhe();
  const policy = controller.data.policy;
  const summary = controller.data.summary;

  return (
    <LawyerDashboardShell
      activeRoute="indiqueganhe"
      title="Indique e Ganhe"
      subtitle="Compartilhe o Social Jurídico e acompanhe suas recompensas em Juris"
      icon={Gift}
    >
      {controller.loading && !controller.data.referralUrl ? (
        <LoadingState />
      ) : controller.error ? (
        <section className={styles.errorState} role="alert">
          <AlertTriangle size={36} aria-hidden="true" />
          <h2>Não foi possível carregar suas indicações</h2>
          <p>{controller.error}</p>
          <button type="button" onClick={controller.reload}>
            <RefreshCw size={16} aria-hidden="true" />
            Tentar novamente
          </button>
        </section>
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <span className={styles.heroEyebrow}>
                <Gift size={15} aria-hidden="true" />
                Programa de indicação profissional
              </span>
              <h1>
                Convide outros advogados e receba Juris após a assinatura paga.
              </h1>
              <p>
                Cada advogado indicado que concluir o cadastro pelo seu link e
                contratar uma assinatura profissional paga pode gerar uma recompensa
                de <strong>{policy.defaultCommissionJuris} Juris</strong>, após a
                validação administrativa.
              </p>

              <div className={styles.linkBlock}>
                <label htmlFor="referral-link">Seu link exclusivo</label>
                <div className={styles.linkRow}>
                  <input
                    id="referral-link"
                    type="text"
                    readOnly
                    value={controller.data.referralUrl}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button type="button" onClick={controller.copyLink}>
                    <Copy size={17} aria-hidden="true" />
                    Copiar link
                  </button>
                </div>
              </div>

              <div className={styles.shareActions}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={controller.share}
                >
                  <Share2 size={17} aria-hidden="true" />
                  Compartilhar
                </button>

                {controller.whatsappUrl && (
                  <a
                    className={styles.whatsappAction}
                    href={controller.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={17} aria-hidden="true" />
                    Enviar no WhatsApp
                  </a>
                )}
              </div>
            </div>

            <aside className={styles.rewardCard}>
              <span className={styles.rewardGlow} aria-hidden="true" />
              <div className={styles.rewardIcon}>
                <Coins size={30} aria-hidden="true" />
              </div>
              <span className={styles.rewardLabel}>Recompensa padrão</span>
              <strong>{policy.defaultCommissionJuris}</strong>
              <span className={styles.rewardUnit}>Juris por indicação válida</span>
              <div className={styles.rewardRule}>
                <ShieldCheck size={15} aria-hidden="true" />
                Crédito liberado somente após pagamento confirmado e validação.
              </div>
            </aside>
          </section>

          <section className={styles.statsGrid} aria-label="Resumo das indicações">
            <StatCard
              icon={Users}
              label="Indicações"
              value={summary.total}
              detail="Links utilizados"
            />
            <StatCard
              icon={UserCheck}
              label="Cadastros localizados"
              value={summary.registered}
              detail="Advogados ou clientes cadastrados"
            />
            <StatCard
              icon={Clock3}
              label="Aguardando crédito"
              value={summary.awaitingCredit}
              detail="Em validação ou análise"
              accent="statGold"
            />
            <StatCard
              icon={Coins}
              label="Juris creditados"
              value={summary.creditedJuris}
              detail={`${summary.commissioned} recompensa(s) concluída(s)`}
              accent="statSuccess"
            />
          </section>

          <section className={styles.infoGrid}>
            <article className={styles.howItWorks}>
              <div className={styles.sectionHeadingCompact}>
                <span className={styles.sectionEyebrow}>Passo a passo</span>
                <h2>Como funciona</h2>
              </div>

              <ol className={styles.steps}>
                <li>
                  <span>1</span>
                  <div>
                    <strong>Compartilhe o link</strong>
                    <p>
                      Envie seu link exclusivo para colegas que ainda não possuem
                      conta profissional.
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>O advogado se cadastra</strong>
                    <p>
                      O vínculo da indicação é registrado automaticamente durante o
                      cadastro.
                    </p>
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>A assinatura paga é confirmada</strong>
                    <p>
                      O sistema cruza o advogado indicado com uma transação
                      profissional válida.
                    </p>
                  </div>
                </li>
                <li>
                  <span>4</span>
                  <div>
                    <strong>Os Juris são creditados</strong>
                    <p>
                      Após a validação, a recompensa aparece no histórico e no seu
                      saldo.
                    </p>
                  </div>
                </li>
              </ol>
            </article>

            <article className={styles.policyCard}>
              <div className={styles.sectionHeadingCompact}>
                <span className={styles.sectionEyebrow}>Regras de segurança</span>
                <h2>O que gera recompensa</h2>
              </div>

              <ul className={styles.policyList}>
                <li>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Cadastro profissional concluído pelo link exclusivo.</span>
                </li>
                <li>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Assinatura paga e confirmada no razão financeiro.</span>
                </li>
                <li>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>Uma recompensa por indicação válida e não duplicada.</span>
                </li>
                <li>
                  <AlertTriangle size={17} aria-hidden="true" />
                  <span>
                    Cadastros de clientes, autoindicações e duplicidades não geram
                    crédito automático.
                  </span>
                </li>
              </ul>

              <p className={styles.policyNote}>
                Os Juris são créditos internos da plataforma, não possuem saque em
                dinheiro e seguem as regras vigentes no momento da validação.
              </p>
            </article>
          </section>

          {!controller.data.schema.governanceAvailable && (
            <div className={styles.governanceWarning} role="status">
              <AlertTriangle size={17} aria-hidden="true" />
              <span>
                O histórico está sendo exibido em modo de compatibilidade. Alguns
                status avançados podem aparecer de forma simplificada.
              </span>
            </div>
          )}

          <ReferralHistory controller={controller} />

          {controller.loading && controller.data.referralUrl && (
            <div className={styles.refreshing} role="status">
              <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
              Atualizando indicações
            </div>
          )}
        </div>
      )}
    </LawyerDashboardShell>
  );
}
