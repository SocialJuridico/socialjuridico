import { ArrowRight, BarChart3 } from "lucide-react";
import { CASE_STAGES } from "../config/caseManagement";
import CaseCard from "./CaseCard";
import styles from "../CasosAdmin.module.css";

export default function CasePipelineBoard({ casesByStage, summary, onOpen }) {
  const total = summary.total || 0;

  return (
    <section className={styles.pipelineSection} aria-labelledby="pipeline-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Conversão ponta a ponta</span>
          <h2 id="pipeline-title">Funil operacional dos casos</h2>
          <p>
            Visualize gargalos entre publicação, interesse, resposta do cliente,
            negociação e contratação.
          </p>
        </div>
        <span className={styles.sectionMetric}>
          <BarChart3 size={16} aria-hidden="true" />
          {summary.conversionRate}% de conversão
        </span>
      </div>

      <div className={styles.pipelineBoard}>
        {CASE_STAGES.map((stage, index) => {
          const items = casesByStage[stage.value] || [];
          const stageCount = summary.byStage?.[stage.value] || 0;
          const share = total
            ? Number(((stageCount / total) * 100).toFixed(1))
            : 0;

          return (
            <div key={stage.value} className={styles.pipelineColumn}>
              <div className={styles.pipelineColumnHeader}>
                <div>
                  <span>{stage.shortLabel}</span>
                  <strong>{stageCount}</strong>
                </div>
                <small>{share}% do total</small>
              </div>

              <p className={styles.pipelineColumnDescription}>
                {stage.description}
              </p>

              <div className={styles.pipelineCards}>
                {items.length ? (
                  items.map((caseItem) => (
                    <CaseCard
                      key={caseItem.id}
                      caseItem={caseItem}
                      compact
                      onOpen={onOpen}
                    />
                  ))
                ) : (
                  <div className={styles.pipelineEmpty}>Nenhum caso nesta etapa.</div>
                )}
              </div>

              {index < CASE_STAGES.length - 1 && (
                <span className={styles.pipelineArrow} aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
