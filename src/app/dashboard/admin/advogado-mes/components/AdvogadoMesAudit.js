import { CheckCircle2, History, ShieldCheck, UserRound } from "lucide-react";

import styles from "../AdvogadoMesAdmin.module.css";

const ACTION_LABELS = {
  CREATE: "Configuração criada",
  UPDATE: "Configuração atualizada",
  DELETE: "Configuração removida",
  UPLOAD_DELETE: "Upload não utilizado removido",
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

  if (Object.prototype.hasOwnProperty.call(changes, "is_active")) {
    labels.push(changes.is_active ? "publicação ativada" : "publicação pausada");
  }
  if (changes.image_url) labels.push("imagem alterada");
  if (Object.prototype.hasOwnProperty.call(changes, "starts_at")) {
    labels.push("agenda inicial alterada");
  }
  if (Object.prototype.hasOwnProperty.call(changes, "ends_at")) {
    labels.push("agenda final alterada");
  }
  if (changes.alt_text) labels.push("acessibilidade revisada");
  if (Object.prototype.hasOwnProperty.call(changes, "link_url")) {
    labels.push("destino atualizado");
  }

  return labels.length ? labels.join(" · ") : item.reason || "Alteração registrada";
}

export default function AdvogadoMesAudit({
  items,
  available,
  governance,
}) {
  return (
    <section className={styles.auditGrid}>
      <article className={styles.auditCard}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>Rastreabilidade</span>
            <h2>
              <History size={18} aria-hidden="true" /> Atividade recente
            </h2>
            <p>Últimas alterações registradas para o destaque reservado.</p>
          </div>
        </div>

        {!available ? (
          <div className={styles.auditEmpty}>
            <ShieldCheck size={24} aria-hidden="true" />
            <strong>Auditoria ainda não habilitada</strong>
            <span>Execute a migração de governança dos banners no Supabase.</span>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.auditEmpty}>
            <History size={24} aria-hidden="true" />
            <strong>Nenhuma alteração registrada</strong>
            <span>O histórico aparecerá após a primeira configuração salva.</span>
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
            <span className={styles.eyebrow}>Proteções ativas</span>
            <h2>
              <ShieldCheck size={18} aria-hidden="true" /> Governança do módulo
            </h2>
            <p>Controles aplicados ao registro especial e à publicação pública.</p>
          </div>
        </div>

        <ul className={styles.governanceList}>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>API administrativa exclusiva e autenticada</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Registro reservado fora da gestão comum de banners</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Upload dedicado com validação real do arquivo</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>URL pública vinculada ao caminho correto no Storage</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Controle de versão contra sobrescrita entre administradores</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Agenda e estado conferidos novamente pela API pública</span>
          </li>
          <li>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>Resposta pública sem dados administrativos</span>
          </li>
        </ul>

        {governance && (
          <div className={styles.governanceFootnote}>
            Endpoint dedicado, vínculo de Storage, controle de versão e minimização
            pública foram confirmados pelo servidor nesta sessão.
          </div>
        )}
      </article>
    </section>
  );
}
