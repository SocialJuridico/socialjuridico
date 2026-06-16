"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSignature,
  Fingerprint,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import styles from "./AssinaturasAdmin.module.css";

function formatDateTime(value) {
  if (!value) return "Nao registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nao registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function shortHash(value) {
  if (!value) return "-";
  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

export default function AdminAssinaturasPage() {
  const [documents, setDocuments] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("ASSINAR DOCUMENTO");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);

  const selectedDocument = useMemo(
    () => documents.find((item) => item.id === selectedId) || documents[0] || null,
    [documents, selectedId],
  );

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/assinaturas", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel carregar assinaturas.");
      }
      const data = payload.data || {};
      const nextDocuments = data.documents || [];
      setDocuments(nextDocuments);
      setSignatures(data.signatures || []);
      setMigrationRequired(Boolean(data.migrationRequired));
      setConfirmationPhrase(data.confirmationPhrase || "ASSINAR DOCUMENTO");
      setSelectedId((current) => current || nextDocuments[0]?.id || "");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function signDocument() {
    if (!selectedDocument || signing) return;
    setSigning(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/assinaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDocument.id,
          confirmation,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Nao foi possivel assinar o documento.");
      }
      setSuccess(`Documento assinado. Codigo: ${payload.data.verification_code}`);
      setConfirmation("");
      await loadData();
    } catch (signError) {
      setError(signError.message);
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle size={30} className={styles.spinning} />
        <h1>Carregando assinaturas internas</h1>
        <p>Preparando documentos e hashes de integridade.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} />
            Voltar ao dashboard
          </Link>

          <div className={styles.headerContent}>
            <div>
              <span className={styles.eyebrow}>Assinatura eletronica administrativa</span>
              <h1>
                <FileSignature size={28} />
                Assinaturas internas
              </h1>
              <p>
                Assine atas, relatorios e evidencias internas com manifestacao
                de vontade, hash SHA-256, carimbo de tempo e trilha de auditoria.
              </p>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={loadData}>
              <RefreshCw size={16} />
              Atualizar
            </button>
          </div>
        </header>

        {migrationRequired && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Migration pendente</strong>
              <p>
                Aplique o SQL docs/compliance/sql/20260616_admin_document_signatures.sql
                no Supabase para registrar assinaturas.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Operacao nao concluida</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className={styles.successBanner} role="status">
            <CheckCircle2 size={18} />
            <div>
              <strong>Assinatura registrada</strong>
              <p>{success}</p>
            </div>
          </div>
        )}

        <section className={styles.grid}>
          <div className={styles.documentList}>
            <div className={styles.sectionHeader}>
              <h2>Documentos disponiveis</h2>
              <span>{documents.length} documentos</span>
            </div>
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                className={`${styles.documentButton} ${
                  selectedDocument?.id === document.id ? styles.documentButtonActive : ""
                }`}
                onClick={() => {
                  setSelectedId(document.id);
                  setConfirmation("");
                }}
              >
                <span>
                  <strong>{document.title}</strong>
                  <small>{document.category}</small>
                </span>
                {document.latest_signature ? (
                  <em data-status="signed">Assinado</em>
                ) : (
                  <em>Disponivel</em>
                )}
              </button>
            ))}
          </div>

          {selectedDocument && (
            <section className={styles.signPanel}>
              <div className={styles.sectionHeader}>
                <div>
                  <span className={styles.eyebrow}>Documento selecionado</span>
                  <h2>{selectedDocument.title}</h2>
                </div>
                <ShieldCheck size={22} />
              </div>

              <div className={styles.evidenceGrid}>
                <div>
                  <span>Caminho</span>
                  <strong>{selectedDocument.path}</strong>
                </div>
                <div>
                  <span>Hash SHA-256</span>
                  <strong>{shortHash(selectedDocument.document_hash)}</strong>
                </div>
                <div>
                  <span>Atualizado em</span>
                  <strong>{formatDateTime(selectedDocument.modified_at)}</strong>
                </div>
                <div>
                  <span>Ultima assinatura</span>
                  <strong>{formatDateTime(selectedDocument.latest_signature?.signed_at)}</strong>
                </div>
              </div>

              <div className={styles.statementBox}>
                <Fingerprint size={18} />
                <p>{selectedDocument.statement}</p>
              </div>

              {selectedDocument.latest_signature && (
                <div className={styles.signatureBox}>
                  <span>Ultimo codigo de verificacao</span>
                  <strong>{selectedDocument.latest_signature.verification_code}</strong>
                  <small>
                    Assinado por {selectedDocument.latest_signature.signer_name} em{" "}
                    {formatDateTime(selectedDocument.latest_signature.signed_at)}
                  </small>
                  <a
                    href={`/api/admin/assinaturas/${selectedDocument.latest_signature.id}/download?format=pdf`}
                    className={styles.downloadLink}
                  >
                    <Download size={15} />
                    Baixar PDF certificado
                  </a>
                  <a
                    href={`/api/admin/assinaturas/${selectedDocument.latest_signature.id}/download`}
                    className={styles.downloadLink}
                  >
                    <Download size={15} />
                    Baixar evidencia tecnica
                  </a>
                </div>
              )}

              <label className={styles.confirmationLabel}>
                Digite <strong>{confirmationPhrase}</strong> para assinar
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={confirmationPhrase}
                />
              </label>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={signDocument}
                disabled={
                  signing ||
                  migrationRequired ||
                  confirmation.trim().toUpperCase() !== confirmationPhrase
                }
              >
                {signing ? <LoaderCircle size={16} className={styles.spinning} /> : <FileSignature size={16} />}
                {signing ? "Assinando" : "Assinar documento"}
              </button>
            </section>
          )}
        </section>

        <section className={styles.historyPanel}>
          <div className={styles.sectionHeader}>
            <h2>Historico de assinaturas</h2>
            <span>{signatures.length} registros</span>
          </div>
          <div className={styles.historyList}>
            {signatures.length === 0 ? (
              <p className={styles.emptyState}>Nenhuma assinatura registrada ainda.</p>
            ) : (
              signatures.map((signature) => (
                <article key={signature.id} className={styles.historyItem}>
                  <div>
                    <strong>{signature.document_title}</strong>
                    <span>
                      {signature.signer_name} - {formatDateTime(signature.signed_at)}
                    </span>
                  </div>
                  <div className={styles.historyActions}>
                    <code>{signature.verification_code}</code>
                    <a href={`/api/admin/assinaturas/${signature.id}/download?format=pdf`}>
                      <Download size={14} />
                      PDF
                    </a>
                    <a href={`/api/admin/assinaturas/${signature.id}/download`}>
                      <Download size={14} />
                      MD
                    </a>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
