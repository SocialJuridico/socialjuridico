import { Filter, Search } from "lucide-react";

import styles from "../AnunciantesAdmin.module.css";

export default function AdvertiserFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  adFilter,
  setAdFilter,
  supportOnly,
  setSupportOnly,
}) {
  return (
    <section className={styles.toolbar} aria-label="Filtros de anunciantes">
      <div className={styles.searchWrap}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar empresa, usuário ou WhatsApp mascarado"
        />
      </div>

      <label className={styles.selectWrap}>
        <Filter size={15} aria-hidden="true" />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filtrar por situação da conta"
        >
          <option value="ALL">Todas as contas</option>
          <option value="ACTIVE">Ativas</option>
          <option value="SUSPENDED">Suspensas</option>
        </select>
      </label>

      <label className={styles.selectWrap}>
        <Filter size={15} aria-hidden="true" />
        <select
          value={adFilter}
          onChange={(event) => setAdFilter(event.target.value)}
          aria-label="Filtrar por situação dos anúncios"
        >
          <option value="ALL">Todos os anúncios</option>
          <option value="ACTIVE_ADS">Com anúncios ativos</option>
          <option value="FEATURED">Com destaque</option>
          <option value="NO_ADS">Sem anúncios</option>
          <option value="ARCHIVED_ONLY">Somente arquivados</option>
        </select>
      </label>

      <label className={styles.toggleFilter}>
        <input
          type="checkbox"
          checked={supportOnly}
          onChange={(event) => setSupportOnly(event.target.checked)}
        />
        Com histórico de suporte
      </label>
    </section>
  );
}
