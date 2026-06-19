"use client";

import {
  AlertTriangle,
  BookOpenText,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  Gavel,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../Processos.module.css";
import { formatCnj, formatDate, useLawyerProcesses } from "../hooks/useLawyerProcesses";

function ProcessMetaGrid({ data }) {
  const capa = data?.capa || {};
  const tribunal = data?.tribunal || {};
  const fields = [
    ["Número CNJ", formatCnj(data?.numero_cnj)],
    ["Tribunal", tribunal.nome || tribunal.codigo || "—"],
    ["Classe", capa.classe || "—"],
    ["Sistema", capa.sistema || "—"],
    ["Formato", capa.formato || "—"],
    ["Órgão julgador", capa.orgao_julgador || "—"],
    ["Ajuizamento", formatDate(capa.data_ajuizamento)],
    ["Última atualização", formatDate(capa.data_ultima_atualizacao)],
  ];

  return (
    <dl className={styles.metaGrid}>
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PartyFields({ title, values, onChange, required = false }) {
  return (
    <div className={styles.partyForm}>
      <h4>{title}</h4>
      <div className={styles.formGrid}>
        <label>
          <span>{required ? "Nome *" : "Nome"}</span>
          <input
            value={values.nome}
            onChange={(event) => onChange("nome", event.target.value)}
            placeholder="Nome ou razão social"
          />
        </label>
        <label>
          <span>Tipo</span>
          <select value={values.tipo} onChange={(event) => onChange("tipo", event.target.value)}>
            <option value="pessoa_fisica">Pessoa física</option>
            <option value="pessoa_juridica">Pessoa jurídica</option>
            <option value="nao_informado">Não informado</option>
          </select>
        </label>
        <label>
          <span>Documento</span>
          <input
            value={values.documento}
            onChange={(event) => onChange("documento", event.target.value)}
            placeholder="CPF ou CNPJ"
          />
        </label>
        <label>
          <span>E-mail</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="cliente@email.com"
          />
        </label>
        <label>
          <span>Telefone</span>
          <input
            value={values.telefone}
            onChange={(event) => onChange("telefone", event.target.value)}
            placeholder="(11) 99999-9999"
          />
        </label>
        <label className={styles.fieldWide}>
          <span>Observações</span>
          <textarea
            value={values.observacoes}
            onChange={(event) => onChange("observacoes", event.target.value)}
            placeholder="Observações internas"
          />
        </label>
      </div>
    </div>
  );
}

function ProcessPreviewModal({ controller }) {
  if (!controller.previewData) return null;

  const hasParties = controller.parties.length > 0;
  const data = controller.previewData;

  return (
    <div className={styles.backdrop}>
      <section className={styles.previewModal} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <span>
              <ShieldCheck size={15} /> Conferência obrigatória
            </span>
            <h2>Revise o processo antes de importar</h2>
            <p>Nada será salvo no CRM sem sua confirmação.</p>
          </div>
          <button type="button" onClick={controller.resetImportState} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className={styles.previewBody}>
          <section className={styles.card}>
            <header>
              <h3>
                <FileText size={18} /> Capa do processo
              </h3>
            </header>
            <ProcessMetaGrid data={data} />
            {controller.subjects.length > 0 && (
              <div className={styles.tags}>
                {controller.subjects.map((subject) => (
                  <span key={`${subject.codigo || ""}-${subject.nome}`}>{subject.nome}</span>
                ))}
              </div>
            )}
          </section>

          {controller.warnings.length > 0 && (
            <section className={styles.warningBox}>
              <AlertTriangle size={19} />
              <div>
                <strong>Avisos da consulta</strong>
                {controller.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            </section>
          )}

          <section className={styles.card}>
            <header>
              <h3>
                <Sparkles size={18} /> Resumo da IA
              </h3>
            </header>
            <p className={styles.aiSummary}>{data.resumo_ia || "Resumo ainda não disponível."}</p>
          </section>

          <section className={styles.card}>
            <header>
              <h3>
                <Users size={18} /> Cliente do CRM
              </h3>
            </header>

            {!hasParties && (
              <div className={styles.inlineAlert}>
                O DataJud não retornou as partes deste processo. Informe ou selecione o cliente para salvar no CRM.
              </div>
            )}

            <div className={styles.clientModeGrid}>
              {hasParties && (
                <label className={controller.clientMode === "party" ? styles.optionActive : ""}>
                  <input
                    type="radio"
                    name="clientMode"
                    checked={controller.clientMode === "party"}
                    onChange={() => controller.setClientMode("party")}
                  />
                  Selecionar parte do DataJud
                </label>
              )}
              <label className={controller.clientMode === "existing" ? styles.optionActive : ""}>
                <input
                  type="radio"
                  name="clientMode"
                  checked={controller.clientMode === "existing"}
                  onChange={() => controller.setClientMode("existing")}
                />
                Vincular cliente existente
              </label>
              <label className={controller.clientMode === "manual" ? styles.optionActive : ""}>
                <input
                  type="radio"
                  name="clientMode"
                  checked={controller.clientMode === "manual"}
                  onChange={() => controller.setClientMode("manual")}
                />
                Informar manualmente
              </label>
            </div>

            {controller.clientMode === "party" && (
              <label className={styles.fullLabel}>
                <span>Qual parte é o cliente?</span>
                <select
                  value={controller.selectedPartyIndex}
                  onChange={(event) => controller.setSelectedPartyIndex(event.target.value)}
                >
                  {controller.parties.map((party, index) => (
                    <option key={`${party.nome}-${index}`} value={String(index)}>
                      {party.nome || "Parte sem nome"} {party.documento ? `· ${party.documento}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {controller.clientMode === "existing" && (
              <label className={styles.fullLabel}>
                <span>Selecionar cliente do CRM</span>
                <select
                  value={controller.selectedClientId}
                  onChange={(event) => controller.setSelectedClientId(event.target.value)}
                >
                  <option value="">Selecione...</option>
                  {controller.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {controller.clientMode === "manual" && (
              <PartyFields
                title="Cliente informado pelo advogado"
                values={controller.manualClient}
                onChange={controller.updateManualClient}
                required
              />
            )}

            <PartyFields
              title="Parte contrária opcional"
              values={controller.opposingParty}
              onChange={controller.updateOpposingParty}
            />
          </section>

          <section className={styles.card}>
            <header>
              <h3>
                <BookOpenText size={18} /> Últimas movimentações
              </h3>
            </header>
            {controller.movements.length ? (
              <div className={styles.movements}>
                {controller.movements.slice(0, 8).map((movement, index) => (
                  <article key={`${movement.data || movement.dataHora || index}`}>
                    <strong>{formatDate(movement.data || movement.dataHora || movement.data_hora)}</strong>
                    <p>
                      {movement.descricao ||
                        movement.texto ||
                        movement.movimento ||
                        JSON.stringify(movement).slice(0, 220)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyCompact}>Nenhuma movimentação retornada.</div>
            )}
          </section>
        </div>

        <footer className={styles.modalFooter}>
          <button type="button" onClick={controller.resetImportState} disabled={controller.saving}>
            Cancelar
          </button>
          <button type="button" onClick={controller.importProcess} disabled={controller.saving}>
            {controller.saving ? <Loader2 size={17} className={styles.spin} /> : <Check size={17} />}
            {controller.saving ? "Importando..." : "Confirmar e salvar no CRM"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ProcessFolderModal({ controller }) {
  if (!controller.folderOpen) return null;

  const data = controller.folder;
  const process = data?.process;

  return (
    <div className={styles.backdrop}>
      <section className={styles.folderModal} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <span>
              <FolderOpen size={15} /> Pasta processual digital
            </span>
            <h2>{process ? formatCnj(process.numeroCnj) : "Carregando processo..."}</h2>
            <p>{process?.clientName || "Cliente vinculado ao CRM"}</p>
          </div>
          <button
            type="button"
            onClick={() => controller.setFolderOpen(false)}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {controller.folderLoading ? (
          <div className={styles.state}>
            <Loader2 size={30} className={styles.spin} />
            <strong>Montando pasta...</strong>
          </div>
        ) : (
          <div className={styles.folderGrid}>
            <section className={styles.card}>
              <h3>Capa</h3>
              <ProcessMetaGrid
                data={{
                  numero_cnj: process?.numeroCnj,
                  tribunal: { nome: process?.tribunalNome },
                  capa: {
                    classe: process?.classe,
                    sistema: process?.sistema,
                    formato: process?.formato,
                    orgao_julgador: process?.orgaoJulgador,
                    data_ajuizamento: process?.dataAjuizamento,
                    data_ultima_atualizacao: process?.dataUltimaAtualizacao,
                  },
                }}
              />
            </section>

            <section className={styles.card}>
              <h3>Resumo da IA</h3>
              <p className={styles.aiSummary}>{process?.resumoIa || "Resumo não disponível."}</p>
            </section>

            <section className={styles.card}>
              <h3>Partes</h3>
              <div className={styles.partiesList}>
                {(data?.parties || []).map((party) => (
                  <article key={party.id}>
                    <strong>{party.name}</strong>
                    <span>
                      {party.role || "Parte"} · {party.party_type || "não informado"}
                      {party.is_client ? " · Cliente CRM" : ""}
                      {party.is_opposing_party ? " · Parte contrária" : ""}
                    </span>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h3>Movimentações</h3>
              <div className={styles.movements}>
                {(data?.movements || []).map((movement) => (
                  <article key={movement.id}>
                    <strong>{formatDate(movement.movement_date)}</strong>
                    <p>{movement.description}</p>
                  </article>
                ))}
              </div>
            </section>

            {(data?.warnings || []).length > 0 && (
              <section className={styles.warningBox}>
                <AlertTriangle size={19} />
                <div>
                  <strong>Avisos</strong>
                  {data.warnings.map((warning) => (
                    <p key={warning.id}>{warning.message}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function LawyerProcessesDashboard() {
  const controller = useLawyerProcesses();

  return (
    <LawyerDashboardShell
      activeRoute="processos"
      title="Processos"
      subtitle="Importação DataJud/CNJ vinculada ao CRM"
      icon={Gavel}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} /> API Social Jurídico + DataJud
            </span>
            <h1>
              Baixe processos e organize uma <span>pasta processual completa.</span>
            </h1>
            <p>
              Consulte o processo pelo CNJ, revise capa, partes, movimentações e resumo da IA antes de vincular ao cliente no CRM.
            </p>
          </div>

          <form className={styles.searchBox} onSubmit={controller.searchProcess}>
            <label>
              <span>Número do processo/CNJ</span>
              <input
                value={controller.cnj}
                onChange={(event) => controller.setCnj(event.target.value)}
                placeholder="1003394-43.2024.8.26.0394"
              />
            </label>
            <button type="submit" disabled={controller.searching}>
              {controller.searching ? <Loader2 size={17} className={styles.spin} /> : <Search size={17} />}
              {controller.searching ? "Buscando..." : "Buscar processo"}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Processos importados</span>
              <h2>Pastas processuais</h2>
            </div>
            <button type="button" onClick={() => controller.load(controller.pagination.page)}>
              <RefreshCw size={16} /> Atualizar
            </button>
          </header>

          {controller.loading ? (
            <div className={styles.state}>
              <Loader2 size={30} className={styles.spin} />
              <strong>Carregando processos...</strong>
            </div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}>
              <AlertTriangle size={30} />
              <strong>Não foi possível carregar</strong>
              <span>{controller.error}</span>
            </div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}>
              <BriefcaseBusiness size={36} />
              <strong>Nenhum processo importado</strong>
              <span>Use o campo acima para buscar e importar o primeiro processo.</span>
            </div>
          ) : (
            <div className={styles.processGrid}>
              {controller.items.map((item) => (
                <article key={item.id} className={styles.processCard}>
                  <header>
                    <span>
                      <Gavel size={19} />
                    </span>
                    <div>
                      <h3>{item.numeroFormatado}</h3>
                      <p>{item.tribunalCodigo || item.tribunalNome || "Tribunal não informado"}</p>
                    </div>
                  </header>
                  <dl>
                    <div>
                      <dt>Cliente</dt>
                      <dd>{item.clientName}</dd>
                    </div>
                    <div>
                      <dt>Classe</dt>
                      <dd>{item.classe || "—"}</dd>
                    </div>
                    <div>
                      <dt>Órgão julgador</dt>
                      <dd>{item.orgaoJulgador || "—"}</dd>
                    </div>
                  </dl>
                  <footer>
                    <small>Importado em {formatDate(item.createdAt)}</small>
                    <button type="button" onClick={() => controller.openFolder(item.id)}>
                      Abrir pasta <FolderOpen size={15} />
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {controller.pagination.totalPages > 1 && (
            <footer className={styles.pagination}>
              <button
                type="button"
                onClick={() => controller.load(controller.pagination.page - 1)}
                disabled={controller.pagination.page <= 1}
              >
                <ChevronLeft size={16} />
              </button>
              <strong>
                {controller.pagination.page} / {controller.pagination.totalPages}
              </strong>
              <button
                type="button"
                onClick={() => controller.load(controller.pagination.page + 1)}
                disabled={controller.pagination.page >= controller.pagination.totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </footer>
          )}
        </section>
      </div>

      <ProcessPreviewModal controller={controller} />
      <ProcessFolderModal controller={controller} />
    </LawyerDashboardShell>
  );
}
