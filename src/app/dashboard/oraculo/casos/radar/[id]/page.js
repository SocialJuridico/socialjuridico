import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getRadarAcademicCaseForStudent } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import { getInterviewForCase } from "@/lib/oraculo/radarAcademic/simulatedInterview";

import styles from "../../../OraculoStudentDashboard.module.css";
import DossieActions from "./DossieActions";

export const metadata = { title: "Dossiê do Caso — Radar Acadêmico" };

function shortCode(id) {
  return `RAD-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default async function RadarDossiePage({ params }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const dossie = await getRadarAcademicCaseForStudent(id);
  if (!dossie) notFound();

  const interview = await getInterviewForCase({
    academicCaseId: id,
    oraculoId: context.oraculoId,
  });

  return (
    <main className={styles.page}>
      <Link href="/dashboard/oraculo/casos" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar para a Central de Casos
      </Link>

      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Caso de estudo — Radar Acadêmico</span>
          <h1>{dossie.title}</h1>
          <small className={styles.heroMeta}>
            {dossie.legalArea} · {shortCode(dossie.id)}
          </small>
          <p>
            Caso preparado para prática acadêmica a partir de uma situação
            identificada pelo Radar Jurídico.
          </p>
        </div>
      </section>

      <DossieActions
        caseId={dossie.id}
        interviewStatus={interview?.status || null}
        canAct={context.studentStatus === "ATIVO"}
      />

      <section className={styles.dossieGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.kicker}>Relato do caso</span>
          </div>
          <div className={styles.dossieNarrative}>
            {dossie.academicFullContent ? (
              dossie.academicFullContent
                .split(/\n+/)
                .filter(Boolean)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <p className={styles.muted}>Relato acadêmico não disponível.</p>
            )}
          </div>
        </article>

        <aside className={styles.dossieAside}>
          <DossieList
            title="Fatos disponíveis"
            items={dossie.availableFacts}
            empty="Sem fatos estruturados."
          />
          <DossieList
            title="Informações não disponíveis"
            items={dossie.missingInformation}
            empty="Sem lacunas registradas."
          />
          <DossieDocs documents={dossie.mentionedDocuments} />
          <DossieTimeline timeline={dossie.knownTimeline} />
          <DossieList
            title="Questões ainda não esclarecidas"
            items={dossie.openQuestions}
            empty="Sem questões abertas registradas."
          />
        </aside>
      </section>
    </main>
  );
}

function DossieList({ title, items, empty }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.kicker}>{title}</span>
      </div>
      {items?.length ? (
        <ul className={styles.dossieUl}>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>{empty}</p>
      )}
    </section>
  );
}

function DossieDocs({ documents }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.kicker}>Documentos mencionados</span>
      </div>
      {documents?.length ? (
        <ul className={styles.dossieUl}>
          {documents.map((doc, index) => (
            <li key={index}>
              <strong>{doc.name}</strong>
              {doc.status ? ` — ${doc.status}` : ""}
              {doc.detail ? ` (${doc.detail})` : ""}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>Nenhum documento mencionado.</p>
      )}
    </section>
  );
}

function DossieTimeline({ timeline }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.kicker}>Linha do tempo conhecida</span>
      </div>
      {timeline?.length ? (
        <ul className={styles.dossieTimeline}>
          {timeline.map((item, index) => (
            <li key={index}>
              <span>{item.when}</span>
              <p>{item.event}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>Sem linha do tempo registrada.</p>
      )}
    </section>
  );
}
