import { Award, Brain, Copy, Sparkles, Users } from "lucide-react";
import toast from "react-hot-toast";
import styles from "../Pesquisas.module.css";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Texto copiado para a área de transferência.");
  } catch {
    toast.error("Não foi possível copiar o texto.");
  }
}

function CopyButton({ text, title }) {
  return (
    <button
      type="button"
      className={styles.copyButton}
      onClick={() => copyText(text)}
      title={title}
      aria-label={title}
    >
      <Copy size={13} />
    </button>
  );
}

export default function SurveyAiCopilot({ summary, generating, onGenerate }) {
  return (
    <section className={styles.aiSummaryCard} aria-labelledby="survey-ai-title">
      <div className={styles.aiHeader}>
        <div className={styles.aiTitle} id="survey-ai-title">
          <Brain size={20} />
          <span>Copilot de Marketing IA</span>
          <span className={styles.newBadge}>Novo</span>
        </div>

        <button
          type="button"
          className={styles.aiButton}
          onClick={onGenerate}
          disabled={generating}
        >
          <Sparkles size={14} />
          {generating ? "Analisando com IA..." : "Gerar resumo para marketing"}
        </button>
      </div>

      {!summary ? (
        <p className={styles.aiEmpty}>
          Consolide os comentários recebidos para identificar diferenciais,
          depoimentos e oportunidades de comunicação.
        </p>
      ) : (
        <div className={styles.aiContent}>
          <p className={styles.aiText}>{summary.summary}</p>

          <div className={styles.aiGrid}>
            <div>
              <h3 className={styles.aiSectionTitle}>
                <Award size={14} /> Diferenciais principais
              </h3>
              <div className={styles.strengthsList}>
                {summary.strengths?.map((strength, index) => (
                  <div key={`${strength}-${index}`} className={styles.strengthItem}>
                    <span className={styles.strengthBadge}>Destaque</span>
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={styles.aiSectionTitle}>
                <Users size={14} /> Provas sociais
              </h3>
              <div className={styles.quotesList}>
                {summary.quotes?.map((quote, index) => (
                  <div key={`${quote}-${index}`} className={styles.quoteCard}>
                    <p>{quote}</p>
                    <CopyButton text={quote} title="Copiar depoimento" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={styles.aiSectionTitle}>
                <Sparkles size={14} /> Ganchos de marketing
              </h3>
              <div className={styles.hooksList}>
                {summary.marketingHooks?.map((hook, index) => (
                  <div key={`${hook}-${index}`} className={styles.hookCard}>
                    <div className={styles.hookHeader}>
                      <span className={styles.hookTag}>Ideia {index + 1}</span>
                      <CopyButton text={hook} title="Copiar gancho" />
                    </div>
                    <p className={styles.hookText}>{hook}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
