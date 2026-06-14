"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileDown,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { useTriagem } from "../useTriagem";
import styles from "../Triagem.module.css";

function UsageCard({ usage }) {
  const limitLabel = usage.limit === null ? "ilimitado" : usage.limit;
  return (
    <aside className={styles.usageCard}>
      <span>Uso mensal</span>
      <strong>
        {usage.used || 0} / {limitLabel}
      </strong>
      <div className={styles.usageTrack}>
        <i style={{ width: `${Math.min(100, usage.percentage || 0)}%` }} />
      </div>
      <small>
        {usage.limit === null
          ? "Cota operacional sem limite configurado."
          : `${usage.remaining || 0} diagnósticos restantes.`}
      </small>
    </aside>
  );
}

function Notice({ title, message, action }) {
  return (
    <section className={styles.notice}>
      <AlertTriangle size={22} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </section>
  );
}

function Badge({ value, tone = "neutral" }) {
  return <span className={`${styles.badge} ${styles[tone] || ""}`}>{value}</span>;
}

function riskTone(value) {
  if (value === "Alto" || value === "Alta") return "danger";
  if (value === "Médio" || value === "Média") return "warning";
  return "success";
}

function ListPanel({ title, icon: Icon, items }) {
  return (
    <section className={styles.detailPanel}>
      <header>
        <Icon size={18} />
        <h3>{title}</h3>
      </header>
      <div className={styles.list}>
        {(items?.length ? items : ["Não informado pela IA."]).map((item, index) => (
          <div key={`${title}-${index}`} className={styles.listItem}>
            <CheckCircle2 size={16} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultView({ controller }) {
  const diagnosis = controller.diagnosis;
  return (
    <div className={styles.results}>
      <section className={styles.resultHeader}>
        <div>
          <span className={styles.eyebrow}>Resultado da triagem</span>
          <h2>{diagnosis.area || "Área jurídica não identificada"}</h2>
          <p>{diagnosis.executiveSummary}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={controller.downloadPdf}>
            <FileDown size={17} />
            Baixar relatório
          </button>
          <button type="button" onClick={controller.reset}>
            <RefreshCw size={17} />
            Nova triagem
          </button>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <article>
          <span>Urgência</span>
          <Badge value={diagnosis.urgency} tone={riskTone(diagnosis.urgency)} />
        </article>
        <article>
          <span>Complexidade</span>
          <Badge
            value={diagnosis.estimatedComplexity}
            tone={riskTone(diagnosis.estimatedComplexity)}
          />
        </article>
        <article>
          <span>Risco</span>
          <Badge value={diagnosis.riskLevel} tone={riskTone(diagnosis.riskLevel)} />
        </article>
        <article>
          <span>Viabilidade</span>
          <Badge
            value={diagnosis.viability?.level}
            tone={riskTone(diagnosis.viability?.level)}
          />
        </article>
        <article>
          <span>Valor estimado</span>
          <strong>{diagnosis.estimatedValue?.range || "Consultivo"}</strong>
        </article>
        <article>
          <span>Potencial</span>
          <strong>{diagnosis.estimatedValue?.potential || "A avaliar"}</strong>
        </article>
      </section>

      <section className={styles.recommendation}>
        <header>
          <Target size={18} />
          <h3>Ação recomendada</h3>
        </header>
        <p>{diagnosis.suggestedAction}</p>
        <small>{diagnosis.viability?.reasoning}</small>
      </section>

      <div className={styles.detailGrid}>
        <ListPanel
          title="Documentos necessários"
          icon={ClipboardList}
          items={diagnosis.requiredDocuments}
        />
        <ListPanel title="Próximos passos" icon={Target} items={diagnosis.nextSteps} />
        <ListPanel title="Riscos processuais" icon={ShieldAlert} items={diagnosis.viability?.risks} />
        <ListPanel title="Oportunidades" icon={Scale} items={diagnosis.viability?.opportunities} />
        <ListPanel title="Perguntas pendentes" icon={Search} items={diagnosis.missingInformation} />
        <ListPanel title="Alertas de prazo" icon={AlertTriangle} items={diagnosis.deadlineAlerts} />
      </div>
    </div>
  );
}

export default function TriagemDashboard() {
  const controller = useTriagem();
  const disabled =
    controller.loading ||
    controller.loadingProfile ||
    controller.analyzing ||
    !controller.permissions.canUse ||
    controller.permissions.permissionDenied;

  return (
    <LawyerDashboardShell
      activeRoute="triagem"
      title="Triagem IA"
      subtitle="Diagnóstico inicial, viabilidade, riscos e próximos passos"
      icon={Search}
    >
      {controller.loading || controller.loadingProfile ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={22} className={styles.spin} />
          <span>Carregando ambiente seguro da Triagem IA...</span>
        </div>
      ) : controller.error || controller.sessionError ? (
        <Notice
          title="Não foi possível carregar"
          message={controller.error || controller.sessionError}
          action={
            <button type="button" onClick={controller.load}>
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          }
        />
      ) : controller.permissions.permissionDenied ? (
        <Notice
          title="Acesso restrito"
          message="Este perfil não possui permissão para acessar a Triagem IA."
        />
      ) : !controller.permissions.canUse ? (
        <Notice
          title="Limite mensal atingido"
          message="Você consumiu todos os diagnósticos de triagem disponíveis neste ciclo."
        />
      ) : controller.diagnosis ? (
        <ResultView controller={controller} />
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Intake jurídico</span>
              <h2>Transforme o relato bruto do cliente em diagnóstico estratégico.</h2>
              <p>
                A IA identifica área, urgência, risco, valor estimado, documentos
                necessários e perguntas pendentes para orientar o primeiro atendimento.
              </p>
              <div className={styles.tags}>
                <span>
                  <Sparkles size={14} />
                  Diagnóstico IA
                </span>
                <span>
                  <ClipboardList size={14} />
                  Checklist documental
                </span>
                <span>
                  <ShieldAlert size={14} />
                  Gestão de risco
                </span>
              </div>
            </div>
            <UsageCard usage={controller.usage} />
          </section>

          <section className={styles.formPanel}>
            <label>
              <span>Relato do cliente</span>
              <textarea
                value={controller.report}
                onChange={(event) => controller.setReport(event.target.value)}
                placeholder="Cole ou digite o relato do cliente. Inclua datas aproximadas, documentos existentes, valores envolvidos, local dos fatos e objetivo esperado."
                disabled={disabled}
                maxLength={15000}
              />
            </label>

            <div className={styles.formFooter}>
              <small>
                Evite inserir dados pessoais desnecessários. A triagem é apoio
                técnico e deve ser revisada por profissional habilitado.
              </small>
              <button
                type="button"
                onClick={controller.analyze}
                disabled={disabled || controller.report.trim().length < 60}
              >
                {controller.analyzing ? (
                  <Loader2 size={18} className={styles.spin} />
                ) : (
                  <Sparkles size={18} />
                )}
                {controller.analyzing ? "Analisando caso..." : "Realizar Triagem IA"}
              </button>
            </div>
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}
