"use client";

import {
  AlertTriangle,
  Copy,
  Eye,
  FileText,
  Loader2,
  PenTool,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { DOCUMENT_TYPES, TONES, useRedatorIa } from "../useRedatorIa";
import styles from "../RedatorIa.module.css";

const MARKET_INDEXES = [
  { id: 1, title: "Petição", low: 1100, mid: 3250, high: 9000 },
  { id: 2, title: "Embargos", low: 1220, mid: 2800, high: 4050 },
  { id: 3, title: "Recurso", low: 1800, mid: 3650, high: 8500 },
  { id: 4, title: "Contestação", low: 1000, mid: 2250, high: 3150 },
  { id: 5, title: "Manifestação", low: 380, mid: 1200, high: 2100 },
  { id: 6, title: "Notificação", low: 500, mid: 1400, high: 1950 },
  { id: 7, title: "Procuração", low: 200, mid: 550, high: 800 },
  { id: 8, title: "Contrato", low: 1580, mid: 3250, high: 9000 },
];

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function UsageBar({ usage }) {
  const limitLabel = usage.limit === null ? "ilimitado" : usage.limit;
  return (
    <div className={styles.usageCard}>
      <div>
        <span>Uso mensal</span>
        <strong>
          {usage.used || 0} / {limitLabel}
        </strong>
      </div>
      <div className={styles.usageTrack}>
        <span style={{ width: `${Math.min(100, usage.percentage || 0)}%` }} />
      </div>
      <small>
        {usage.limit === null
          ? "Plano sem limite operacional configurado."
          : `${usage.remaining || 0} minutas restantes neste ciclo.`}
      </small>
    </div>
  );
}

function StateNotice({ type, title, message, action }) {
  return (
    <section className={`${styles.notice} ${styles[type] || ""}`}>
      <AlertTriangle size={22} />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action}
    </section>
  );
}

export default function RedatorIaDashboard() {
  const controller = useRedatorIa();
  const disabled =
    controller.loading ||
    controller.generating ||
    !controller.permissions.canUse ||
    controller.permissions.permissionDenied;

  return (
    <LawyerDashboardShell
      activeRoute="redator-ia"
      title="Redator IA"
      subtitle="Minutas jurídicas com governança, cota e escopo validado"
      icon={Sparkles}
    >
      {controller.loading || controller.loadingProfile ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={22} className={styles.spin} />
          <span>Carregando ambiente seguro do Redator IA...</span>
        </div>
      ) : controller.error || controller.sessionError ? (
        <StateNotice
          type="danger"
          title="Não foi possível carregar"
          message={controller.error || controller.sessionError}
          action={
            <button type="button" onClick={controller.reload}>
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          }
        />
      ) : controller.permissions.permissionDenied ? (
        <StateNotice
          type="danger"
          title="Acesso restrito"
          message="Este perfil não possui permissão para acessar o Redator IA."
        />
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <span className={styles.eyebrow}>Copilot jurídico</span>
              <h2>Gere peças e contratos profissionais em segundos.</h2>
              <p>
                Configure o tipo de documento, vincule um cliente do CRM quando
                necessário e descreva os fatos. A IA devolve uma minuta limpa,
                pronta para revisão técnica.
              </p>
              <div className={styles.tags}>
                <span>
                  <PenTool size={14} />
                  Redação IA
                </span>
                <span>
                  <FileText size={14} />
                  Múltiplos tipos
                </span>
                <span>
                  <Save size={14} />
                  Cota auditada
                </span>
              </div>
            </div>
            <UsageBar usage={controller.usage} />
          </section>

          <section className={styles.marketGrid} aria-label="Referências de mercado">
            {MARKET_INDEXES.map((item) => (
              <article key={item.id} className={styles.marketCard}>
                <header>
                  <strong>{item.title}</strong>
                  <TrendingUp size={15} />
                </header>
                <div>
                  <span>Mínima</span>
                  <b>{formatMoney(item.low)}</b>
                </div>
                <div>
                  <span>Média</span>
                  <b>{formatMoney(item.mid)}</b>
                </div>
                <div>
                  <span>Máxima</span>
                  <b>{formatMoney(item.high)}</b>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.workspace}>
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault();
                void controller.generateDraft();
              }}
            >
              <header className={styles.panelHeader}>
                <Settings size={18} />
                <h3>Configuração da minuta</h3>
              </header>

              <label className={styles.field}>
                <span>Tipo de peça</span>
                <select
                  value={controller.config.type}
                  onChange={(event) =>
                    controller.updateConfig({ type: event.target.value })
                  }
                  disabled={disabled}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Puxar do CRM</span>
                <select
                  value={controller.config.clientId}
                  onChange={(event) => controller.selectClient(event.target.value)}
                  disabled={disabled}
                >
                  <option value="">Selecionar cliente</option>
                  {controller.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Nome do cliente</span>
                <input
                  type="text"
                  value={controller.config.clientName}
                  onChange={(event) =>
                    controller.updateConfig({
                      clientName: event.target.value,
                      clientId: "",
                    })
                  }
                  placeholder="Nome do cliente ou parte interessada"
                  disabled={disabled}
                  maxLength={160}
                />
              </label>

              <div className={styles.field}>
                <span>Tom de personalidade</span>
                <div className={styles.toneGrid}>
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      className={
                        controller.config.tone === tone ? styles.toneActive : ""
                      }
                      onClick={() => controller.updateConfig({ tone })}
                      disabled={disabled}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <label className={styles.field}>
                <span>Fatos e contexto</span>
                <textarea
                  value={controller.config.facts}
                  onChange={(event) =>
                    controller.updateConfig({ facts: event.target.value })
                  }
                  placeholder="Descreva os fatos principais, provas disponíveis, objetivo da peça e pontos sensíveis para a revisão jurídica."
                  disabled={disabled}
                  maxLength={12000}
                />
              </label>

              <button
                type="submit"
                className={styles.generateButton}
                disabled={disabled || !controller.config.facts.trim()}
              >
                {controller.generating ? (
                  <Loader2 size={18} className={styles.spin} />
                ) : (
                  <Sparkles size={18} />
                )}
                {controller.generating ? "Gerando minuta..." : "Gerar minuta com IA"}
              </button>
            </form>

            <section className={styles.panel}>
              <header className={styles.previewHeader}>
                <div>
                  <Eye size={18} />
                  <h3>Prévia da minuta</h3>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    onClick={controller.copyDraft}
                    disabled={!controller.draft}
                    aria-label="Copiar minuta"
                    title="Copiar minuta"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={controller.downloadPdf}
                    disabled={!controller.draft}
                    aria-label="Baixar PDF"
                    title="Baixar PDF"
                  >
                    <FileText size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={controller.clearDraft}
                    disabled={!controller.draft}
                    aria-label="Limpar prévia"
                    title="Limpar prévia"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </header>

              <div className={styles.preview}>
                {controller.draft ? (
                  <pre>{controller.draft}</pre>
                ) : (
                  <div className={styles.emptyPreview}>
                    <Sparkles size={28} />
                    <strong>A minuta gerada aparecerá aqui.</strong>
                    <span>
                      Revise tecnicamente todo conteúdo antes de protocolar,
                      enviar ou assinar.
                    </span>
                  </div>
                )}
              </div>
            </section>
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}
