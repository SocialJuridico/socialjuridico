import { CheckCircle2, History, ShieldCheck, UserRound } from "lucide-react";

import { AUDIT_LABELS } from "../deletionConstants";
import styles from "../DeletionRequests.module.css";

function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function DeletionAudit({ items, available }) {
  return (
    <section className={styles.auditGrid}>
      <article className={styles.auditCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Rastreabilidade</span>
            <h2>
              <History size={18} aria-hidden="true" /> Atividade recente
            </h2>
            <p>Últimos acessos e decisões administrativas do módulo.</p>
          </div>
        </div>

        {!available ? (
          <div className={styles.auditEmpty}>
            <ShieldCheck size={24} aria-hidden="true" />
            <strong>Auditoria ainda não habilitada</strong>
            <span>Execute a migração de governança no Supabase.</span>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.auditEmpty}>
            <History size={24} aria-hidden="true" />
            <strong>Nenhuma atividade registrada</strong>
            <span>Os eventos aparecerão após o primeiro acesso auditado.</span>
          </div>
        ) : (
          <div className={styles.auditList}>
            {items.map((item) => (
              <div key={item.id} className={styles.auditItem}>
                <span className={styles.auditIcon}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                </span>
                <div>
                  <strong>{AUDIT_LABELS[item.action] || item.action}</strong>
                  <p>{item.justification || "Evento administrativo registrado."}</p>
                  <small>
                    <UserRound size={11} aria-hidden="true" />
                    {item.admin_id
                      ? `Admin ${item.admin_id.slice(0, 8)}`
                      : "Ação de sistema"}
                    <span>·</span>
                    {formatDate(item.created_at)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className={styles.governanceCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Controles aplicados</span>
            <h2>
              <ShieldCheck size={18} aria-hidden="true" /> Governança LGPD
            </h2>
            <p>Proteções ativas da solicitação até o encerramento.</p>
          </div>
        </div>

        <ul className={styles.governanceList}>
          <li><CheckCircle2 size={15} /><span>Uma solicitação ativa por titular</span></li>
          <li><CheckCircle2 size={15} /><span>Prazo operacional de 48 horas monitorado</span></li>
          <li><CheckCircle2 size={15} /><span>Dados completos protegidos por finalidade e justificativa</span></li>
          <li><CheckCircle2 size={15} /><span>Pré-verificação de casos, assinatura e transações</span></li>
          <li><CheckCircle2 size={15} /><span>Controle de concorrência entre administradores</span></li>
          <li><CheckCircle2 size={15} /><span>Auditoria append-only de acessos e decisões</span></li>
          <li><CheckCircle2 size={15} /><span>Minimização dos dados após a conclusão</span></li>
        </ul>
      </article>
    </section>
  );
}
