"use client";

import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Eye,
  Gavel,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../AnunciosServicos.module.css";
import { useLawyerServiceAds } from "../useLawyerServiceAds";

const CATEGORY_OPTIONS = [
  {
    value: "ALL",
    label: "Todos",
    description: "Todos os parceiros",
    icon: BriefcaseBusiness,
  },
  {
    value: "PREPOSTOS",
    label: "Prepostos",
    description: "Representação em audiências",
    icon: UsersRound,
  },
  {
    value: "DILIGENCIAS",
    label: "Diligências",
    description: "Atos e apoio local",
    icon: Gavel,
  },
  {
    value: "OUTROS",
    label: "Outros serviços",
    description: "Soluções complementares",
    icon: Zap,
  },
];

function formatDate(value) {
  if (!value) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <article className={`${styles.summaryCard} ${accent ? styles[accent] : ""}`}>
      <span>
        <Icon size={18} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <section className={styles.stateBox} aria-live="polite">
      <Loader2 size={31} className={styles.spinner} aria-hidden="true" />
      <h3>Carregando parceiros e serviços</h3>
      <p>Organizando anúncios ativos, categorias e destaques recentes.</p>
    </section>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <section className={styles.stateBox}>
      <BriefcaseBusiness size={40} aria-hidden="true" />
      <h3>
        {hasFilters
          ? "Nenhum serviço corresponde aos filtros"
          : "Nenhum anúncio disponível no momento"}
      </h3>
      <p>
        {hasFilters
          ? "Altere a categoria, o termo pesquisado ou a preferência de destaque."
          : "Quando os parceiros publicarem novos serviços, eles aparecerão aqui para consulta."}
      </p>
      {hasFilters && (
        <button type="button" className={styles.buttonSecondary} onClick={onClear}>
          Limpar filtros
        </button>
      )}
    </section>
  );
}

function CategoryNavigation({ activeCategory, summary, onSelect }) {
  const counts = {
    ALL: summary.total,
    PREPOSTOS: summary.prepostos,
    DILIGENCIAS: summary.diligencias,
    OUTROS: summary.outros,
  };

  return (
    <section className={styles.categoryGrid} aria-label="Categorias de serviços">
      {CATEGORY_OPTIONS.map((category) => {
        const Icon = category.icon;
        const active = activeCategory === category.value;
        return (
          <button
            key={category.value}
            type="button"
            className={`${styles.categoryCard} ${active ? styles.categoryCardActive : ""}`}
            onClick={() => onSelect(category.value)}
            aria-pressed={active}
          >
            <span className={styles.categoryIcon}>
              <Icon size={19} aria-hidden="true" />
            </span>
            <div>
              <strong>{category.label}</strong>
              <small>{category.description}</small>
            </div>
            <em>{counts[category.value] || 0}</em>
          </button>
        );
      })}
    </section>
  );
}

function ServiceAdCard({ ad, busy, onDetails, onContact }) {
  return (
    <article className={`${styles.adCard} ${ad.featured ? styles.adCardFeatured : ""}`}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.categoryBadge}>{ad.categoryLabel}</span>
          {ad.featured && (
            <span className={styles.featuredBadge}>
              <Sparkles size={12} /> Destaque
            </span>
          )}
        </div>
        <time>{formatDate(ad.createdAt)}</time>
      </div>

      <div className={styles.advertiserRow}>
        <span className={styles.advertiserAvatar}>
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div>
          <small>Parceiro anunciante</small>
          <strong>{ad.advertiser?.name || "Parceiro do Social Jurídico"}</strong>
        </div>
        <BadgeCheck size={17} className={styles.verifiedIcon} aria-label="Parceiro ativo" />
      </div>

      <h3>{ad.title}</h3>
      <p className={styles.description}>{ad.description}</p>

      <footer className={styles.cardFooter}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => onDetails(ad)}
        >
          <Eye size={15} /> Ver detalhes
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={() => onContact(ad)}
          disabled={busy || !ad.contactAvailable}
          title={
            ad.contactAvailable
              ? "Abrir contato seguro pelo WhatsApp"
              : "Contato indisponível"
          }
        >
          {busy ? (
            <Loader2 size={15} className={styles.spinner} />
          ) : (
            <MessageCircle size={15} />
          )}
          {ad.contactAvailable ? "Falar com parceiro" : "Sem contato"}
        </button>
      </footer>
    </article>
  );
}

