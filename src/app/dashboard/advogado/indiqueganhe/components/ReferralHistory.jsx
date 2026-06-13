"use client";

import {
  CalendarDays,
  Coins,
  Mail,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import styles from "../IndiqueGanhe.module.css";

function formatDate(value) {
  if (!value) return "Data não informada";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Data não informada";
  }
}

function getProfileLabel(profileType) {
  if (profileType === "LAWYER") return "Advogado";
  if (profileType === "CLIENT") return "Cliente";
  return "Cadastro pendente";
}

function getRewardPresentation(item) {
  const amount = Number(item.reward?.amount || 0);

  if (item.status?.code === "COMMISSIONED") {
    return {
      label: amount > 0 ? `+${amount} Juris` : "Creditado",
      credited: true,
    };
  }

  if (["ELIGIBLE", "REVIEW"].includes(item.status?.code)) {
    return { label: "Aguardando", credited: false };
  }

  return { label: "Sem crédito", credited: false };
}

function RewardValue({ item, mobile = false }) {
  const reward = getRewardPresentation(item);

  return (
    <span
      className={`${mobile ? "" : styles.rewardValue} ${
        reward.credited ? styles.rewardCredited : ""
      }`}
    >
      <Coins size={mobile ? 13 : 14} aria-hidden="true" />
      {reward.label}
    </span>
  );
}

export default function ReferralHistory({ controller }) {
  const referrals = controller.filteredReferrals;

  return (
    <section className={styles.historySection} aria-labelledby="history-title">
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.sectionEyebrow}>Transparência</span>
          <h2 id="history-title">Histórico de indicações</h2>
          <p>
            Acompanhe o cadastro, a assinatura e o processamento de cada
            recompensa.
          </p>
        </div>
        <span className={styles.resultCount}>
          {referrals.length} de {controller.data.referrals.length}
        </span>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={controller.search}
            onChange={(event) => controller.setSearch(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            maxLength={120}
          />
        </label>

        <label className={styles.filterField}>
          <span>Status</span>
          <select
            value={controller.statusFilter}
            onChange={(event) => controller.setStatusFilter(event.target.value)}
          >
            <option value="ALL">Todos os status</option>
            {controller.statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {referrals.length === 0 ? (
        <div className={styles.emptyHistory}>
          <UsersRound size={38} aria-hidden="true" />
          <h3>
            {controller.data.referrals.length
              ? "Nenhuma indicação corresponde aos filtros"
              : "Você ainda não possui indicações"}
          </h3>
          <p>
            {controller.data.referrals.length
              ? "Altere a busca ou selecione outro status."
              : "Compartilhe seu link profissional para começar a acompanhar os cadastros."}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Indicado</th>
                  <th>Cadastro</th>
                  <th>Status</th>
                  <th>Recompensa</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.personCell}>
                        <span className={styles.personIcon}>
                          <UserRound size={16} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{item.referred.name}</strong>
                          <span>
                            <Mail size={12} aria-hidden="true" />
                            {item.referred.maskedEmail}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.dateCell}>
                        <CalendarDays size={14} aria-hidden="true" />
                        <span>{formatDate(item.createdAt)}</span>
                        <small>{getProfileLabel(item.referred.profileType)}</small>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${item.status.tone}`] || ""}`}
                        title={item.status.description}
                      >
                        {item.status.label}
                      </span>
                      <p className={styles.statusDescription}>
                        {item.status.description}
                      </p>
                    </td>
                    <td>
                      <RewardValue item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileHistory}>
            {referrals.map((item) => (
              <article key={item.id} className={styles.mobileReferralCard}>
                <div className={styles.mobileReferralHeader}>
                  <div>
                    <strong>{item.referred.name}</strong>
                    <span>{item.referred.maskedEmail}</span>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${styles[`status_${item.status.tone}`] || ""}`}
                  >
                    {item.status.label}
                  </span>
                </div>

                <p>{item.status.description}</p>

                <div className={styles.mobileReferralMeta}>
                  <span>
                    <CalendarDays size={13} aria-hidden="true" />
                    {formatDate(item.createdAt)}
                  </span>
                  <RewardValue item={item} mobile />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {controller.data.schema.truncated && (
        <p className={styles.limitNote}>
          A tela exibe as {controller.data.schema.resultLimit} indicações mais
          recentes.
        </p>
      )}
    </section>
  );
}
