"use client";

import {
  AlertTriangle,
  BookOpen,
  FileDown,
  Filter,
  Gavel,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { useJurisprudence } from "../useJurisprudence";
import styles from "../Jurisprudence.module.css";

const AREAS = ["Geral", "Cível", "Consumidor", "Trabalhista", "Família", "Penal", "Previdenciário", "Tributário", "Empresarial"];
const COURTS = ["Todos", "STJ", "STF", "TJ", "TRT", "TRF", "TST"];
const PERSPECTIVES = ["Autor/Requerente", "Réu/Requerido", "Recorrente", "Recorrido", "Defesa", "Acusação"];

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

function Select({ label, value, onChange, options }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ListPanel({ title, icon: Icon, children }) {
  return (
    <section className={styles.panel}>
      <header>
        <Icon size={18} />
        <h3>{title}</h3>
      </header>
      <div className={styles.list}>{children}</div>
    </section>
  );
}

function Results({ controller }) {
  const analysis = controller.analysis;
  return (
    <div className={styles.results}>
      <section className={styles.resultHeader}>
        <div>
          <span>Análise jurisprudencial</span>
          <h2>{analysis.topic}</h2>
          <p>{analysis.executiveSummary}</p>
        </div>
        <div className={styles.actionsStack}>
          <button type="button" onClick={controller.downloadPdf}>
            <FileDown size={17} />
            Baixar relatório
          </button>
          <button type="button" onClick={controller.reset}>
            <RefreshCw size={17} />
            Nova pesquisa
          </button>
        </div>
      </section>

      <section className={styles.metrics}>
        <article><span>Área</span><strong>{analysis.area}</strong></article>
        <article><span>Foco</span><strong>{analysis.courtFocus}</strong></article>
        <article><span>Tendência</span><strong>{analysis.trend}</strong></article>
        <article><span>Confiança</span><strong>{analysis.confidence}</strong></article>
      </section>

      <div className={styles.grid}>
        <ListPanel title="Teses aplicáveis" icon={Scale}>
          {analysis.theses.map((item, index) => (
            <article key={`${item.title}-${index}`} className={styles.item}>
              <strong>{item.title}</strong>
              <p>{item.summary}</p>
              <small>{item.useCase}</small>
            </article>
          ))}
        </ListPanel>

        <ListPanel title="Precedentes orientativos" icon={Gavel}>
          {analysis.precedents.map((item, index) => (
            <article key={`${item.court}-${index}`} className={styles.item}>
              <strong>{item.court} - {item.orientation}</strong>
              <p>{item.summary}</p>
              <small>{item.howToSearch}</small>
            </article>
          ))}
        </ListPanel>

        <ListPanel title="Riscos e distinções" icon={AlertTriangle}>
          {analysis.risks.map((item) => <p key={item} className={styles.line}>{item}</p>)}
        </ListPanel>

        <ListPanel title="Argumentos contrários" icon={BookOpen}>
          {analysis.counterArguments.map((item) => <p key={item} className={styles.line}>{item}</p>)}
        </ListPanel>

        <ListPanel title="Termos para bases oficiais" icon={Search}>
          <div className={styles.tags}>
            {analysis.searchTerms.map((item) => <span key={item}>{item}</span>)}
          </div>
        </ListPanel>

        <ListPanel title="Estratégia prática" icon={Sparkles}>
          {analysis.strategy.map((item) => <p key={item} className={styles.line}>{item}</p>)}
        </ListPanel>
      </div>

      <p className={styles.disclaimer}>{analysis.disclaimer}</p>
    </div>
  );
}

export default function JurisprudenceDashboard() {
  const controller = useJurisprudence();

  return (
    <LawyerDashboardShell
      activeRoute="jurisprudencia"
      title="Jurisprudência IA"
      subtitle="Teses, riscos, termos de busca e estratégia jurisprudencial"
      icon={BookOpen}
    >
      {controller.loading || controller.loadingProfile ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={22} className={styles.spin} />
          <span>Carregando inteligência jurisprudencial...</span>
        </div>
      ) : controller.error || controller.sessionError ? (
        <Notice
          title="Não foi possível carregar"
          message={controller.error || controller.sessionError}
          action={<button type="button" onClick={controller.load}>Tentar novamente</button>}
        />
      ) : controller.permissions.permissionDenied ? (
        <Notice title="Acesso restrito" message="Este perfil não possui permissão para acessar Jurisprudência IA." />
      ) : !controller.permissions.canUse ? (
        <Notice title="Acesso exclusivo PRO" message="A análise jurisprudencial está disponível para o Plano PRO." action={<button type="button" onClick={controller.openPlansModal}>Ver planos</button>} />
      ) : controller.analysis ? (
        <Results controller={controller} />
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <span>Pesquisa assistida</span>
            <h2>Transforme um tema jurídico em teses, riscos e termos de busca.</h2>
            <p>
              A IA organiza a estratégia jurisprudencial e indica como conferir precedentes em bases oficiais, sem inventar decisões.
            </p>
          </section>

          <section className={styles.searchPanel}>
            <label className={styles.queryField}>
              <span>Tema, fato ou tese</span>
              <textarea
                value={controller.filters.query}
                onChange={(event) => controller.updateFilter("query", event.target.value)}
                placeholder="Ex: dano moral por extravio de bagagem em voo internacional, inversão do ônus da prova e responsabilidade objetiva..."
                maxLength={2500}
              />
            </label>
            <div className={styles.filters}>
              <Select label="Área" value={controller.filters.area} onChange={(value) => controller.updateFilter("area", value)} options={AREAS} />
              <Select label="Tribunal/foco" value={controller.filters.court} onChange={(value) => controller.updateFilter("court", value)} options={COURTS} />
              <Select label="Perspectiva" value={controller.filters.perspective} onChange={(value) => controller.updateFilter("perspective", value)} options={PERSPECTIVES} />
            </div>
            <footer>
              <span><Filter size={15} /> Use filtros para orientar a análise, não como consulta oficial em tempo real.</span>
              <button type="button" onClick={controller.search} disabled={controller.searching || controller.filters.query.trim().length < 12}>
                {controller.searching ? <Loader2 size={18} className={styles.spin} /> : <Search size={18} />}
                {controller.searching ? "Analisando..." : "Pesquisar jurisprudência"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}
