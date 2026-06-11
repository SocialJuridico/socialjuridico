import {
  Bell,
  Coins,
  Cpu,
  Database,
  Save,
  Search,
  Scale,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { OFFICE_PLANS } from "../utils/officeConstants";
import {
  formatDate,
  getOfficeInitials,
  getStaffCounts,
} from "../utils/officeFormatters";
import styles from "../EscritoriosAdmin.module.css";

function GeneralTab({ office }) {
  return (
    <div className={styles.generalGrid}>
      <section className={styles.detailPanel}>
        <h3>Dados operacionais</h3>
        <dl className={styles.detailList}>
          <div><dt>Responsável</dt><dd>{office.nome_responsavel || "Não informado"}</dd></div>
          <div><dt>E-mail</dt><dd>{office.email || "Não informado"}</dd></div>
          <div><dt>CNPJ</dt><dd>{office.cnpj || "Não informado"}</dd></div>
          <div><dt>Capacidade</dt><dd>{office.max_advogados || 0} advogados e {office.max_estagiarios || 0} estagiários</dd></div>
          <div><dt>CEP</dt><dd>{office.cep || "Não informado"}</dd></div>
          <div><dt>Cadastro</dt><dd>{formatDate(office.created_at)}</dd></div>
        </dl>
      </section>

      <section className={styles.detailPanel}>
        <h3>Especialidades e atuação</h3>
        <dl className={styles.detailList}>
          <div>
            <dt>Endereço</dt>
            <dd>{office.endereco || "Não informado"}{office.cidade_estado ? ` — ${office.cidade_estado}` : ""}</dd>
          </div>
          <div>
            <dt>Áreas de atuação</dt>
            <dd className={styles.tagsWrap}>
              {(office.areas_atuacao || []).length
                ? office.areas_atuacao.map((area) => <span key={area}>{area}</span>)
                : "Nenhuma selecionada"}
            </dd>
          </div>
          <div>
            <dt>Estados atendidos</dt>
            <dd className={styles.tagsWrap}>
              {(office.estados_atendidos || []).length
                ? office.estados_atendidos.map((state) => <span key={state}>{state}</span>)
                : "Nenhum informado"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function LimitsTab({ limits, onChange, onSave, busy }) {
  const fields = [
    { key: "storage_mb", label: "Armazenamento", icon: Database, suffix: "MB" },
    { key: "creditos_ia", label: "Créditos de IA", icon: Cpu, suffix: "requisições" },
    { key: "notificacoes", label: "Notificações extrajudiciais", icon: Bell, suffix: "por mês" },
    { key: "osint", label: "Buscas OSINT", icon: Search, suffix: "por mês" },
    { key: "oab_sinc", label: "OAB Sinc", icon: Scale, suffix: "por mês" },
  ];

  return (
    <div className={styles.limitsSection}>
      <p className={styles.sectionDescription}>
        Ajuste limites contratados ou conceda bônus específicos para este escritório.
      </p>

      <div className={styles.limitsGrid}>
        {fields.map(({ key, label, icon: Icon, suffix }) => (
          <label key={key} className={styles.limitCard}>
            <span className={styles.limitTitle}>
              <Icon size={17} aria-hidden="true" />
              {label}
            </span>
            <strong>
              {Number(limits[key] || 0) >= 999999
                ? "Ilimitado"
                : `${Number(limits[key] || 0).toLocaleString("pt-BR")} ${suffix}`}
            </strong>
            <input
              type="number"
              min="0"
              value={limits[key] ?? 0}
              onChange={(event) => onChange(key, Number(event.target.value))}
              disabled={busy}
            />
          </label>
        ))}
      </div>

      <button type="button" className={styles.goldButton} onClick={onSave} disabled={busy}>
        <Save size={16} aria-hidden="true" />
        {busy ? "Salvando..." : "Salvar limites e bônus"}
      </button>
    </div>
  );
}

function StaffTab({ office, staff, loading, onAdd }) {
  const counts = getStaffCounts(staff);

  return (
    <div>
      <div className={styles.staffHeader}>
        <div>
          <h3>Membros vinculados</h3>
          <p>
            Advogados: {counts.lawyers}/{office.max_advogados || 0} · Estagiários: {counts.interns}/{office.max_estagiarios || 0}
          </p>
        </div>
        <button type="button" className={styles.goldButton} onClick={onAdd}>
          <UserPlus size={16} aria-hidden="true" />
          Adicionar membro
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingPanel}>Carregando membros...</div>
      ) : !staff.length ? (
        <div className={styles.emptyStateCompact}>Nenhum membro cadastrado.</div>
      ) : (
        <div className={styles.staffGrid}>
          {staff.map((member) => (
            <article key={member.id} className={styles.staffCard}>
              <span className={styles.memberAvatar} aria-hidden="true">
                {(member.name || member.email || "M").slice(0, 1).toUpperCase()}
              </span>
              <div className={styles.memberInfo}>
                <strong>{member.name || "Membro sem nome"}</strong>
                <span>{member.email || "E-mail não informado"}</span>
                <span>{member.phone || "Telefone não informado"}</span>
              </div>
              <div className={styles.memberMeta}>
                <span className={styles.roleBadge}>
                  {member.cargo === "estagiario" ? "Estagiário" : "Advogado"}
                </span>
                <span>{member.oab ? `${member.oab}/${member.estado || ""}` : "Sem OAB"}</span>
                <span>{formatDate(member.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficeDossier({
  office,
  tab,
  staff,
  staffLoading,
  limits,
  planDraft,
  balanceDraft,
  busy,
  onClose,
  onTab,
  onPlanChange,
  onBalanceChange,
  onLimitChange,
  onSavePlan,
  onSaveBalance,
  onSaveLimits,
  onAddStaff,
}) {
  return (
    <section className={styles.dossier}>
      <header className={styles.dossierHeader}>
        <div className={styles.officeIdentityLarge}>
          <span className={styles.officeAvatarLarge} aria-hidden="true">
            {office.logo_url ? <img src={office.logo_url} alt="" /> : getOfficeInitials(office.nome)}
          </span>
          <div>
            <span className={styles.eyebrow}>Dossiê Enterprise</span>
            <h2>{office.nome}</h2>
            <p>{office.cnpj || "CNPJ não informado"}</p>
          </div>
        </div>

        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Fechar dossiê">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className={styles.officeControls}>
        <div className={styles.controlGroup}>
          <label htmlFor="office-plan">Plano</label>
          <div className={styles.controlRow}>
            <select id="office-plan" value={planDraft} onChange={(event) => onPlanChange(event.target.value)} disabled={busy}>
              {OFFICE_PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
            </select>
            <button type="button" className={styles.secondaryButton} onClick={onSavePlan} disabled={busy}>Salvar plano</button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="office-balance"><Coins size={14} aria-hidden="true" /> Juris do escritório</label>
          <div className={styles.controlRow}>
            <input id="office-balance" type="number" min="0" value={balanceDraft} onChange={(event) => onBalanceChange(event.target.value)} disabled={busy} />
            <button type="button" className={styles.secondaryButton} onClick={onSaveBalance} disabled={busy}>Salvar saldo</button>
          </div>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Seções do escritório">
        <button type="button" className={tab === "geral" ? styles.tabActive : ""} onClick={() => onTab("geral")}>Ficha do escritório</button>
        <button type="button" className={tab === "limites" ? styles.tabActive : ""} onClick={() => onTab("limites")}>Limites e bônus</button>
        <button type="button" className={tab === "funcionarios" ? styles.tabActive : ""} onClick={() => onTab("funcionarios")}><Users size={15} aria-hidden="true" /> Equipe</button>
      </nav>

      <div className={styles.dossierBody}>
        {tab === "geral" && <GeneralTab office={office} />}
        {tab === "limites" && (
          <LimitsTab limits={limits} onChange={onLimitChange} onSave={onSaveLimits} busy={busy} />
        )}
        {tab === "funcionarios" && (
          <StaffTab office={office} staff={staff} loading={staffLoading} onAdd={onAddStaff} />
        )}
      </div>
    </section>
  );
}
