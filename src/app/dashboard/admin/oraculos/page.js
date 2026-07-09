"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  Loader2,
  RefreshCw,
  ShieldOff,
} from "lucide-react";

import styles from "./OraculosAdmin.module.css";

const STATUS_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "PENDENTE_DOCUMENTOS", label: "Pendente documentos" },
  { value: "PENDENTE_SUPERVISOR", label: "Pendente supervisor" },
  { value: "PENDENTE_ADMIN", label: "Pendente instituicao" },
  { value: "ATIVO", label: "Ativo" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "REPROVADO", label: "Reprovado" },
];

const TIPO_LABELS = {
  ESTUDANTE: "Estudante de Direito",
  ESTAGIARIO: "Estagiario inscrito na OAB",
};

const DOC_FIELD_BY_TIPO = {
  ESTUDANTE: "comprovante_matricula_url",
  ESTAGIARIO: "comprovante_estagiario_url",
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Nao foi possivel concluir a operacao.");
  }
  return payload;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function OraculoCard({ item, onSuspend }) {
  const [reasonMode, setReasonMode] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const docField = DOC_FIELD_BY_TIPO[item.tipo];
  const hasDoc = Boolean(item[docField]);
  const supervisorSummary = item.supervisores || [];
  const approvedCount = supervisorSummary.filter(
    (supervisor) => supervisor.status === "APROVADO",
  ).length;

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

  async function confirmSuspension() {
    if (!reason.trim()) {
      toast.error("Informe o motivo da suspensao.");
      return;
    }

    setBusy(true);
    try {
      await onSuspend(item.id, reason.trim());
      setReasonMode(false);
      setReason("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h3>{item.name}</h3>
          <span>
            {item.email} - {TIPO_LABELS[item.tipo] || item.tipo} -{" "}
            {item.cidade}/{item.estado}
          </span>
        </div>
        <span className={styles.statusBadge} data-status={item.status}>
          {item.status}
        </span>
      </div>

      <div className={styles.metaGrid}>
        <span>
          <strong>{item.instituicao_ensino || "-"}</strong>
          Instituicao
        </span>
        <span>
          <strong>{item.instituicao?.status || "Nao cadastrada"}</strong>
          Status institucional
        </span>
        <span>
          <strong>{item.periodo_atual || "-"}</strong>
          Periodo atual
        </span>
        <span>
          <strong>{formatDate(item.created_at)}</strong>
          Cadastrado em
        </span>
      </div>

      {item.alerta_instituicao && (
        <p style={{ fontSize: "0.78rem", color: "#facc15" }}>
          Alerta institucional: {item.alerta_instituicao}
          {item.instituicao?.nome ? ` - ${item.instituicao.nome}` : ""}
        </p>
      )}

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

      {item.status === "REPROVADO" && item.motivo_reprovacao && (
        <p style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
          Motivo da reprovacao: {item.motivo_reprovacao}
        </p>
      )}
      {item.status === "SUSPENSO" && item.motivo_suspensao && (
        <p style={{ fontSize: "0.78rem", color: "#fca5a5" }}>
          Motivo da suspensao: {item.motivo_suspensao}
        </p>
      )}

      {reasonMode ? (
        <div className={styles.reasonBox}>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo da suspensao por denuncia ou mau uso..."
            disabled={busy}
          />
          <div className={styles.reasonActions}>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={confirmSuspension}
              disabled={busy}
            >
              {busy ? "Enviando..." : "Confirmar suspensao"}
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setReasonMode(false)}
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
            className={styles.suspendBtn}
            onClick={() => setReasonMode(true)}
            disabled={busy || item.status === "SUSPENSO"}
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

  const handleSuspend = useCallback(
    async (id, motivo) => {
      const toastId = toast.loading("Suspendendo cadastro...");
      try {
        const response = await fetch(`/api/admin/oraculos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "SUSPENSO", motivo }),
        });
        const payload = await readJson(response);
        toast.success(payload.message, { id: toastId });
        await loadItems();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erro ao suspender cadastro.",
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
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.header}>
          <h1>Cadastros do Oraculo Academico</h1>
          <p>
            Monitore cadastros, documentos e supervisores. O admin do Social
            Juridico apenas acompanha e suspende em caso de denuncia ou mau uso;
            aprovacao e reprovacao pertencem a instituicao de ensino.
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
              <OraculoCard
                key={item.id}
                item={item}
                onSuspend={handleSuspend}
              />
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
