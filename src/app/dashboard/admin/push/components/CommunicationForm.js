import { Bell, LoaderCircle, Mail, Send, Users } from "lucide-react";
import { COMMUNICATION_CHANNELS } from "../config/communicationOptions";
import styles from "../Push.module.css";

function getRecipientLabel(type) {
  if (type === "lawyers") return "Selecione o advogado";
  if (type === "clients") return "Selecione o cliente";
  if (type === "advertisers") return "Selecione o anunciante";
  return "Selecione o destinatário";
}

function getRecipientPlaceholder(type) {
  if (type === "lawyers") return "Escolha um advogado";
  if (type === "clients") return "Escolha um cliente";
  if (type === "advertisers") return "Escolha um anunciante";
  return "Escolha um destinatário";
}

function RecipientOption({ recipient }) {
  const suffix = recipient.email ? ` — ${recipient.email}` : " — sem e-mail";
  return (
    <option value={recipient.id}>
      {recipient.name}{suffix}
    </option>
  );
}

export default function CommunicationForm({
  channel,
  form,
  options,
  limits,
  recipientType,
  recipients,
  loadingRecipients,
  sending,
  canSubmit,
  onChange,
  onSubmit,
}) {
  const isPush = channel === COMMUNICATION_CHANNELS.PUSH;
  const Icon = isPush ? Bell : Mail;
  const titleLabel = isPush ? "Título da notificação" : "Assunto do e-mail";
  const messageLabel = isPush ? "Mensagem da notificação" : "Conteúdo do e-mail";
  const titlePlaceholder = isPush
    ? "Ex.: Novo benefício disponível"
    : "Ex.: Novidades na plataforma Social Jurídico";
  const messagePlaceholder = isPush
    ? "Digite a mensagem que será exibida no dispositivo do usuário."
    : "Digite o comunicado. As quebras de linha serão preservadas no e-mail.";

  function submitForm(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.formCard} onSubmit={submitForm}>
      <div className={styles.formHeader}>
        <span className={styles.formIcon}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <span className={styles.formEyebrow}>
            {isPush ? "Aplicativos e PWA" : "Caixa de entrada"}
          </span>
          <h2>{isPush ? "Disparar push notification" : "Enviar comunicado por e-mail"}</h2>
          <p>
            {isPush
              ? "A mensagem será encaminhada pelos serviços push configurados na plataforma."
              : "O comunicado utilizará o template institucional e o serviço de e-mail configurado."}
          </p>
        </div>
      </div>

      <div className={styles.audienceNote}>
        <Users size={17} aria-hidden="true" />
        <div>
          <strong>Revise o público antes do envio</strong>
          <p>Disparos coletivos podem alcançar todos os usuários da categoria selecionada.</p>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="communication-target">Público-alvo</label>
          <select
            id="communication-target"
            className={styles.select}
            value={form.targetMode}
            onChange={(event) => onChange("targetMode", event.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {recipientType && (
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="communication-recipient">
              {getRecipientLabel(recipientType)}
            </label>
            <select
              id="communication-recipient"
              className={styles.select}
              value={form.targetId}
              onChange={(event) => onChange("targetId", event.target.value)}
              disabled={loadingRecipients}
              required
            >
              <option value="">
                {loadingRecipients
                  ? "Carregando destinatários..."
                  : getRecipientPlaceholder(recipientType)}
              </option>
              {recipients.map((recipient) => (
                <RecipientOption key={recipient.id} recipient={recipient} />
              ))}
            </select>
            {!loadingRecipients && recipients.length === 0 && (
              <span className={styles.fieldHint}>
                Nenhum destinatário disponível nesta categoria.
              </span>
            )}
          </div>
        )}

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <div className={styles.labelRow}>
            <label htmlFor="communication-title">{titleLabel}</label>
            <span>{form.title.length}/{limits.title}</span>
          </div>
          <input
            id="communication-title"
            type="text"
            className={styles.input}
            placeholder={titlePlaceholder}
            value={form.title}
            onChange={(event) => onChange("title", event.target.value)}
            maxLength={limits.title}
            required
          />
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <div className={styles.labelRow}>
            <label htmlFor="communication-message">{messageLabel}</label>
            <span>{form.message.length}/{limits.message}</span>
          </div>
          <textarea
            id="communication-message"
            className={isPush ? styles.textarea : styles.textareaLarge}
            placeholder={messagePlaceholder}
            value={form.message}
            onChange={(event) => onChange("message", event.target.value)}
            maxLength={limits.message}
            required
          />
        </div>
      </div>

      <div className={styles.formFooter}>
        <p>
          {isPush
            ? "Push: título de até 60 caracteres e mensagem de até 180 caracteres."
            : "E-mail: o assunto e a mensagem serão inseridos no template institucional."}
        </p>
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
          {sending
            ? "Enviando..."
            : isPush
              ? "Disparar push"
              : "Enviar e-mail"}
        </button>
      </div>
    </form>
  );
}
