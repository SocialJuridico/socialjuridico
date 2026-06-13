"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  ExternalLink,
  FileKey2,
  FileText,
  FolderOpen,
  HardDrive,
  Info,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../SmartDoc.module.css";
import { formatSmartDocSize, useSmartDocs } from "../useSmartDocs";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatStorage(value) {
  const mb = Number(value || 0);
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB`;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

function UploadModal({ controller }) {
  useEffect(() => {
    if (!controller.uploadOpen) return undefined;
    const previous = document.body.style.overflow;
    const handleKey = (event) => {
      if (event.key === "Escape" && !controller.uploading) {
        controller.closeUpload();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [controller.uploadOpen, controller.uploading, controller.closeUpload]);

  if (!controller.uploadOpen) return null;
  const isStart = controller.plan.type === "START";
  const protectionCost = controller.plan.protectCost || 3;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeUpload();
      }}
    >
      <section
        className={styles.uploadModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smartdoc-upload-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>IA Smart Docs</span>
            <h2 id="smartdoc-upload-title">Organizar novo documento</h2>
            <p>
              O arquivo será classificado, poderá ser vinculado a um cliente e
              ficará disponível por download autenticado.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={controller.closeUpload}
            disabled={controller.uploading}
            aria-label="Fechar"
          >
            <X size={19} />
          </button>
        </header>

        <form className={styles.uploadForm} onSubmit={controller.uploadDocument}>
          <input
            ref={controller.fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            hidden
            onChange={(event) =>
              controller.setSelectedFile(event.target.files?.[0] || null)
            }
          />

          <button
            type="button"
            className={styles.uploadZone}
            onClick={() => controller.fileInputRef.current?.click()}
            disabled={controller.uploading}
          >
            <UploadCloud size={34} />
            <strong>Selecionar PDF, Word ou imagem</strong>
            <span>PDF, DOC, DOCX, JPG ou PNG · máximo de 25 MB</span>
          </button>

          {controller.selectedFile && (
            <div className={styles.fileSummary}>
              <div>
                <strong>{controller.selectedFile.name}</strong>
                <span>{formatSmartDocSize(controller.selectedFile.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  controller.setSelectedFile(null);
                  if (controller.fileInputRef.current) {
                    controller.fileInputRef.current.value = "";
                  }
                }}
                disabled={controller.uploading}
                aria-label="Remover arquivo"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <label className={styles.formField}>
            <span>Vincular a um cliente do CRM — opcional</span>
            <select
              value={controller.selectedClientId}
              onChange={(event) =>
                controller.setSelectedClientId(event.target.value)
              }
              disabled={controller.uploading}
            >
              <option value="">Documento avulso</option>
              {controller.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.protectRow}>
            <input
              type="checkbox"
              checked={controller.protect}
              onChange={(event) => controller.setProtect(event.target.checked)}
              disabled={controller.uploading}
            />
            <ShieldCheck size={19} />
            <div>
              <strong>Blindar documento no envio</strong>
              <span>
                Gera hash SHA-512 e registra a operação para integridade e
                rastreabilidade. {isStart ? `Custo: ${protectionCost} Juris.` : "Incluído no plano PRO."}
              </span>
            </div>
          </label>

          <div className={styles.notice}>
            <Info size={16} />
            <span>
              Restam {formatStorage(controller.usage.remainingStorageMb)} de
              armazenamento no plano {controller.plan.type}. A reserva só é
              confirmada quando o upload termina com sucesso.
            </span>
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              onClick={controller.closeUpload}
              disabled={controller.uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!controller.selectedFile || controller.uploading}
            >
              {controller.uploading ? (
                <Loader2 size={16} className={styles.spin} />
              ) : controller.protect ? (
                <ShieldCheck size={16} />
              ) : (
                <UploadCloud size={16} />
              )}
              {controller.uploading
                ? "Enviando..."
                : controller.protect
                  ? "Enviar e blindar"
                  : "Enviar documento"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function SmartDocDashboard() {
  const controller = useSmartDocs();

  return (
    <LawyerDashboardShell
      activeRoute="smartdoc"
      title="IA Smart Docs"
      subtitle="Organização, vínculo ao CRM e proteção documental"
      icon={FileText}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              <Sparkles size={15} /> Documentos inteligentes
            </span>
            <h1>
              Seus arquivos jurídicos em uma <span>biblioteca segura.</span>
            </h1>
            <p>
              Organize documentos, classifique automaticamente, vincule aos
              clientes do CRM e aplique blindagem com rastreabilidade.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={controller.openUpload}
          >
            <UploadCloud size={17} /> Novo documento
          </button>
        </section>

        <section className={styles.overview}>
          <article className={styles.storageCard}>
            <div className={styles.storageHeader}>
              <div>
                <small>Armazenamento do plano {controller.plan.type}</small>
                <strong>
                  {formatStorage(controller.usage.usedStorageMb)} de {formatStorage(controller.usage.storageLimitMb)}
                </strong>
              </div>
              <span>
                <HardDrive size={18} />
              </span>
            </div>
            <div className={styles.storageTrack} aria-hidden="true">
              <span style={{ width: `${controller.usage.percentage || 0}%` }} />
            </div>
            <p>
              {formatStorage(controller.usage.remainingStorageMb)} disponíveis
              para novos documentos.
            </p>
          </article>

          <article className={styles.metricCard}>
            <span>
              <FolderOpen size={17} />
            </span>
            <div>
              <small>Total</small>
              <strong>{controller.metrics.total || 0}</strong>
              <p>documentos organizados</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span>
              <FileKey2 size={17} />
            </span>
            <div>
              <small>Blindados</small>
              <strong>{controller.metrics.protected || 0}</strong>
              <p>com hash de integridade</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span>
              <Link2 size={17} />
            </span>
            <div>
              <small>Vinculados</small>
              <strong>{controller.metrics.linked || 0}</strong>
              <p>associados ao CRM</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span>
              <Coins size={17} />
            </span>
            <div>
              <small>Blindagem</small>
              <strong>
                {controller.plan.type === "START"
                  ? `${controller.plan.protectCost || 3} Juris`
                  : "Incluída"}
              </strong>
              <p>
                {controller.plan.type === "START"
                  ? `saldo atual: ${controller.plan.balance || 0}`
                  : "sem desconto de Juris"}
              </p>
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Biblioteca documental</span>
              <h2>Documentos armazenados</h2>
            </div>
            <div className={styles.filters}>
              <label className={styles.searchField}>
                <Search size={15} />
                <input
                  type="search"
                  value={controller.filters.search}
                  onChange={(event) =>
                    controller.setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Buscar por arquivo ou tipo"
                />
              </label>
              <select
                value={controller.filters.type}
                onChange={(event) =>
                  controller.setFilters((current) => ({
                    ...current,
                    type: event.target.value,
                  }))
                }
                aria-label="Filtrar por tipo"
              >
                <option value="all">Todos os tipos</option>
                <option value="Petição">Petições</option>
                <option value="Contrato">Contratos</option>
                <option value="Sentença">Sentenças</option>
                <option value="Procuração">Procurações</option>
                <option value="Outros">Outros</option>
              </select>
              <select
                value={controller.filters.protection}
                onChange={(event) =>
                  controller.setFilters((current) => ({
                    ...current,
                    protection: event.target.value,
                  }))
                }
                aria-label="Filtrar por proteção"
              >
                <option value="all">Todos</option>
                <option value="protected">Blindados</option>
                <option value="standard">Sem blindagem</option>
              </select>
              <button
                type="button"
                className={styles.refresh}
                onClick={controller.reload}
                aria-label="Atualizar documentos"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </header>

          {controller.loading ? (
            <div className={styles.state}>
              <Loader2 size={30} className={styles.spin} />
              <strong>Carregando Smart Docs...</strong>
              <span>Consolidando documentos, limites e vínculos do CRM.</span>
            </div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}>
              <AlertTriangle size={30} />
              <strong>Não foi possível carregar</strong>
              <span>{controller.error}</span>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={controller.reload}
              >
                Tentar novamente
              </button>
            </div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}>
              <FolderOpen size={36} />
              <strong>Nenhum documento encontrado</strong>
              <span>
                Envie o primeiro arquivo ou altere os filtros da biblioteca.
              </span>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={controller.openUpload}
              >
                <UploadCloud size={15} /> Enviar documento
              </button>
            </div>
          ) : (
            <div className={styles.documentGrid}>
              {controller.items.map((document) => (
                <article key={document.id} className={styles.documentCard}>
                  <header className={styles.documentHeader}>
                    <span
                      className={
                        document.protected
                          ? styles.fileIconProtected
                          : styles.fileIcon
                      }
                    >
                      {document.protected ? (
                        <FileKey2 size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </span>
                    <div>
                      <h3 title={document.fileName}>{document.fileName}</h3>
                      <p>
                        {document.documentType} · {formatSmartDocSize(document.fileSizeBytes)}
                      </p>
                    </div>
                  </header>

                  <div className={styles.badges}>
                    <span>{document.documentType}</span>
                    {document.protected && (
                      <span className={styles.protectedBadge}>
                        Blindado
                      </span>
                    )}
                  </div>

                  <div className={styles.tags}>
                    {(document.tags || []).slice(0, 3).map((tag) => (
                      <span key={`${document.id}-${tag}`}>#{tag}</span>
                    ))}
                  </div>

                  <div className={styles.documentMeta}>
                    <span>
                      <Users size={13} />
                      {document.clientName || "Documento avulso"}
                    </span>
                    <span>
                      {document.protected ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Info size={13} />
                      )}
                      {document.protected
                        ? "Integridade registrada"
                        : "Armazenamento seguro"}
                    </span>
                  </div>

                  <footer className={styles.documentFooter}>
                    <div>
                      <small>Adicionado em</small>
                      <strong>{formatDate(document.createdAt)}</strong>
                    </div>
                    <div className={styles.documentActions}>
                      <button
                        type="button"
                        onClick={() => controller.openDocument(document)}
                        aria-label={`Abrir ${document.fileName}`}
                      >
                        <ExternalLink size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => controller.deleteDocument(document)}
                        disabled={controller.deletingId === document.id}
                        aria-label={`Excluir ${document.fileName}`}
                      >
                        {controller.deletingId === document.id ? (
                          <Loader2 size={15} className={styles.spin} />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {!controller.loading &&
            !controller.error &&
            controller.pagination.total > 0 && (
              <footer className={styles.pagination}>
                <span>{controller.currentRange}</span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      controller.load(controller.pagination.page - 1)
                    }
                    disabled={controller.pagination.page <= 1}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <strong>
                    {controller.pagination.page} / {controller.pagination.totalPages}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      controller.load(controller.pagination.page + 1)
                    }
                    disabled={
                      controller.pagination.page >=
                      controller.pagination.totalPages
                    }
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </footer>
            )}
        </section>
      </div>

      <UploadModal controller={controller} />
    </LawyerDashboardShell>
  );
}
