"use client";

import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
  Megaphone,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import AdvertiserCard from "./components/AdvertiserCard";
import AdvertiserFilters from "./components/AdvertiserFilters";
import AdvertiserFormModal from "./components/AdvertiserFormModal";
import AdvertiserStats from "./components/AdvertiserStats";
import AdvertiserSupportModal from "./components/AdvertiserSupportModal";
import ReasonModal from "./components/ReasonModal";
import { useAdminAdvertisers } from "./hooks/useAdminAdvertisers";
import styles from "./AnunciantesAdmin.module.css";

export default function AdminAdvertisersPage() {
  const {
    advertisers,
    summary,
    loading,
    refreshing,
    busyAction,
    loadError,
    loadAdvertisers,
    mutate,
  } = useAdminAdvertisers();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [adFilter, setAdFilter] = useState("ALL");
  const [supportOnly, setSupportOnly] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [formModal, setFormModal] = useState({
    open: false,
    mode: "create",
    advertiser: null,
  });
  const [supportAdvertiser, setSupportAdvertiser] = useState(null);
  const [reasonTarget, setReasonTarget] = useState(null);

  const filteredAdvertisers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return advertisers.filter((advertiser) => {
      if (statusFilter === "ACTIVE" && !advertiser.active) return false;
      if (statusFilter === "SUSPENDED" && advertiser.active) return false;
      if (supportOnly && advertiser.support.messageCount === 0) return false;

      const activeAds = advertiser.ads.filter(
        (ad) => ad.status === "ATIVO",
      );
      const archivedAds = advertiser.ads.filter(
        (ad) => ad.status === "ARQUIVADO",
      );

      if (adFilter === "ACTIVE_ADS" && activeAds.length === 0) return false;
      if (
        adFilter === "FEATURED" &&
        !activeAds.some((ad) => ad.featured)
      ) {
        return false;
      }
      if (adFilter === "NO_ADS" && advertiser.ads.length > 0) return false;
      if (
        adFilter === "ARCHIVED_ONLY" &&
        (archivedAds.length === 0 || activeAds.length > 0)
      ) {
        return false;
      }

      if (!term) return true;

      return [
        advertiser.companyName,
        advertiser.username,
        advertiser.maskedWhatsapp,
        ...advertiser.ads.map((ad) => ad.title),
      ].some((value) =>
        String(value || "").toLowerCase().includes(term),
      );
    });
  }, [adFilter, advertisers, search, statusFilter, supportOnly]);

  function openCreateModal() {
    setFormModal({ open: true, mode: "create", advertiser: null });
  }

  function openEditModal(advertiser) {
    setFormModal({ open: true, mode: "edit", advertiser });
  }

  function closeFormModal() {
    if (!busyAction) {
      setFormModal({ open: false, mode: "create", advertiser: null });
    }
  }

  async function submitAdvertiser(payload) {
    const editing = formModal.mode === "edit";

    try {
      await mutate(
        editing ? "UPDATE_ADVERTISER" : "CREATE_ADVERTISER",
        payload,
        editing ? "Anunciante atualizado." : "Anunciante criado.",
      );
      closeFormModal();
    } catch {
      // O hook já apresentou a mensagem de erro.
    }
  }

  function requestStatusChange(advertiser) {
    setReasonTarget({
      type: "ADVERTISER_STATUS",
      advertiser,
      title: advertiser.active ? "Suspender anunciante" : "Reativar anunciante",
      description: advertiser.active
        ? "O acesso ao portal será bloqueado imediatamente, mas anúncios, mensagens e histórico comercial permanecerão preservados."
        : "O anunciante voltará a acessar o portal. Os anúncios arquivados não serão restaurados automaticamente.",
      confirmLabel: advertiser.active ? "Suspender acesso" : "Reativar acesso",
      requireReason: true,
    });
  }

  function requestArchiveAd(ad) {
    setReasonTarget({
      type: "ARCHIVE_AD",
      ad,
      title: "Arquivar anúncio",
      description:
        "O anúncio sairá da vitrine e perderá o destaque, mas o conteúdo continuará disponível no histórico administrativo.",
      confirmLabel: "Arquivar anúncio",
      requireReason: true,
    });
  }

  function requestRestoreAd(ad) {
    setReasonTarget({
      type: "RESTORE_AD",
      ad,
      title: "Restaurar anúncio",
      description:
        "O anúncio voltará a ficar disponível na vitrine. O destaque não será ativado automaticamente.",
      confirmLabel: "Restaurar anúncio",
      requireReason: false,
    });
  }

  async function confirmReasonAction(reason) {
    if (!reasonTarget) return;

    try {
      if (reasonTarget.type === "ADVERTISER_STATUS") {
        const advertiser = reasonTarget.advertiser;
        await mutate(
          "SET_ADVERTISER_STATUS",
          {
            id: advertiser.id,
            active: !advertiser.active,
            reason,
          },
          advertiser.active
            ? "Acesso suspenso sem excluir o histórico."
            : "Acesso reativado.",
        );
      }

      if (reasonTarget.type === "ARCHIVE_AD") {
        await mutate(
          "ARCHIVE_AD",
          { id: reasonTarget.ad.id, reason },
          "Anúncio arquivado.",
        );
      }

      if (reasonTarget.type === "RESTORE_AD") {
        await mutate(
          "RESTORE_AD",
          { id: reasonTarget.ad.id },
          "Anúncio restaurado.",
        );
      }

      setReasonTarget(null);
    } catch {
      // O hook já apresentou a mensagem de erro.
    }
  }

  async function toggleFeatured(ad) {
    try {
      await mutate(
        "TOGGLE_FEATURED",
        { id: ad.id, featured: !ad.featured },
        ad.featured ? "Destaque removido." : "Destaque ativado.",
      );
    } catch {
      // O hook já apresentou a mensagem de erro.
    }
  }

  if (loading) {
    return (
      <main className={styles.statePage}>
        <LoaderCircle className={styles.spinning} size={30} />
        <h1>Carregando gestão de anunciantes</h1>
        <p>Organizando contas, anúncios, destaques e suporte.</p>
      </main>
    );
  }

  if (loadError && advertisers.length === 0) {
    return (
      <main className={styles.statePage}>
        <AlertTriangle size={30} />
        <h1>Não foi possível carregar os anunciantes</h1>
        <p>{loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => loadAdvertisers()}
        >
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <header className={styles.header}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao dashboard
          </Link>

          <div className={styles.headerContent}>
            <div>
              <span className={styles.eyebrow}>Ecossistema comercial</span>
              <h1>
                <Megaphone size={25} aria-hidden="true" />
                Gestão de anunciantes
              </h1>
              <p>
                Controle acessos, anúncios, destaques e suporte sem destruir o
                histórico comercial da plataforma.
              </p>
            </div>

            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => loadAdvertisers({ silent: true })}
                disabled={refreshing || Boolean(busyAction)}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? styles.spinning : undefined}
                  aria-hidden="true"
                />
                Atualizar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={openCreateModal}
              >
                <UserPlus size={16} aria-hidden="true" />
                Novo anunciante
              </button>
            </div>
          </div>
        </header>

        {loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Os dados podem estar desatualizados</strong>
              <p>{loadError}</p>
            </div>
          </div>
        )}

        <AdvertiserStats summary={summary} />

        <AdvertiserFilters
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          adFilter={adFilter}
          setAdFilter={setAdFilter}
          supportOnly={supportOnly}
          setSupportOnly={setSupportOnly}
        />

        <div className={styles.resultBar}>
          <span>
            {filteredAdvertisers.length} de {advertisers.length} anunciantes
          </span>
          <span>
            {summary.featuredAds} destaque(s) · {summary.supportMessages} mensagem(ns)
            de suporte
          </span>
        </div>

        <section className={styles.advertisersList}>
          {filteredAdvertisers.length ? (
            filteredAdvertisers.map((advertiser) => (
              <AdvertiserCard
                key={advertiser.id}
                advertiser={advertiser}
                expanded={expandedId === advertiser.id}
                busyAction={busyAction}
                onToggleExpanded={() =>
                  setExpandedId((current) =>
                    current === advertiser.id ? null : advertiser.id,
                  )
                }
                onEdit={openEditModal}
                onOpenSupport={setSupportAdvertiser}
                onChangeStatus={requestStatusChange}
                onToggleFeatured={toggleFeatured}
                onArchiveAd={requestArchiveAd}
                onRestoreAd={requestRestoreAd}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <Megaphone size={30} aria-hidden="true" />
              <strong>Nenhum anunciante encontrado</strong>
              <span>Revise os filtros aplicados ou crie uma nova conta.</span>
            </div>
          )}
        </section>
      </div>

      <AdvertiserFormModal
        mode={formModal.mode}
        advertiser={formModal.advertiser}
        open={formModal.open}
        saving={Boolean(busyAction)}
        onClose={closeFormModal}
        onSubmit={submitAdvertiser}
      />

      <AdvertiserSupportModal
        advertiser={supportAdvertiser}
        open={Boolean(supportAdvertiser)}
        onClose={() => setSupportAdvertiser(null)}
      />

      <ReasonModal
        open={Boolean(reasonTarget)}
        title={reasonTarget?.title || "Confirmar ação"}
        description={reasonTarget?.description || ""}
        confirmLabel={reasonTarget?.confirmLabel || "Confirmar"}
        requireReason={reasonTarget?.requireReason !== false}
        busy={Boolean(busyAction)}
        onClose={() => {
          if (!busyAction) setReasonTarget(null);
        }}
        onConfirm={confirmReasonAction}
      />
    </main>
  );
}
