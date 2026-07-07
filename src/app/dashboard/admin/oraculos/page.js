"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldOff,
  XCircle,
} from "lucide-react";

import styles from "./OraculosAdmin.module.css";

const STATUS_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "PENDENTE_DOCUMENTOS", label: "Pendente documentos" },
  { value: "PENDENTE_SUPERVISOR", label: "Pendente supervisor" },
  { value: "PENDENTE_ADMIN", label: "Pendente admin" },
  { value: "ATIVO", label: "Ativo" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "REPROVADO", label: "Reprovado" },
];

const TIPO_LABELS = {
  ESTUDANTE: "Estudante de Direito",
  ESTAGIARIO: "Estagiário inscrito na OAB",
};

const DOC_FIELD_BY_TIPO = {
  ESTUDANTE: "comprovante_matricula_url",
  ESTAGIARIO: "comprovante_estagiario_url",
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function OraculoCard({ item, onDecide }) {
  const [reasonMode, setReasonMode] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const docField = DOC_FIELD_BY_TIPO[item.tipo];
  const hasDoc = Boolean(item[docField]);

  async function openDocument() {
    if (!hasDoc || loadingDoc) return;
    setLoadingDoc(true);
    try {
      const response = await fetch(
        `/api/admin/oraculos/${item.id}/documento?field=${docField}`,
        { cache: "no-store" },
      );
      const payload = await readJson(response);
      window.open(payload.data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao abrir documento.",
      );
    } finally {
      setLoadingDoc(false);
    }
  }

  async function decide(decision, motivo) {
    setBusy(true);
    try {
      await onDecide(item.id, decision, motivo);
      setReasonMode(null);
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  function requestReason(mode) {
    setReasonMode(mode);
    setReason("");
  }

  function confirmReason() {
    if (!reason.trim()) {
      toast.error("Informe o motivo.");
      return;
    }
    decide(reasonMode, reason.trim());
  }

  const supervisorSummary = item.supervisores || [];
  const approvedCount = supervisorSummary.filter(
    (supervisor) => supervisor.status === "APROVADO",
  ).length;

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3>{item.name}</h3>
          <span>
            {item.email} · {TIPO_LABELS[item.tipo] || item.tipo} ·{" "}
            {item.cidade}/{item.estado}
          </span>
        </div>
        <span className={styles.statusBadge} data-status={item.status}>
          {item.status}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <span>
          <strong>{item.instituicao_ensino || "—"}</strong>
          Instituição
        </span>
        <span>
          <strong>
            {item.periodo_atual || item.ano_conclusao || "—"}
          </strong>
          Período/ano
        </span>
        <span>
          <strong>{item.disponibilidade_semanal || "—"}</strong>
          Disponibilidade
        </span>
        <span>
          <strong>{formatDate(item.created_at)}</strong>
          Cadastrado em
        </span>
      </div>

      <button
        type="button"
        className={styles.docLink}
        onClick={openDocument}
        disabled={!hasDoc || loadingDoc}
      >
        <FileText size={14} aria-hidden="true" />
        {loadingDoc
          ? "Gerando link..."
          : hasDoc
            ? "Ver documento enviado"
            : "Nenhum documento enviado"}
      </button>

      <div className={styles.supervisorList}>
        <strong style={{ fontSize: "0.78rem" }}>
          Supervisores ({approvedCount}/{supervisorSummary.length} aprovaram)
        </strong>
        {supervisorSummary.map((supervisor) => (
          <div key={supervisor.email} className={styles.supervisorRow}>
            <span>
              {supervisor.nome} ({supervisor.email})
            </span>
            <span className={styles.supervisorStatus}>{supervisor.status}</span>
          </div>
        ))}
      </div>

      {(item.status === "REPROVADO" && item.motivo_reprovacao) && (
        <p style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
          Motivo da reprovação: {item.motivo_reprovacao}
        </p>
      )}
      {(item.status === "SUSPENSO" && item.motivo_suspensao) && (
        <p style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
          Motivo da suspensão: {item.motivo_suspensao}
        </p>
      )}

      {reasonMode ? (
        <div className={styles.reasonBox}>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              reasonMode === "REPROVADO"
                ? "Motivo da rejeição..."
                : "Motivo da suspensão..."
            }
            disabled={busy}
          />
          <div className={styles.reasonActions}>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={confirmReason}
              disabled={busy}
            >
              {busy ? "Enviando..." : "Confirmar"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setReasonMode(null)}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.approveBtn}
            onClick={() => decide("APROVADO")}
            disabled={busy}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            Aprovar
          </button>
          <button
            type="button"
            className={styles.rejectBtn}
            onClick={() => requestReason("REPROVADO")}
            disabled={busy}
          >
            <XCircle size={15} aria-hidden="true" />
            Rejeitar
          </button>
          <button
            type="button"
            className={styles.suspendBtn}
            onClick={() => requestReason("SUSPENSO")}
            disabled={busy}
          >
            <ShieldOff size={15} aria-hidden="true" />
            Suspender
          </button>
        </div>
      )}
    </article>
  );
}

export default function AdminOraculosPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/oraculos", { cache: "no-store" });
      const payload = await readJson(response);
      setItems(payload.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar cadastros.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDecide = useCallback(
    async (id, decision, motivo) => {
      const toastId = toast.loading("Atualizando cadastro...");
      try {
        const response = await fetch(`/api/admin/oraculos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, motivo }),
        });
        const payload = await readJson(response);
        toast.success(payload.message, { id: toastId });
        await loadItems();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao atualizar cadastro.",
          { id: toastId },
        );
      }
    },
    [loadItems],
  );

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.header}>
          <h1>Cadastros do Oráculo Acadêmico</h1>
          <p>
            Aprove, rejeite ou suspenda cadastros de estudantes/estagiários,
            com acesso aos documentos enviados no cadastro.
          </p>
        </div>

        <div className={styles.filters}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`${styles.filterBtn} ${
                statusFilter === filter.value ? styles.filterBtnActive : ""
              }`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}

          <button
            type="button"
            className={styles.filterBtn}
            onClick={loadItems}
          >
            <RefreshCw size={13} aria-hidden="true" /> Atualizar
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <Loader2 size={28} className="spin" aria-hidden="true" />
            <p>Carregando cadastros...</p>
          </div>
        ) : filteredItems.length ? (
          <div className={styles.grid}>
            {filteredItems.map((item) => (
              <OraculoCard key={item.id} item={item} onDecide={handleDecide} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Nenhum cadastro encontrado para este filtro.
          </div>
        )}
      </div>
    </main>
  );
}
