import { AlertTriangle, LoaderCircle, Send, Users } from "lucide-react";
import styles from "../ComunicadosAdmin.module.css";

function getRecipientLabel(type) {
  return type === "lawyers" ? "Selecione o advogado" : "Selecione o cliente";
}

function getRecipientPlaceholder(type) {
  return type === "lawyers" ? "Escolha um advogado" : "Escolha um cliente";
}

export default function BroadcastForm({
  form,
  audienceOptions,
  audienceOption,
  limits,
  recipientType,
  recipients,
  loadingRecipients,
  estimatedRecipients,
  sending,
  canSubmit,
  onChange,
  onSubmit,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <span className={styles.formIcon}>
          <Send size={19} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.formEyebrow}>Novo comunicado</span>
          <h2>Configurar envio</h2>
          <p>
            O aviso será salvo na central de notificações e também poderá gerar push.
          </p>
        </div>
      </div>

      <div className={styles.audienceNote}>
        <AlertTriangle size={17} aria-hidden="true" />
        <div>
          <strong>Revise o público antes do envio</strong>
          <p>
            Comunicados coletivos não podem ser recolhidos após o processamento.
          </p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="broadcast-audience">Público do comunicado</label>
          <select
            id="broadcast-audience"
            value={form.audience}
            onChange={(event) => onChange("audience", event.target.value)}
            className={styles.select}
          >
            {audienceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {audienceOption?.description && (
            <span className={styles.fieldHint}>{audienceOption.description}</span>
          )}
        </div>

        {recipientType && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="broadcast-recipient">
              {getRecipientLabel(recipientType)}
            </label>
            <select
              id="broadcast-recipient"
              value={form.recipientId}
              onChange={(event) => onChange("recipientId", event.target.value)}
              className={styles.select}
              disabled={loadingRecipients}
              required
            >
              <option value="">
                {loadingRecipients
                  ? "Carregando destinatários..."
                  : getRecipientPlaceholder(recipientType)}
              </option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}{recipient.email ? ` — ${recipient.email}` : ""}
                </option>
              ))}
            </select>
            {!loadingRecipients && recipients.length === 0 && (
              <span className={styles.fieldError}>
                Nenhum destinatário disponível nesta categoria.
              </span>
            )}
          </div>
        )}

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <div className={styles.labelRow}>
            <label htmlFor="broadcast-title">Título</label>
            <span>{form.title.length}/{limits.title}</span>
          </div>
          <input
            id="broadcast-title"
            type="text"
            value={form.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Ex.: Atualização importante da plataforma"
            maxLength={limits.title}
            className={styles.input}
            required
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <div className={styles.labelRow}>
            <label htmlFor="broadcast-message">Mensagem</label>
            <span>{form.message.length}/{limits.message}</span>
          </div>
          <textarea
            id="broadcast-message"
            value={form.message}
            onChange={(event) => onChange("message", event.target.value)}
            placeholder="Digite o comunicado que será exibido na área de notificações do usuário."
            maxLength={limits.message}
            className={styles.textarea}
            required
          />
        </div>
      </div>

      <div className={styles.formFooter}>
        <div className={styles.estimatedReach}>
          <Users size={16} aria-hidden="true" />
          <span>
            Alcance estimado: <strong>{estimatedRecipients}</strong> usuário
            {estimatedRecipients === 1 ? "" : "s"}
          </span>
        </div>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={sending || !canSubmit}
        >
          {sending ? (
            <LoaderCircle size={16} className={styles.spinning} aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {sending ? "Enviando..." : "Enviar comunicado"}
        </button>
      </div>
    </form>
  );
}