function ServiceAdDetailsModal({ ad, busy, onClose, onContact }) {
  if (!ad) return null;

  return (
    <div className={styles.modalOverlay} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-ad-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <div className={styles.badges}>
              <span className={styles.categoryBadge}>{ad.categoryLabel}</span>
              {ad.featured && (
                <span className={styles.featuredBadge}>
                  <Sparkles size={12} /> Destaque
                </span>
              )}
            </div>
            <h2 id="service-ad-title">{ad.title}</h2>
            <p>Publicado em {formatDate(ad.createdAt)}</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Fechar detalhes"
          >
            <X size={19} />
          </button>
        </header>

        <div className={styles.modalBody}>
          <section className={styles.partnerPanel}>
            <span className={styles.partnerIcon}>
              <Building2 size={22} />
            </span>
            <div>
              <small>Serviço publicado por</small>
              <strong>{ad.advertiser?.name || "Parceiro do Social Jurídico"}</strong>
              <span>
                <ShieldCheck size={13} /> Conta ativa no portal de parceiros
              </span>
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3>Descrição do serviço</h3>
            <p>{ad.description || "O anunciante não forneceu uma descrição."}</p>
          </section>

          <section className={styles.securityNotice}>
            <ShieldCheck size={20} />
            <div>
              <strong>Contato protegido e rastreável</strong>
              <p>
                O número do parceiro não é exposto nesta listagem. Ao continuar,
                a plataforma registra a abertura do contato e direciona você ao
                WhatsApp com uma mensagem de apresentação pronta.
              </p>
            </div>
          </section>

          <section className={styles.partnerDisclaimer}>
            <AlertTriangle size={18} />
            <p>
              O serviço é prestado por parceiro independente. Confirme escopo,
              valores, disponibilidade, qualificação e condições antes da
              contratação.
            </p>
          </section>
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" className={styles.buttonSecondary} onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={busy || !ad.contactAvailable}
            onClick={() => onContact(ad)}
          >
            {busy ? (
              <Loader2 size={15} className={styles.spinner} />
            ) : (
              <MessageCircle size={15} />
            )}
            {ad.contactAvailable ? "Abrir WhatsApp" : "Contato indisponível"}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function LawyerServiceAdsDashboard() {
  const controller = useLawyerServiceAds();

  return (
    <LawyerDashboardShell
      activeRoute="anuncioseservicos"
      title="Anúncios e Serviços"
      subtitle="Parceiros, prepostos e diligências para apoiar sua atuação"
      icon={BriefcaseBusiness}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} /> Marketplace profissional interno
            </span>
            <h2>
              Encontre apoio para sua atuação <span>jurídica.</span>
            </h2>
            <p>
              Consulte prepostos, diligências e serviços complementares publicados
              por parceiros ativos do ecossistema Social Jurídico.
            </p>
          </div>

          <div className={styles.heroAside}>
            <span>
              <Zap size={22} />
            </span>
            <div>
              <strong>Consulta sem consumo de Juris</strong>
              <p>
                Pesquise, compare e abra o contato do parceiro sem débito na sua
                carteira.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.summaryGrid} aria-label="Resumo do marketplace">
          <SummaryCard
            icon={BriefcaseBusiness}
            label="Serviços ativos"
            value={controller.summary.total}
            detail="Anúncios disponíveis"
          />
          <SummaryCard
            icon={Sparkles}
            label="Em destaque"
            value={controller.summary.featured}
            detail="Prioridade na listagem"
            accent="summaryFeatured"
          />
          <SummaryCard
            icon={Building2}
            label="Parceiros"
            value={controller.summary.advertisers}
            detail="Contas ativas"
          />
          <SummaryCard
            icon={Gavel}
            label="Diligências"
            value={controller.summary.diligencias}
            detail="Apoio jurídico local"
          />
        </section>

        <CategoryNavigation
          activeCategory={controller.appliedFilters.category}
          summary={controller.summary}
          onSelect={controller.selectCategory}
        />

        <section className={styles.panel}>
          <form className={styles.filters} onSubmit={controller.applyFilters}>
            <label className={styles.searchField}>
              <span>Buscar serviço ou parceiro</span>
              <div className={styles.inputWrap}>
                <Search size={16} aria-hidden="true" />
                <input
                  value={controller.filters.search}
                  onChange={(event) =>
                    controller.updateFilter("search", event.target.value)
                  }
                  placeholder="Ex.: audiência, correspondente, cópias..."
                  maxLength={120}
                />
              </div>
            </label>

            <label className={styles.field}>
              <span>Exibição</span>
              <select
                value={controller.filters.featured}
                onChange={(event) =>
                  controller.updateFilter("featured", event.target.value)
                }
              >
                <option value="ALL">Todos os anúncios</option>
                <option value="FEATURED">Somente destaques</option>
                <option value="STANDARD">Sem destaque</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Ordenar por</span>
              <select
                value={controller.filters.sort}
                onChange={(event) =>
                  controller.updateFilter("sort", event.target.value)
                }
              >
                <option value="RELEVANCE">Relevância</option>
                <option value="RECENT">Mais recentes</option>
              </select>
            </label>

            <div className={styles.filterActions}>
              <button type="submit" className={styles.button}>
                Filtrar
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={controller.clearFilters}
              >
                Limpar
              </button>
            </div>
          </form>

          <div className={styles.statusBar}>
            <span>
              <strong>{controller.pagination.total}</strong> serviço(s) encontrado(s)
            </span>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={controller.reload}
              disabled={controller.loading}
            >
              <RefreshCw
                size={14}
                className={controller.loading ? styles.spinner : ""}
              />
              Atualizar
            </button>
          </div>

          {controller.loading && !controller.ads.length ? (
            <LoadingState />
          ) : controller.error ? (
            <section className={styles.stateBox} role="alert">
              <AlertTriangle size={39} />
              <h3>Não foi possível carregar os serviços</h3>
              <p>{controller.error}</p>
              <button type="button" className={styles.button} onClick={controller.reload}>
                <RefreshCw size={15} /> Tentar novamente
              </button>
            </section>
          ) : controller.ads.length === 0 ? (
            <EmptyState
              hasFilters={controller.hasFilters}
              onClear={controller.clearFilters}
            />
          ) : (
            <div className={styles.adsGrid}>
              {controller.ads.map((ad) => (
                <ServiceAdCard
                  key={ad.id}
                  ad={ad}
                  busy={controller.busyContactId === ad.id}
                  onDetails={controller.openDetails}
                  onContact={controller.openContact}
                />
              ))}
            </div>
          )}

          {controller.pagination.pages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação de serviços">
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={controller.page <= 1}
                onClick={() =>
                  controller.setPage((current) => Math.max(1, current - 1))
                }
              >
                Anterior
              </button>
              <span>
                Página {controller.pagination.page} de {controller.pagination.pages}
              </span>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={controller.page >= controller.pagination.pages}
                onClick={() => controller.setPage((current) => current + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </section>
      </div>

      <ServiceAdDetailsModal
        ad={controller.selectedAd}
        busy={controller.busyContactId === controller.selectedAd?.id}
        onClose={() => controller.setSelectedAd(null)}
        onContact={controller.openContact}
      />
    </LawyerDashboardShell>
  );
}
