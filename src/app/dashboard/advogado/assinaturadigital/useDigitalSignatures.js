"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { MAX_SIGNATURE_FILE_BYTES } from "@/lib/digitalSignatures/signatureValidation";
import { useLawyerSession } from "../LawyerSessionContext";

const INITIAL_FORM = {
  documentName: "",
  documentType: "contrato",
  clientId: "",
  clientName: "",
  clientEmail: "",
};

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useDigitalSignatures() {
  const router = useRouter();
  const session = useLawyerSession();
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    signed: 0,
    partiallySigned: 0,
    pending: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const abortRef = useRef(null);
  const requestIdRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const load = useCallback(
    async (targetPage = 1) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pagination.pageSize),
        status: filters.status,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      try {
        const response = await fetch(`/api/advogado/assinaturas?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readJson(response);

        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/assinaturadigital")}`,
          );
          return;
        }
        if (response.status === 403 && data?.upgradeRequired) {
          session.openPlansModal();
          throw new Error(data.message);
        }
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível carregar as assinaturas.",
          );
        }

        setItems(data.data || []);
        setClients(data.clients || []);
        setMetrics(
          data.metrics || {
            total: 0,
            signed: 0,
            partiallySigned: 0,
            pending: 0,
          },
        );
        setPagination(
          data.pagination || {
            page: targetPage,
            pageSize: pagination.pageSize,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[Assinaturas] Falha ao carregar:", loadError);
        setError(loadError.message || "Não foi possível carregar as assinaturas.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [
      debouncedSearch,
      filters.status,
      pagination.pageSize,
      router,
      session.openPlansModal,
    ],
  );

  useEffect(() => {
    void load(1);
    return () => abortRef.current?.abort();
  }, [load]);

  function resetForm() {
    setForm(INITIAL_FORM);
    setFile(null);
    setFieldErrors({});
    requestIdRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
  }

  function updateField(name, value) {
    requestIdRef.current = null;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function selectClient(clientId) {
    const client = clients.find((item) => item.id === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      clientName: client?.name || "",
      clientEmail: client?.email || "",
    }));
    setFieldErrors({});
    requestIdRef.current = null;
  }

  function selectFile(selectedFile) {
    requestIdRef.current = null;
    if (!selectedFile) {
      setFile(null);
      return;
    }
    if (
      selectedFile.type !== "application/pdf" ||
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFieldErrors((current) => ({
        ...current,
        file: "Selecione um arquivo PDF válido.",
      }));
      setFile(null);
      return;
    }
    if (selectedFile.size > MAX_SIGNATURE_FILE_BYTES) {
      setFieldErrors((current) => ({
        ...current,
        file: "O PDF deve possuir no máximo 15 MB.",
      }));
      setFile(null);
      return;
    }
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.file;
      return next;
    });
    setFile(selectedFile);
  }

  function validateForm() {
    const errors = {};
    if (form.documentName.trim().length < 3) {
      errors.documentName = "Informe o nome do documento.";
    }
    if (form.clientName.trim().length < 2) {
      errors.clientName = "Informe o nome do signatário.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.clientEmail.trim())) {
      errors.clientEmail = "Informe um e-mail válido.";
    }
    if (!file) errors.file = "Selecione o PDF que será assinado.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event?.preventDefault();
    if (submitting || !validateForm()) return;

    const requestId = requestIdRef.current || createRequestId();
    requestIdRef.current = requestId;
    setSubmitting(true);

    try {
      const uploadResponse = await fetch("/api/advogado/assinaturas/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Request-Id": requestId,
        },
        body: file,
      });
      const uploadData = await readJson(uploadResponse);
      if (!uploadResponse.ok || !uploadData?.success) {
        throw new Error(uploadData?.message || "Não foi possível enviar o PDF.");
      }

      const response = await fetch("/api/advogado/assinaturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          documentName: form.documentName,
          documentType: form.documentType,
          clientId: form.clientId || null,
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          uploadPath: uploadData.data.uploadPath,
        }),
      });
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        if (data?.errors) setFieldErrors(data.errors);
        throw new Error(
          data?.message || "Não foi possível iniciar a assinatura.",
        );
      }

      toast.success(data.message || "Processo de assinatura iniciado.");
      setModalOpen(false);
      resetForm();
      await load(1);
    } catch (submitError) {
      console.error("[Assinaturas] Falha ao criar:", submitError);
      toast.error(
        submitError.message || "Não foi possível iniciar a assinatura.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(value, message) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
      toast.success(message);
    }
  }

  function signingLink(item, role) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/assinatura/${item.id}?role=${role}`;
  }

  async function resendInvitation(item, role = "client") {
    if (resendingId) return;
    setResendingId(item.id);
    try {
      const response = await fetch(
        `/api/advogado/assinaturas/${item.id}/reenviar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível reenviar o convite.");
      }
      toast.success(data.message || "Convite reenviado.");
    } catch (resendError) {
      toast.error(resendError.message || "Não foi possível reenviar o convite.");
    } finally {
      setResendingId(null);
    }
  }

  async function generateCertificate(item) {
    try {
      const { default: jsPDF } = await import("jspdf");
      const document = new jsPDF();
      const metadata = item.metadata || {};
      const lawyer = metadata.lawyer || {};
      const client = metadata.client || {};
      const lines = [
        "CERTIFICADO DE ASSINATURA ELETRÔNICA",
        "",
        `Documento: ${item.document_name}`,
        `Código de validação: ${item.verification_code}`,
        `Status: ${item.status}`,
        `Criado em: ${new Date(item.created_at).toLocaleString("pt-BR")}`,
        "",
        `Advogado: ${lawyer.name || "N/I"}`,
        `Assinatura do advogado: ${lawyer.signed ? new Date(lawyer.signed_at).toLocaleString("pt-BR") : "Pendente"}`,
        `Cliente: ${client.name || "N/I"}`,
        `Assinatura do cliente: ${client.signed ? new Date(client.signed_at).toLocaleString("pt-BR") : "Pendente"}`,
        "",
        "Hash SHA-256 do documento original:",
        item.original_hash || "N/I",
        "",
        "Hash SHA-256 da versão assinada mais recente:",
        item.signed_hash || "Disponível após a primeira assinatura",
        "",
        "Validação pública: https://www.socialjuridico.com.br/validar",
      ];

      document.setFont("helvetica", "bold");
      document.setFontSize(16);
      document.text(lines[0], 20, 22);
      document.setFont("helvetica", "normal");
      document.setFontSize(9);
      let y = 34;
      lines.slice(1).forEach((line) => {
        const wrapped = document.splitTextToSize(String(line), 170);
        if (y + wrapped.length * 5 > 280) {
          document.addPage();
          y = 20;
        }
        document.text(wrapped, 20, y);
        y += Math.max(5, wrapped.length * 5);
      });
      document.save(`certificado-${item.verification_code}.pdf`);
      toast.success("Certificado gerado com hashes reais.");
    } catch (certificateError) {
      console.error("[Assinaturas] Certificado:", certificateError);
      toast.error("Não foi possível gerar o certificado.");
    }
  }

  const currentRange = useMemo(() => {
    if (!pagination.total) return "0 processos";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(
      pagination.total,
      pagination.page * pagination.pageSize,
    );
    return `${start}–${end} de ${pagination.total}`;
  }, [pagination]);

  return {
    ...session,
    items,
    clients,
    metrics,
    pagination,
    filters,
    setFilters,
    loading,
    error,
    reload: () => load(pagination.page),
    goToPage: load,
    currentRange,
    modalOpen,
    openModal,
    closeModal,
    form,
    updateField,
    selectClient,
    fieldErrors,
    file,
    selectFile,
    fileInputRef,
    submit,
    submitting,
    copyText,
    signingLink,
    resendInvitation,
    resendingId,
    generateCertificate,
  };
}
