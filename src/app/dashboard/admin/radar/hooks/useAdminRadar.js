"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  titulo: "",
  categoria: "Trabalhista",
  fonte: "Facebook",
  url_original: "",
  trecho_publico: "",
  cidade: "",
  estado: "",
  score_intencao: 80,
  urgencia: "media",
  resumo_ia: "",
  status: "pendente",
};

const EMPTY_CAPTURE = { url: "", fonte: "Facebook", texto: "" };

export function useAdminRadar() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [reportedOnly, setReportedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });
  const [panel, setPanel] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [jsonText, setJsonText] = useState("");
  const [captureForm, setCaptureForm] = useState({ ...EMPTY_CAPTURE });
  const [capturePreview, setCapturePreview] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingEmails, setPendingEmails] = useState(0);
  const [busy, setBusy] = useState(null);

  const readJson = async (response) => response.json().catch(() => null);

  const ensureAdmin = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        toast.error(data?.message || "Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      setAdmin(data.data);
    } catch (error) {
      console.error("[Admin/Radar] Falha ao validar administrador:", error);
      setLoadError("Não foi possível validar sua sessão administrativa.");
    }
  }, [router]);

  const loadPendingEmails = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/radar/enviar-emails", { cache: "no-store" });
      const data = await readJson(response);
      if (response.ok && data?.success) setPendingEmails(data.count || 0);
    } catch (error) {
      console.warn("[Admin/Radar] Contagem de e-mails indisponível:", error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    if (!admin) return;
    setLoading(true);
    setLoadError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (statusFilter) params.set("status", statusFilter);
      if (sourceTypeFilter) params.set("fonte_tipo", sourceTypeFilter);
      if (reportedOnly) params.set("reportado", "true");

      const response = await fetch(`/api/admin/radar?${params}`, { cache: "no-store" });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar o Radar.");
      }

      setItems(data.data || []);
      setPagination(data.pagination || { total: 0, pages: 1, limit: 10 });
    } catch (error) {
      console.error("[Admin/Radar] Falha ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar oportunidades.");
    } finally {
      setLoading(false);
    }
  }, [admin, page, statusFilter, sourceTypeFilter, reportedOnly]);

  useEffect(() => { ensureAdmin(); }, [ensureAdmin]);
  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { if (admin) loadPendingEmails(); }, [admin, loadPendingEmails]);

  const summary = useMemo(() => ({
    total: pagination.total || 0,
    visible: items.length,
    reported: items.filter((item) => item.reportado).length,
    automatic: items.filter((item) => item.origem_automatica).length,
  }), [items, pagination.total]);

  const openPanel = useCallback((name) => {
    setPanel((current) => (current === name ? null : name));
    setCapturePreview(null);
  }, []);

  const createItem = useCallback(async (event) => {
    event.preventDefault();
    setBusy("create");
    try {
      const response = await fetch("/api/admin/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao cadastrar.");
      toast.success(data.message || "Oportunidade criada.");
      setForm({ ...EMPTY_FORM });
      setPanel(null);
      await Promise.all([loadItems(), loadPendingEmails()]);
    } catch (error) {
      toast.error(error.message || "Erro ao cadastrar oportunidade.");
    } finally {
      setBusy(null);
    }
  }, [form, loadItems, loadPendingEmails]);

  const importItems = useCallback(async () => {
    if (!jsonText.trim()) return toast.error("Cole um JSON válido para importação.");
    let payload;
    try { payload = JSON.parse(jsonText); } catch { return toast.error("JSON inválido."); }
    setBusy("import");
    try {
      const response = await fetch("/api/admin/radar/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro na importação.");
      const stats = data.stats || {};
      toast.success(`${stats.importadas || 0} criadas e ${stats.ignoradas || 0} duplicadas ignoradas.`);
      setJsonText("");
      setPanel(null);
      await loadItems();
    } catch (error) {
      toast.error(error.message || "Erro na importação.");
    } finally { setBusy(null); }
  }, [jsonText, loadItems]);

  const analyzeCapture = useCallback(async () => {
    if (!captureForm.url.trim() || !captureForm.texto.trim()) return toast.error("Informe a URL e o texto público.");
    const sanitized = captureForm.texto
      .replace(/(\+55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g, "[telefone omitido]")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email omitido]")
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF omitido]")
      .slice(0, 2000);
    setBusy("capture-analyze");
    try {
      const response = await fetch("/api/admin/radar/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...captureForm, texto: sanitized }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao analisar.");
      setCapturePreview(data.preview);
    } catch (error) { toast.error(error.message || "Erro ao analisar publicação."); }
    finally { setBusy(null); }
  }, [captureForm]);

  const saveCapture = useCallback(async () => {
    if (!capturePreview) return;
    setBusy("capture-save");
    try {
      const response = await fetch("/api/admin/radar/capturar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(capturePreview),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao salvar.");
      toast.success("Oportunidade salva como pendente.");
      setCaptureForm({ ...EMPTY_CAPTURE });
      setCapturePreview(null);
      setPanel(null);
      await loadItems();
    } catch (error) { toast.error(error.message || "Erro ao salvar oportunidade."); }
    finally { setBusy(null); }
  }, [capturePreview, loadItems]);

  const executeSearch = useCallback(async () => {
    setBusy("search");
    setSearchResult(null);
    try {
      const response = await fetch("/api/admin/radar/executar-busca", { method: "POST" });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro na busca automática.");
      setSearchResult(data.stats);
      toast.success("Busca automática concluída.");
      await loadItems();
    } catch (error) { toast.error(error.message || "Erro na busca automática."); }
    finally { setBusy(null); }
  }, [loadItems]);

  const sendEmails = useCallback(async () => {
    if (!pendingEmails || !window.confirm(`Enviar ${pendingEmails} oportunidade(s) aos advogados?`)) return;
    setBusy("emails");
    try {
      const response = await fetch("/api/admin/radar/enviar-emails", { method: "POST" });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro no envio.");
      toast.success(`Envio concluído para ${data.totalAdvogados || 0} advogados.`);
      setPendingEmails(0);
    } catch (error) { toast.error(error.message || "Erro ao enviar e-mails."); }
    finally { setBusy(null); }
  }, [pendingEmails]);

  const approve = useCallback(async (id) => {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/radar/${id}/aprovar`, { method: "POST" });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao aprovar.");
      toast.success("Oportunidade aprovada.");
      await Promise.all([loadItems(), loadPendingEmails()]);
    } catch (error) { toast.error(error.message || "Erro ao aprovar."); }
    finally { setBusy(null); }
  }, [loadItems, loadPendingEmails]);

  const archive = useCallback(async (id) => {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/radar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "arquivado" }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao arquivar.");
      toast.success("Oportunidade arquivada.");
      await loadItems();
    } catch (error) { toast.error(error.message || "Erro ao arquivar."); }
    finally { setBusy(null); }
  }, [loadItems]);

  const reject = useCallback(async () => {
    if (!rejectingId || !rejectReason.trim()) return toast.error("Informe o motivo da rejeição.");
    setBusy(rejectingId);
    try {
      const response = await fetch(`/api/admin/radar/${rejectingId}/rejeitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: rejectReason.trim() }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao rejeitar.");
      toast.success("Oportunidade rejeitada.");
      setRejectingId(null);
      setRejectReason("");
      await loadItems();
    } catch (error) { toast.error(error.message || "Erro ao rejeitar."); }
    finally { setBusy(null); }
  }, [rejectingId, rejectReason, loadItems]);

  const saveEdit = useCallback(async (event) => {
    event.preventDefault();
    if (!editingItem) return;
    setBusy(editingItem.id);
    try {
      const response = await fetch(`/api/admin/radar/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Erro ao atualizar.");
      toast.success("Oportunidade atualizada.");
      setEditingItem(null);
      await loadItems();
    } catch (error) { toast.error(error.message || "Erro ao atualizar."); }
    finally { setBusy(null); }
  }, [editingItem, loadItems]);

  return {
    admin, items, loading, loadError, statusFilter, sourceTypeFilter, reportedOnly,
    page, pagination, panel, form, jsonText, captureForm, capturePreview, searchResult,
    editingItem, rejectingId, rejectReason, pendingEmails, busy, summary,
    setStatusFilter, setSourceTypeFilter, setReportedOnly, setPage, setPanel, setForm,
    setJsonText, setCaptureForm, setCapturePreview, setSearchResult, setEditingItem,
    setRejectingId, setRejectReason, openPanel, loadItems, createItem, importItems,
    analyzeCapture, saveCapture, executeSearch, sendEmails, approve, archive, reject, saveEdit,
  };
}
