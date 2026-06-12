"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  History,
  Image as ImageIcon,
  LayoutPanelLeft,
  Link2,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { useAdminBanners } from "./useAdminBanners";
import styles from "./BannersAdmin.module.css";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Publicados" },
  { value: "scheduled", label: "Agendados" },
  { value: "inactive", label: "Pausados" },
  { value: "expired", label: "Encerrados" },
];

const STATUS_META = {
  active: { label: "Publicado", icon: CheckCircle2 },
  scheduled: { label: "Agendado", icon: Clock3 },
  inactive: { label: "Pausado", icon: PauseCircle },
  expired: { label: "Encerrado", icon: CalendarClock },
};

const AUDIT_LABELS = {
  CREATE: "criou",
  UPDATE: "atualizou",
  DELETE: "excluiu",
  UPLOAD_DELETE: "removeu upload",
};

function formatDateTime(value) {
  if (!value) return "Sem limite";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function SummaryCard({ icon: Icon, value, label, detail }) {
  return (
    <article className={styles.summaryCard}>
      <span className={styles.summaryIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <strong>{value ?? 0}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function AdminBannersPage() {
  const banners = useAdminBanners();
  const modalOpen = Boolean(banners.modal);
  const operationBusy = banners.saving || banners.uploading || banners.busyId;

  useEffect(() => {
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !operationBusy) {
        void banners.closeModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [banners, modalOpen, operationBusy]);

  if (banners.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando gestão de banners</h1>
        <p>Validando publicações, agenda e armazenamento.</p>
      </main>
    );
  }

  const form = banners.modal?.form;
  const canSave = Boolean(
    form?.name?.trim() &&
      form?.image_url?.trim() &&
      (form.display_mode !== "loop" || form.target_banner_id),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel admin
          </Link>

          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>
              <ImageIcon size={22} aria-hidden="true" />
            </span>
            <div>
              <span className={styles.eyebrow}>Conteúdo promocional administrado</span>
              <h1>Banners</h1>
              <p>
                Controle publicação, rotação, agenda, acessibilidade e arquivos
                exibidos nas laterais da plataforma.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={banners.loadBanners}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Atualizar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={banners.openCreate}
          >
            <Plus size={16} aria-hidden="true" />
            Novo banner
          </button>
        </div>
      </header>

      {banners.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Não foi possível atualizar os dados</strong>
            <p>{banners.loadError}</p>
          </div>
          <button type="button" onClick={banners.loadBanners}>
            Tentar novamente
          </button>
        </div>
      )}

      {!banners.auditAvailable && (
        <div className={styles.migrationBanner} role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Auditoria ainda não habilitada</strong>
            <p>
              Execute a migração de governança dos banners para registrar todas
              as alterações administrativas.
            </p>
          </div>
        </div>
      )}

      <section className={styles.summaryGrid} aria-label="Resumo dos banners">
        <SummaryCard
          icon={ImageIcon}
          value={banners.summary?.total}
          label="Banners cadastrados"
          detail={`${banners.summary?.left || 0} à esquerda · ${banners.summary?.right || 0} à direita`}
        />
        <SummaryCard
          icon={CheckCircle2}
          value={banners.summary?.active}
          label="Publicados agora"
          detail="Visíveis na plataforma"
        />
        <SummaryCard
          icon={Clock3}
          value={banners.summary?.scheduled}
          label="Agendados"
          detail="Aguardando data inicial"
        />
        <SummaryCard
          icon={PauseCircle}
          value={banners.summary?.inactive}
          label="Pausados"
          detail="Desativados manualmente"
        />
        <SummaryCard
          icon={CalendarClock}
          value={banners.summary?.expired}
          label="Encerrados"
          detail="Fora do período definido"
        />
      </section>

      <section className={styles.filters} aria-label="Filtros dos banners">
        <label className={styles.searchWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por nome, link ou texto alternativo..."
            value={banners.search}
            onChange={(event) => banners.setSearch(event.target.value)}
          />
        </label>

        <div className={styles.filterGroup}>
          <span>Posição</span>
          <div className={styles.filterTabs}>
            {[
              ["all", "Todas"],
              ["left", "Esquerda"],
              ["right", "Direita"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  banners.positionFilter === value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => banners.setPositionFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span>Publicação</span>
          <div className={styles.filterTabs}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  banners.statusFilter === option.value
                    ? styles.filterTabActive
                    : styles.filterTab
                }
                onClick={() => banners.setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.listColumn}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Inventário visual</span>
              <h2>Banners configurados</h2>
            </div>
            <span className={styles.resultCount}>
              {banners.filtered.length} resultado(s)
            </span>
          </div>

          {banners.filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <ImageIcon size={28} aria-hidden="true" />
              <h3>Nenhum banner encontrado</h3>
              <p>Altere os filtros ou cadastre uma nova publicação.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {banners.filtered.map((banner) => {
                const status =
                  STATUS_META[banner.publication_status] || STATUS_META.inactive;
                const StatusIcon = status.icon;
                const busy = banners.busyId === banner.id;

                return (
                  <article key={banner.id} className={styles.bannerCard}>
                    <div className={styles.previewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image_url}
                        alt={banner.alt_text || banner.name || "Banner"}
                        className={styles.preview}
                      />
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${banner.publication_status}`]}`}
                      >
                        <StatusIcon size={12} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>

                    <div className={styles.bannerInfo}>
                      <div className={styles.bannerTitleRow}>
                        <div>
                          <h3>{banner.name || "Sem nome"}</h3>
                          <p>{banner.alt_text || "Sem texto alternativo"}</p>
                        </div>
                        <div className={styles.badges}>
                          <span>
                            <LayoutPanelLeft size={12} aria-hidden="true" />
                            {banner.position === "right" ? "Direita" : "Esquerda"}
                          </span>
                          <span>Bloco {Number(banner.slot_index || 0) + 1}</span>
                          {banner.storage_path && (
                            <span>
                              <HardDrive size={12} aria-hidden="true" /> Storage
                            </span>
                          )}
                        </div>
                      </div>

                      <dl className={styles.bannerMeta}>
                        <div>
                          <dt>Início</dt>
                          <dd>{formatDateTime(banner.starts_at)}</dd>
                        </div>
                        <div>
                          <dt>Encerramento</dt>
                          <dd>{formatDateTime(banner.ends_at)}</dd>
                        </div>
                        <div>
                          <dt>Destino</dt>
                          <dd>{banner.link_url || "Sem link"}</dd>
                        </div>
                      </dl>

                      <div className={styles.cardActions}>
                        {banner.link_url && (
                          <a
                            href={banner.link_url}
                            target={banner.link_url.startsWith("/") ? undefined : "_blank"}
                            rel={
                              banner.link_url.startsWith("/")
                                ? undefined
                                : "noopener noreferrer"
                            }
                            className={styles.linkButton}
                          >
                            <ExternalLink size={14} aria-hidden="true" />
                            Abrir destino
                          </a>
                        )}
                        <button
                          type="button"
                          className={styles.visibilityButton}
                          onClick={() => banners.toggleBanner(banner)}
                          disabled={busy}
                        >
                          {banner.is_active ? (
                            <EyeOff size={14} aria-hidden="true" />
                          ) : (
                            <Eye size={14} aria-hidden="true" />
                          )}
                          {banner.is_active ? "Pausar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => banners.openEdit(banner)}
                          disabled={busy}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => banners.openDelete(banner)}
                          disabled={busy}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className={styles.auditPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Rastreabilidade</span>
              <h2>Atividade recente</h2>
            </div>
            <History size={18} aria-hidden="true" />
          </div>

          {!banners.auditAvailable ? (
            <p className={styles.auditEmpty}>Auditoria indisponível até a migração.</p>
          ) : banners.recentAudit.length === 0 ? (
            <p className={styles.auditEmpty}>Nenhuma alteração registrada ainda.</p>
          ) : (
            <div className={styles.auditList}>
              {banners.recentAudit.map((entry) => (
                <article key={entry.id}>
                  <span className={styles.auditAction}>
                    {AUDIT_LABELS[entry.action] || entry.action}
                  </span>
                  <strong>{entry.banner_id ? "Banner" : "Arquivo"}</strong>
                  {entry.reason && <p>{entry.reason}</p>}
                  <time dateTime={entry.created_at}>
                    {formatDateTime(entry.created_at)}
                  </time>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      {banners.modal && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !operationBusy) {
              void banners.closeModal();
            }
          }}
          role="presentation"
        >
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="banner-modal-title"
          >
            <header className={styles.modalHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {banners.modal.type === "delete"
                    ? "Exclusão auditável"
                    : "Configuração de publicação"}
                </span>
                <h2 id="banner-modal-title">
                  {banners.modal.type === "create"
                    ? "Novo banner"
                    : banners.modal.type === "edit"
                      ? "Editar banner"
                      : "Excluir banner"}
                </h2>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => void banners.closeModal()}
                disabled={Boolean(operationBusy)}
                aria-label="Fechar modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {banners.modal.type === "delete" ? (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.dangerNotice}>
                    <AlertTriangle size={18} aria-hidden="true" />
                    <div>
                      <strong>Esta ação remove o banner da plataforma.</strong>
                      <p>
                        O arquivo armazenado também será removido. Um registro
                        mínimo permanecerá no histórico de auditoria.
                      </p>
                    </div>
                  </div>

                  <p className={styles.deleteQuestion}>
                    Confirma a exclusão de <strong>{banners.modal.item.name}</strong>?
                  </p>

                  <label className={styles.formGroup}>
                    <span>Justificativa da exclusão</span>
                    <textarea
                      rows={4}
                      minLength={10}
                      maxLength={1000}
                      value={banners.modal.reason}
                      onChange={(event) =>
                        banners.setModal((current) => ({
                          ...current,
                          reason: event.target.value,
                        }))
                      }
                      placeholder="Ex.: campanha encerrada, material substituído ou publicação cancelada."
                    />
                    <small>Mínimo de 10 caracteres.</small>
                  </label>
                </div>

                <footer className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void banners.closeModal()}
                    disabled={Boolean(operationBusy)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={banners.deleteBanner}
                    disabled={
                      banners.busyId === banners.modal.item.id ||
                      banners.modal.reason.trim().length < 10
                    }
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    {banners.busyId === banners.modal.item.id
                      ? "Excluindo..."
                      : "Excluir definitivamente"}
                  </button>
                </footer>
              </>
            ) : (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.formGrid}>
                    <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <span>Nome administrativo</span>
                      <input
                        maxLength={120}
                        value={form.name}
                        onChange={(event) =>
                          banners.updateModalForm("name", event.target.value)
                        }
                        placeholder="Ex.: Campanha Plano Pro — Junho"
                      />
                    </label>

                    <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <span>Imagem do banner</span>
                      <div className={styles.uploadRow}>
                        <input
                          type="url"
                          value={form.image_url}
                          onChange={(event) =>
                            banners.updateModalForm("image_url", event.target.value)
                          }
                          placeholder="https://..."
                        />
                        <label className={styles.uploadButton}>
                          <Upload size={15} aria-hidden="true" />
                          {banners.uploading ? "Enviando..." : "Enviar imagem"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={banners.uploading}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void banners.uploadImage(file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <small>JPG, PNG, WebP ou GIF. Tamanho máximo: 5 MB.</small>
                    </div>

                    {form.image_url && (
                      <div className={`${styles.imagePreview} ${styles.formGroupFull}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.image_url}
                          alt={form.alt_text || form.name || "Prévia do banner"}
                        />
                        <div>
                          <strong>Prévia da publicação</strong>
                          <span>
                            {form.storage_path
                              ? "Arquivo no bucket administrativo"
                              : "Imagem externa por URL"}
                          </span>
                        </div>
                      </div>
                    )}

                    <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <span>Texto alternativo</span>
                      <input
                        maxLength={240}
                        value={form.alt_text}
                        onChange={(event) =>
                          banners.updateModalForm("alt_text", event.target.value)
                        }
                        placeholder="Descreva a mensagem visual para leitores de tela."
                      />
                    </label>

                    <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                      <span>Link de destino</span>
                      <div className={styles.inputWithIcon}>
                        <Link2 size={15} aria-hidden="true" />
                        <input
                          value={form.link_url}
                          onChange={(event) =>
                            banners.updateModalForm("link_url", event.target.value)
                          }
                          placeholder="https://... ou /rota-interna"
                        />
                      </div>
                    </label>

                    <label className={styles.formGroup}>
                      <span>Posição</span>
                      <select
                        value={form.position}
                        onChange={(event) =>
                          banners.updateModalForm("position", event.target.value)
                        }
                      >
                        <option value="left">Lateral esquerda</option>
                        <option value="right">Lateral direita</option>
                      </select>
                    </label>

                    <label className={styles.formGroup}>
                      <span>Organização</span>
                      <select
                        value={form.display_mode}
                        onChange={(event) =>
                          banners.updateModalForm("display_mode", event.target.value)
                        }
                      >
                        {banners.modal.type === "edit" && (
                          <option value="keep">Manter bloco atual</option>
                        )}
                        <option value="new">Criar novo bloco ao final</option>
                        <option value="loop">Rotacionar em bloco existente</option>
                      </select>
                    </label>

                    {form.display_mode === "loop" && (
                      <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <span>Banner parceiro da rotação</span>
                        <select
                          value={form.target_banner_id}
                          onChange={(event) =>
                            banners.updateModalForm(
                              "target_banner_id",
                              event.target.value,
                            )
                          }
                        >
                          <option value="">Selecione um banner</option>
                          {banners.banners
                            .filter(
                              (banner) =>
                                banner.position === form.position &&
                                banner.id !== banners.modal.id,
                            )
                            .map((banner) => (
                              <option key={banner.id} value={banner.id}>
                                {banner.name} — bloco {Number(banner.slot_index || 0) + 1}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}

                    <label className={styles.formGroup}>
                      <span>Início da publicação</span>
                      <input
                        type="datetime-local"
                        value={form.starts_at}
                        onChange={(event) =>
                          banners.updateModalForm("starts_at", event.target.value)
                        }
                      />
                    </label>

                    <label className={styles.formGroup}>
                      <span>Encerramento</span>
                      <input
                        type="datetime-local"
                        value={form.ends_at}
                        onChange={(event) =>
                          banners.updateModalForm("ends_at", event.target.value)
                        }
                      />
                    </label>

                    <label className={`${styles.switchRow} ${styles.formGroupFull}`}>
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) =>
                          banners.updateModalForm("is_active", event.target.checked)
                        }
                      />
                      <span>
                        <strong>Banner habilitado</strong>
                        <small>
                          A agenda só terá efeito enquanto esta opção estiver ativa.
                        </small>
                      </span>
                    </label>
                  </div>
                </div>

                <footer className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void banners.closeModal()}
                    disabled={Boolean(operationBusy)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={banners.saveBanner}
                    disabled={!canSave || banners.saving || banners.uploading}
                  >
                    {banners.saving ? "Salvando..." : "Salvar banner"}
                  </button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
