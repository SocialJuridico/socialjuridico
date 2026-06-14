"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Copy,
  FileCheck2,
  FileDown,
  FilePenLine,
  FileSignature,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { DOCUMENT_MODES } from "../documentGeneratorUtils";
import styles from "../DocumentGenerator.module.css";
import { useDocumentGenerator } from "../useDocumentGenerator";
import { ContractForm, PowerOfAttorneyForm } from "./DocumentForms";

function UsageCard({ usage, plan }) {
  const limitLabel = usage.limit === null ? "Ilimitado" : usage.limit || 0;
  return (
    <aside className={styles.usageCard}>
      <span>Plano {plan?.type || "FREE"}</span>
      <strong>{usage.used || 0} / {limitLabel}</strong>
      <div className={styles.progress} aria-hidden="true">
        <span style={{ width: `${Math.min(100, usage.percentage || 0)}%` }} />
      </div>
      <small>
        {usage.limit === null
          ? "Gerações sem limite operacional configurado."
          : `${usage.remaining || 0} gerações disponíveis neste ciclo.`}
      </small>
    </aside>
  );
}

function StateNotice({ title, message, onRetry }) {
  return (
    <section className={styles.notice}>
      <AlertTriangle size={22} />
      <div><h2>{title}</h2><p>{message}</p></div>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          <RefreshCw size={16} /> Tentar novamente
        </button>
      )}
    </section>
  );
}

export default function DocumentGeneratorDashboard() {
  const controller = useDocumentGenerator();
  const disabled =
    controller.loading ||
    controller.generating ||
    !controller.permissions.canUse ||
    controller.permissions.permissionDenied;

  return (
    <LawyerDashboardShell
      activeRoute="geradordedocumentos"
      title="Gerador de Documentos"
      subtitle="Contratos e procurações com formulário guiado, revisão e PDF"
      icon={FilePenLine}
    >
      {controller.loading || controller.loadingProfile ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={22} className={styles.spin} />
          <span>Carregando o ambiente seguro de documentos...</span>
        </div>
      ) : controller.error || controller.sessionError ? (
        <StateNotice
          title="Não foi possível carregar"
          message={controller.error || controller.sessionError}
          onRetry={controller.reload}
        />
      ) : controller.permissions.permissionDenied ? (
        <StateNotice
          title="Acesso restrito"
          message="Este perfil não possui permissão para utilizar o Gerador de Documentos."
        />
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>Fluxo jurídico guiado</span>
              <h2>Transforme informações estruturadas em documentos prontos para revisão.</h2>
              <p>
                Escolha contrato ou procuração, preencha as partes e gere uma minuta organizada.
                A identificação sensível é inserida localmente no documento final.
              </p>
              <div className={styles.badges}>
                <span><FileCheck2 size={14} /> Qualificação completa</span>
                <span><ShieldCheck size={14} /> Dados sensíveis protegidos</span>
                <span><FileDown size={14} /> Exportação em PDF</span>
              </div>
            </div>
            <UsageCard usage={controller.usage} plan={controller.plan} />
          </section>

          <section className={styles.modeTabs} aria-label="Tipo de documento">
            {DOCUMENT_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={controller.mode === item.id ? styles.activeMode : ""}
                onClick={() => controller.changeMode(item.id)}
                disabled={controller.generating}
              >
                {item.id === "contract" ? <FilePenLine size={17} /> : <FileSignature size={17} />}
                {item.label}
              </button>
            ))}
          </section>

          <section className={styles.workspace}>
            <form
              className={styles.formPanel}
              onSubmit={(event) => {
                event.preventDefault();
                void controller.generateDocument();
              }}
            >
              <header className={styles.panelHeader}>
                <div><Sparkles size={18} /><h3>Dados do documento</h3></div>
                <small>Revise os dados antes da geração.</small>
              </header>

              {controller.mode === "contract" ? (
                <ContractForm controller={controller} disabled={disabled} />
              ) : (
                <PowerOfAttorneyForm controller={controller} disabled={disabled} />
              )}

              <div className={styles.securityNote}>
                <ShieldCheck size={18} />
                <p>
                  Nomes, documentos e endereços não são enviados na solicitação de IA.
                  Eles são combinados no navegador após a geração do corpo jurídico.
                </p>
              </div>

              <button type="submit" className={styles.generateButton} disabled={disabled}>
                {controller.generating ? (
                  <Loader2 size={18} className={styles.spin} />
                ) : (
                  <Sparkles size={18} />
                )}
                {controller.generating ? "Gerando documento..." : "Gerar documento"}
              </button>
            </form>

            <section className={styles.previewPanel}>
              <header className={styles.previewHeader}>
                <div><FileSignature size={18} /><h3>Prévia para revisão</h3></div>
                <div className={styles.previewActions}>
                  <button type="button" onClick={controller.copyDocument} disabled={!controller.documentText} title="Copiar documento"><Copy size={16} /></button>
                  <button type="button" onClick={controller.downloadPdf} disabled={!controller.documentText} title="Baixar PDF"><FileDown size={16} /></button>
                  <button type="button" onClick={controller.clearDocument} disabled={!controller.documentText} title="Limpar prévia"><RefreshCw size={16} /></button>
                </div>
              </header>

              <div className={styles.preview}>
                {controller.documentText ? (
                  <pre>{controller.documentText}</pre>
                ) : (
                  <div className={styles.emptyPreview}>
                    <FileSignature size={34} />
                    <strong>O documento aparecerá aqui.</strong>
                    <span>Revise cláusulas, dados e fundamentos antes de assinar ou enviar.</span>
                  </div>
                )}
              </div>

              {controller.documentText && (
                <footer className={styles.previewFooter}>
                  <span>Após revisar, armazene e blinde o PDF no SmartDoc.</span>
                  <Link href="/dashboard/advogado/smartdoc">Abrir SmartDoc</Link>
                </footer>
              )}
            </section>
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}
