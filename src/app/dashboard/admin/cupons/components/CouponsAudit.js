import {
  CheckCircle2,
  History,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import styles from "../CouponsAdmin.module.css";

const ACTION_LABELS = {
  CREATE: "Cupom criado",
  UPDATE: "Cupom atualizado",
  ACTIVATE: "Cupom ativado",
  PAUSE: "Cupom pausado",
  ARCHIVE: "Cupom arquivado",
  STRIPE_REPLACE: "Referência Stripe substituída",
};

function formatDateTime(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function describeChanges(item) {
  const changes = item?.changes || {};
  const labels = [];

  if (Object.prototype.hasOwnProperty.call(changes, "ativo")) {
    labels.push(changes.ativo ? "campanha ativada" : "campanha pausada");
  }
  if (changes.codigo) labels.push("código alterado");
  if (changes.valor) labels.push("desconto alterado");
  if (changes.desconto_tipo) labels.push("modelo de desconto alterado");
  if (Object.prototype.hasOwnProperty.call(changes, "limite_total")) {
    labels.push("limite total alterado");
  }
  if (Object.prototype.hasOwnProperty.call(changes, "expira_em")) {
    labels.push("validade alterada");
  }
  if (changes.stripe_coupon_id) labels.push("referência Stripe atualizada");

  return labels.length ? labels.join(" · ") : item.reason || "Alteração registrada";
}

export default function CouponsAudit({ items, available }) {
  return (
    <section className={styles.auditGrid}>
      <article className={styles.auditCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Rastreabilidade comercial</span>
            <h2>
              <History size={18} aria-hidden="true" /> Atividade recente
            </h2>
            <p>Últimas operações administrativas realizadas nos cupons.</p>
          </div>
        </div>

        {!available ? (
          <div className={styles.auditEmpty}>
            <ShieldCheck size={24} aria-hidden="true" />
            <strong>Auditoria ainda não habilitada</strong>
            <span>Execute a migração de governança dos cupons no Supabase.</span>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.auditEmpty}>
            <History size={24} aria-hidden="true" />
            <strong>Nenhuma alteração registrada</strong>
            <span>O histórico aparecerá após a primeira operação administrativa.</span>
          </div>
        ) : (
          <div className={styles.auditList}>
            {items.map((item) => (
              <div key={item.id} className={styles.auditItem}>
                <span className={styles.auditIcon}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                </span>
                <div>
                  <strong>{ACTION_LABELS[item.action] || item.action}</strong>
                  <p>{describeChanges(item)}</p>
                  <small>
                    <UserRound size={11} aria-hidden="true" />
                    {item.admin_id
                      ? `Admin ${item.admin_id.slice(0, 8)}`
                      : "Ação de sistema"}
                    <span>·</span>
                    {formatDateTime(item.created_at)}
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
            <span className={styles.eyebrow}>Proteções aplicadas</span>
            <h2>
              <ShieldCheck size={18} aria-hidden="true" /> Governança do módulo
            </h2>
            <p>Controles ativos desde a administração até a confirmação financeira.</p>
          </div>
        </div>

        <ul className={styles.governanceList}>
          <li><CheckCircle2 size={15} /><span>API administrativa exclusiva e autenticada</span></li>
          <li><CheckCircle2 size={15} /><span>Stripe ID resolvido somente pelo servidor</span></li>
          <li><CheckCircle2 size={15} /><span>Reserva atômica antes de abrir o checkout</span></li>
          <li><CheckCircle2 size={15} /><span>Limites por usuário e globais protegidos contra concorrência</span></li>
          <li><CheckCircle2 size={15} /><span>Controle de versão entre administradores</span></li>
          <li><CheckCircle2 size={15} /><span>Arquivamento preserva usos e histórico financeiro</span></li>
          <li><CheckCircle2 size={15} /><span>Auditoria append-only de alterações comerciais</span></li>
        </ul>
      </article>
    </section>
  );
}
