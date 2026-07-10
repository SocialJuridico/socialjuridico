import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FolderOpen,
  GraduationCap,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import styles from "./OraculoStudentDashboard.module.css";

function greetingForNow() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function minutesToHours(minutes = 0) {
  const safe = minutes || 0;
  const hours = Math.floor(safe / 60);
  return hours;
}

// A meta de carga horária pode vir das regras do programa (jsonb).
// Lê defensivamente campos comuns; retorna null quando não configurada.
function metaHoursFrom(programRules) {
  if (!programRules || typeof programRules !== "object") return null;
  const candidates = [
    programRules.meta_horas,
    programRules.carga_horaria_meta,
    programRules.carga_horaria_minima,
    programRules.horas_meta,
  ];
  const found = candidates.find((value) => Number(value) > 0);
  return found ? Number(found) : null;
}

function buildPrimaryCta(context) {
  if (context.revisoesPendentes > 0) {
    return {
      label: "Revisar correção",
      href: "/dashboard/oraculo/revisoes",
    };
  }
  if (context.studentStatus === "PENDENTE_VINCULO") {
    return {
      label: "Ver meu perfil",
      href: "/dashboard/oraculo/perfil",
    };
  }
  return {
    label: "Ver Central de Casos",
    href: "/dashboard/oraculo/casos",
  };
}

function buildAttentionItems(context) {
  const items = [];

  if (context.studentStatus === "PENDENTE_VINCULO") {
    items.push({
      levelKey: "attention",
      levelLabel: "ATENÇÃO",
      text: "Você ainda não está vinculado a um programa/turma. Aguarde a instituição concluir seu vínculo acadêmico.",
      href: "/dashboard/oraculo/perfil",
      cta: "Ver perfil",
    });
  }

  if (context.revisoesPendentes > 0) {
    items.push({
      levelKey: "critical",
      levelLabel: "CRÍTICO",
      text: `${context.revisoesPendentes} correção(ões) solicitada(s) pelo seu orientador aguardam ajuste.`,
      href: "/dashboard/oraculo/revisoes",
      cta: "Ver correções",
    });
  }

  if (!context.supervisor) {
    items.push({
      levelKey: "info",
      levelLabel: "INFO",
      text: "Nenhum supervisor (padrinho) vinculado ao seu registro ainda.",
      href: "/dashboard/oraculo/supervisor",
      cta: "Ver supervisor",
    });
  }

  if (items.length > 0) return items;

  return [
    {
      levelKey: "info",
      levelLabel: "INFO",
      text: "Sem pendências no momento. Continue sua prática jurídica pela Central de Casos.",
      href: "/dashboard/oraculo/casos",
      cta: "Ver casos",
    },
  ];
}

export default async function OraculoStudentHomePage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const cta = buildPrimaryCta(context);
  const attentionItems = buildAttentionItems(context);
  const horasReconhecidas = minutesToHours(context.horasReconhecidasMinutos);
  const metaHoras = metaHoursFrom(context.programRules);

  const cards = [
    {
      value: "Em breve",
      label: "Análises em andamento",
      detail: "Depende da base de casos (fase 2)",
    },
    {
      value: String(context.revisoesPendentes || 0),
      label: "Correções pendentes",
      detail: "Solicitadas pelo supervisor",
    },
    {
      value: metaHoras
        ? `${horasReconhecidas}h / ${metaHoras}h`
        : `${horasReconhecidas}h`,
      label: "Carga horária reconhecida",
      detail: metaHoras ? "Meta do programa" : "Meta ainda não configurada",
    },
    {
      value: "Em breve",
      label: "Última avaliação",
      detail: "Depende da base de avaliações (fase 2)",
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>{context.studentStatus}</span>
          <h1>
            {greetingForNow()}, {context.studentName?.split(" ")[0] || "Oráculo"}.
          </h1>
          <p>
            Continue sua prática jurídica no Programa{" "}
            <strong>{context.programName || "não vinculado"}</strong>.
          </p>
          <small className={styles.heroMeta}>
            {[
              context.institutionName,
              context.periodoAtual,
              context.className,
            ]
              .filter(Boolean)
              .join(" · ") || "Vínculo acadêmico em definição"}
          </small>
        </div>

        <Link href={cta.href} className={styles.primaryCta}>
          {cta.label}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.metricsGrid} aria-label="Indicadores do estudante">
        {cards.map((card) => (
          <div key={card.label} className={styles.metricCard}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.detail}</small>
          </div>
        ))}
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Atenção necessária</span>
            <h2>Suas prioridades</h2>
          </div>
          <div className={styles.attentionList}>
            {attentionItems.map((item) => (
              <div key={`${item.levelKey}-${item.text}`} className={styles.attentionItem}>
                <span className={`${styles.level} ${styles[item.levelKey] || ""}`}>
                  {item.levelLabel}
                </span>
                <p>{item.text}</p>
                <Link href={item.href}>{item.cta}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Continue de onde parou</span>
            <h2>Sua análise atual</h2>
          </div>
          <div className={styles.emptyState}>
            <FolderOpen size={26} aria-hidden="true" />
            <p>Nenhuma análise em andamento.</p>
            <small>
              A Central de Casos e a Mesa de Análise entram na próxima fase. Assim
              que você assumir um caso, ele aparece aqui.
            </small>
            <Link href="/dashboard/oraculo/casos">Ir para a Central de Casos</Link>
          </div>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Meu programa</span>
            <h2>{context.programName || "Sem programa vinculado"}</h2>
          </div>
          <dl className={styles.programList}>
            <div>
              <dt>
                <GraduationCap size={15} aria-hidden="true" /> Instituição
              </dt>
              <dd>{context.institutionName || "—"}</dd>
            </div>
            <div>
              <dt>
                <BookOpen size={15} aria-hidden="true" /> Turma
              </dt>
              <dd>{context.className || "Sem turma"}</dd>
            </div>
            <div>
              <dt>
                <UserCog size={15} aria-hidden="true" /> Orientador
              </dt>
              <dd>{context.orientator?.name || "Não definido"}</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck size={15} aria-hidden="true" /> Supervisor
              </dt>
              <dd>
                {context.supervisor?.name || "Não definido"}
                {context.supervisor?.oab
                  ? ` — OAB/${context.supervisor.oabUf || "??"} ${context.supervisor.oab}`
                  : ""}
              </dd>
            </div>
          </dl>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Atividade recente</span>
            <h2>Sua linha do tempo</h2>
          </div>
          <div className={styles.emptyState}>
            <Clock3 size={26} aria-hidden="true" />
            <p>Sem atividade registrada ainda.</p>
            <small>
              Consultas de fontes, análises e revisões aparecem aqui conforme você
              avança na prática jurídica.
            </small>
          </div>
        </article>
      </section>
    </main>
  );
}
