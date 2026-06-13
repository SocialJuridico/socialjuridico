"use client";

import { useRef } from "react";
import {
  CheckCircle2,
  FileText,
  Link2,
  Mic,
  Pause,
  ShieldCheck,
  Upload,
  Video,
  X,
} from "lucide-react";

import { BRAZIL_STATES, CASE_AREAS } from "../clientDashboardConfig";
import styles from "../ClientDashboard.module.css";

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadItem({ item, onRemove }) {
  return (
    <div className={styles.uploadItem}>
      <span className={styles.uploadItemIcon}>
        {item.category === "VIDEO" ? (
          <Video size={16} aria-hidden="true" />
        ) : item.category === "AUDIO" ? (
          <Mic size={16} aria-hidden="true" />
        ) : (
          <FileText size={16} aria-hidden="true" />
        )}
      </span>
      <span className={styles.uploadItemCopy}>
        <strong>{item.name}</strong>
        <small>
          {formatBytes(item.size)} ·{" "}
          {item.status === "uploading"
            ? "Enviando"
            : item.status === "ready"
              ? "Pronto"
              : item.status === "failed"
                ? "Falha no envio"
                : "Removendo"}
        </small>
      </span>
      <span
        className={`${styles.uploadStatusDot} ${
          styles[`uploadStatus_${item.status}`]
        }`}
        aria-hidden="true"
      />
      <button
        type="button"
        className={styles.iconButton}
        onClick={() => onRemove(item.localId)}
        disabled={item.status === "uploading" || item.status === "removing"}
        aria-label={`Remover ${item.name}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function ClientCaseComposer({ composer, onCancel }) {
  const attachmentsRef = useRef(null);
  const videoRef = useRef(null);

  if (composer.success) {
    return (
      <section className={styles.successCard}>
        <span>
          <CheckCircle2 size={34} aria-hidden="true" />
        </span>
        <h2>Caso publicado com sucesso</h2>
        <p>
          Os profissionais elegíveis serão notificados. Você poderá acompanhar
          interesses, conversas e alterações pela visão geral.
        </p>
      </section>
    );
  }

  return (
    <form className={styles.composerCard} onSubmit={composer.submit}>
      <div className={styles.pageIntroCardCompact}>
        <div>
          <span className={styles.eyebrow}>Nova solicitação jurídica</span>
          <h2>Conte o que aconteceu</h2>
          <p>
            Inclua os fatos principais, localidade e documentos relevantes. Evite
            expor senhas, dados bancários ou informações de terceiros sem
            necessidade.
          </p>
        </div>
        <ShieldCheck size={22} aria-hidden="true" />
      </div>

      <section className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <span>1</span>
          <div>
            <h3>Identificação do caso</h3>
            <p>Use um título objetivo e selecione a área mais próxima.</p>
          </div>
        </div>

        <div className={styles.formGridTwo}>
          <label className={styles.field}>
            <span>Título</span>
            <input
              type="text"
              maxLength={180}
              required
              placeholder="Ex.: Problema com contrato de aluguel"
              value={composer.form.titulo}
              onChange={(event) => composer.updateForm("titulo", event.target.value)}
            />
            <small>{composer.form.titulo.length}/180 caracteres</small>
          </label>

          <label className={styles.field}>
            <span>Área jurídica</span>
            <select
              required
              value={composer.form.area}
              onChange={(event) => composer.updateForm("area", event.target.value)}
            >
              <option value="">Selecione...</option>
              {CASE_AREAS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.formGridTwo}>
          <label className={styles.field}>
            <span>Cidade</span>
            <input
              type="text"
              maxLength={120}
              required
              placeholder="Ex.: Porto Alegre"
              value={composer.form.cidade}
              onChange={(event) => composer.updateForm("cidade", event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Estado</span>
            <select
              required
              value={composer.form.estado}
              onChange={(event) => composer.updateForm("estado", event.target.value)}
            >
              <option value="">Selecione...</option>
              {BRAZIL_STATES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <span>2</span>
          <div>
            <h3>Relato detalhado</h3>
            <p>Descreva fatos, datas, tentativas de solução e resultado esperado.</p>
          </div>
        </div>

        <label className={styles.field}>
          <span>Descrição</span>
          <textarea
            rows={8}
            maxLength={20000}
            required
            placeholder="Explique a situação com suas próprias palavras..."
            value={composer.form.descricao}
            onChange={(event) =>
              composer.updateForm("descricao", event.target.value)
            }
          />
          <small>{composer.form.descricao.length}/20.000 caracteres</small>
        </label>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <span>3</span>
          <div>
            <h3>Documentos e acessibilidade</h3>
            <p>
              Os caminhos são autorizados pelo servidor e vinculados à sua conta
              antes da publicação.
            </p>
          </div>
        </div>

        <div className={styles.mediaGrid}>
          <article className={styles.mediaCard}>
            <span className={styles.mediaIcon}>
              <Upload size={19} aria-hidden="true" />
            </span>
            <div>
              <strong>Anexos</strong>
              <p>Até 5 arquivos PDF, JPG, PNG ou WebP, com 10 MB cada.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => attachmentsRef.current?.click()}
              disabled={composer.uploadsByCategory.ATTACHMENT.length >= 5}
            >
              Selecionar arquivos
            </button>
            <input
              ref={attachmentsRef}
              type="file"
              hidden
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                composer.addFiles(event.target.files, "ATTACHMENT");
                event.target.value = "";
              }}
            />
          </article>

          <article className={styles.mediaCard}>
            <span className={styles.mediaIcon}>
              <Video size={19} aria-hidden="true" />
            </span>
            <div>
              <strong>Vídeo</strong>
              <p>Um arquivo MP4, WebM ou MOV com até 180 MB.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => videoRef.current?.click()}
              disabled={composer.uploadsByCategory.VIDEO.length >= 1}
            >
              Selecionar vídeo
            </button>
            <input
              ref={videoRef}
              type="file"
              hidden
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => {
                composer.addFiles(event.target.files, "VIDEO");
                event.target.value = "";
              }}
            />
          </article>

          <article className={styles.mediaCard}>
            <span className={styles.mediaIcon}>
              <Mic size={19} aria-hidden="true" />
            </span>
            <div>
              <strong>Relato por voz</strong>
              <p>Grave um áudio quando for mais fácil explicar verbalmente.</p>
            </div>
            {composer.isRecording ? (
              <button
                type="button"
                className={styles.recordingButton}
                onClick={composer.stopRecording}
              >
                <Pause size={15} aria-hidden="true" />
                Parar gravação · {composer.recordingTime}s
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={composer.startRecording}
                disabled={composer.uploadsByCategory.AUDIO.length >= 1}
              >
                <Mic size={15} aria-hidden="true" />
                Iniciar gravação
              </button>
            )}
          </article>
        </div>

        {composer.audioPreviewUrl && (
          <audio
            controls
            className={styles.audioPlayer}
            src={composer.audioPreviewUrl}
          />
        )}

        {composer.uploads.length > 0 && (
          <div className={styles.uploadList}>
            {composer.uploads.map((item) => (
              <UploadItem
                key={item.localId}
                item={item}
                onRemove={composer.removeUpload}
              />
            ))}
          </div>
        )}

        <label className={styles.field}>
          <span>Link externo de vídeo — opcional</span>
          <div className={styles.inputWithIcon}>
            <Link2 size={16} aria-hidden="true" />
            <input
              type="url"
              placeholder="https://..."
              value={composer.form.videoLink}
              onChange={(event) =>
                composer.updateForm("videoLink", event.target.value)
              }
            />
          </div>
          <small>Somente links HTTPS são aceitos.</small>
        </label>
      </section>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={composer.form.shareOnFacebook}
          onChange={(event) =>
            composer.updateForm("shareOnFacebook", event.target.checked)
          }
        />
        <span>
          Preparar também o compartilhamento do caso no Facebook após a
          publicação. O texto será copiado e a janela de compartilhamento será
          aberta.
        </span>
      </label>

      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onCancel}
          disabled={composer.submitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={
            composer.submitting ||
            composer.hasPendingUploads ||
            composer.hasFailedUploads
          }
        >
          {composer.submitting
            ? "Publicando..."
            : composer.hasPendingUploads
              ? "Aguardando uploads..."
              : "Publicar solicitação"}
        </button>
      </div>
    </form>
  );
}
