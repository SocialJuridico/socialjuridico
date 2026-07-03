"use client";

import { useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  Mic,
  Pause,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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

function AnalysisPanel({ composer }) {
  const { analysis, analyzing, runAnalysis } = composer;

  if (analyzing && !analysis) {
    return (
      <div className={styles.analysisPanel} aria-live="polite">
        <div className={styles.analysisHeader}>
          <Loader2 size={16} className={styles.analysisSpinner} aria-hidden="true" />
          <strong>Analisando o relato com IA…</strong>
        </div>
        <p className={styles.analysisHint}>
          Transcrevendo áudio/vídeo e classificando o caso. Aguarde alguns
          segundos.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  const showPriority = analysis.prioridade && analysis.prioridade !== "NORMAL";

  return (
    <div
      className={`${styles.analysisPanel} ${
        analysis.isSocial ? styles.analysisPanelSocial : ""
      }`.trim()}
      aria-live="polite"
    >
      <div className={styles.analysisHeader}>
        <Sparkles size={16} aria-hidden="true" />
        <strong>Pré-análise da IA</strong>
        <button
          type="button"
          className={styles.analysisReanalyze}
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <Loader2 size={13} className={styles.analysisSpinner} aria-hidden="true" />
          ) : (
            <RefreshCw size={13} aria-hidden="true" />
          )}
          Reanalisar
        </button>
      </div>

      {analysis.showPoliceButton && (
        <a
          href="tel:190"
          className={styles.policeButton}
          aria-label="Ligar para a Polícia Militar 190"
        >
          <Phone size={24} aria-hidden="true" />
          <span>
            <strong>LIGAR 190</strong>
            <small>Polícia Militar — risco à vida detectado</small>
          </span>
        </a>
      )}

      {analysis.aiUnavailable ? (
        <p className={styles.analysisHint}>
          <AlertTriangle size={14} aria-hidden="true" /> A IA está indisponível
          agora. Você ainda pode publicar normalmente — a classificação será feita
          depois.
        </p>
      ) : (
        <>
          <div className={styles.analysisTags}>
            {showPriority && (
              <span
                className={`${styles.analysisBadge} ${
                  analysis.prioridade === "URGENTE"
                    ? styles.analysisBadgeUrgent
                    : styles.analysisBadgePreferencial
                }`}
              >
                Prioridade: {analysis.prioridadeLabel}
              </span>
            )}
            {analysis.isSocial && (
              <span className={`${styles.analysisBadge} ${styles.analysisBadgeSocial}`}>
                {analysis.tipoSocialLabel}
              </span>
            )}
            {!showPriority && !analysis.isSocial && (
              <span className={styles.analysisBadge}>Caso comum</span>
            )}
          </div>

          {analysis.resumo && (
            <p className={styles.analysisSummary}>{analysis.resumo}</p>
          )}

          {analysis.transcricao && (
            <details className={styles.analysisDetails}>
              <summary>Ver transcrição do áudio/vídeo</summary>
              <p className={styles.analysisTranscript}>{analysis.transcricao}</p>
            </details>
          )}

          <p className={styles.analysisHint}>
            Classificação preliminar gerada por IA. Ajuste o relato acima se
            necessário e publique quando estiver pronto.
          </p>
        </>
      )}
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
            <h3>Documentos e acessibilidade</h3>
            <p>
              Comece por aqui. Grave um áudio, envie um vídeo ou anexe documentos
              — a IA transcreve e monta o caso pra você. Prefere escrever? Pule
              direto para a etapa 3.
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
            <button
              type="button"
              className={
                composer.isRecording
                  ? styles.recordingButton
                  : styles.secondaryButton
              }
              onClick={
                composer.isRecording
                  ? composer.stopRecording
                  : composer.startRecording
              }
              disabled={
                !composer.isRecording &&
                composer.uploadsByCategory.AUDIO.length >= 1
              }
              aria-label={
                composer.isRecording
                  ? "Parar gravação de áudio"
                  : "Iniciar gravação de áudio"
              }
            >
              <Pause
                size={15}
                hidden={!composer.isRecording}
                aria-hidden="true"
              />
              <Mic
                size={15}
                hidden={composer.isRecording}
                aria-hidden="true"
              />
              <span hidden={!composer.isRecording}>
                Parar gravação · {composer.recordingTime}s
              </span>
              <span hidden={composer.isRecording}>Iniciar gravação</span>
            </button>
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

        <AnalysisPanel composer={composer} />

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

      <section className={styles.formSection}>
        <div className={styles.formSectionTitle}>
          <span>2</span>
          <div>
            <h3>Identificação do caso</h3>
            <p>
              Localização é obrigatória. Se você enviou áudio ou vídeo, o título
              pode vir preenchido pela IA — ajuste se quiser.
            </p>
          </div>
        </div>

        <div className={styles.formGridTwo}>
          <label className={styles.field}>
            <span>Título (opcional se enviar áudio ou vídeo)</span>
            <input
              type="text"
              maxLength={180}
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
          <span>3</span>
          <div>
            <h3>Relato detalhado</h3>
            <p>
              Descreva fatos, datas, tentativas de solução e resultado esperado.
              Prefere falar? Deixe em branco e use o áudio/vídeo da etapa 1 — a IA
              transcreve aqui automaticamente.
            </p>
          </div>
        </div>

        <label className={styles.field}>
          <span>Descrição (opcional se enviar áudio ou vídeo)</span>
          <textarea
            rows={8}
            maxLength={20000}
            placeholder="Explique a situação com suas próprias palavras... ou grave um áudio/vídeo na etapa 1."
            value={composer.form.descricao}
            onChange={(event) =>
              composer.updateForm("descricao", event.target.value)
            }
          />
          <small>{composer.form.descricao.length}/20.000 caracteres</small>
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
