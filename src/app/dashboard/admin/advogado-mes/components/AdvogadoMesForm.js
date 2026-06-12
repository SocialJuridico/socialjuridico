import {
  CalendarClock,
  Image as ImageIcon,
  Link2,
  RotateCcw,
  Save,
  ShieldCheck,
  Type,
  Upload,
} from "lucide-react";

import styles from "../AdvogadoMesAdmin.module.css";

export default function AdvogadoMesForm({ state }) {
  const { config } = state;

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (file) void state.uploadImage(file);
    event.target.value = "";
  };

  return (
    <section className={styles.formCard} aria-labelledby="configuracao-title">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>Configuração editorial</span>
          <h2 id="configuracao-title">Conteúdo e publicação</h2>
          <p>
            As alterações só chegam ao popup público depois de serem salvas.
          </p>
        </div>
        {state.dirty && <span className={styles.unsavedBadge}>Não salvo</span>}
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <ImageIcon size={17} aria-hidden="true" />
          <div>
            <h3>Imagem do destaque</h3>
            <p>Use uma arte vertical ou quadrada, legível também em celulares.</p>
          </div>
        </div>

        <label className={styles.field}>
          <span>URL HTTPS da imagem</span>
          <div className={styles.inputWrap}>
            <ImageIcon size={16} aria-hidden="true" />
            <input
              type="url"
              inputMode="url"
              placeholder="https://cdn.exemplo.com/advogado-do-mes.webp"
              value={config.image_url}
              onChange={(event) => state.updateImageUrl(event.target.value)}
              disabled={state.operationBusy}
            />
          </div>
          <small>
            Ao informar uma URL manualmente, o vínculo com o Storage dedicado é
            removido do formulário.
          </small>
        </label>

        <div className={styles.uploadRow}>
          <label className={styles.uploadButton}>
            <Upload size={16} aria-hidden="true" />
            {state.uploading ? "Validando arquivo..." : "Enviar imagem do computador"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              disabled={state.operationBusy}
            />
          </label>
          <div className={styles.uploadMeta}>
            <strong>JPG, PNG, WebP ou GIF</strong>
            <span>Máximo de 5 MB · assinatura real validada no servidor</span>
          </div>
        </div>

        {config.storage_path && (
          <div className={styles.storageNotice}>
            <ShieldCheck size={16} aria-hidden="true" />
            <div>
              <strong>Arquivo protegido pelo fluxo administrativo</strong>
              <span>{config.storage_path}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <Type size={17} aria-hidden="true" />
          <div>
            <h3>Acessibilidade e destino</h3>
            <p>Descreva a arte e defina uma ação opcional ao clicar.</p>
          </div>
        </div>

        <label className={styles.field}>
          <span>Texto alternativo</span>
          <textarea
            rows={3}
            maxLength={240}
            placeholder="Ex.: Arte de homenagem ao advogado destaque do mês de junho."
            value={config.alt_text}
            onChange={(event) => state.updateField("alt_text", event.target.value)}
            disabled={state.operationBusy}
          />
          <small>{config.alt_text.length}/240 caracteres</small>
        </label>

        <label className={styles.field}>
          <span>Destino ao clicar — opcional</span>
          <div className={styles.inputWrap}>
            <Link2 size={16} aria-hidden="true" />
            <input
              type="text"
              placeholder="/pagina-interna ou https://dominio.com.br/perfil"
              value={config.link_url}
              onChange={(event) => state.updateField("link_url", event.target.value)}
              disabled={state.operationBusy}
            />
          </div>
          <small>
            São aceitas rotas internas iniciadas por / ou endereços externos HTTPS.
          </small>
        </label>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <CalendarClock size={17} aria-hidden="true" />
          <div>
            <h3>Agenda de publicação</h3>
            <p>Deixe os campos vazios para publicar sem limite de período.</p>
          </div>
        </div>

        <div className={styles.dateGrid}>
          <label className={styles.field}>
            <span>Início</span>
            <input
              type="datetime-local"
              value={config.starts_at}
              onChange={(event) => state.updateField("starts_at", event.target.value)}
              disabled={state.operationBusy}
            />
          </label>

          <label className={styles.field}>
            <span>Encerramento</span>
            <input
              type="datetime-local"
              value={config.ends_at}
              min={config.starts_at || undefined}
              onChange={(event) => state.updateField("ends_at", event.target.value)}
              disabled={state.operationBusy}
            />
          </label>
        </div>

        <label className={styles.switchRow}>
          <span className={styles.switchCopy}>
            <strong>Deixar ativo ao salvar</strong>
            <small>
              A agenda continua sendo respeitada mesmo quando o estado estiver ativo.
            </small>
          </span>
          <input
            type="checkbox"
            checked={config.is_active}
            onChange={(event) => state.updateField("is_active", event.target.checked)}
            disabled={state.operationBusy}
          />
          <span className={styles.switchTrack} aria-hidden="true">
            <span />
          </span>
        </label>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={state.discardChanges}
          disabled={!state.dirty || state.operationBusy}
        >
          <RotateCcw size={16} aria-hidden="true" />
          Descartar alterações
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={state.saveConfig}
          disabled={!state.dirty || state.operationBusy}
        >
          <Save size={16} aria-hidden="true" />
          {state.saving ? "Salvando..." : "Salvar configuração"}
        </button>
      </div>
    </section>
  );
}
