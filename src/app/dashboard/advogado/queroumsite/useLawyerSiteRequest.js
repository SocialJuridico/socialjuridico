"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  normalizeSiteRequestPayload,
  validateSiteRequestPayload,
} from "@/lib/siteRequests/siteRequestValidation";
import { useLawyerSession } from "../LawyerSessionContext";

const INITIAL_FORM = {
  projectType: "SITE_INSTITUCIONAL",
  officeName: "",
  objective: "",
  desiredFeatures: ["WHATSAPP", "CONTACT_FORM", "SEO"],
  domainStatus: "UNSURE",
  currentDomain: "",
  deadline: "UP_TO_30_DAYS",
  budgetRange: "FROM_500_TO_1500",
  preferredContact: "WHATSAPP",
  contactPhone: "",
  contactEmail: "",
  notes: "",
  consent: false,
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

export function useLawyerSiteRequest() {
  const router = useRouter();
  const session = useLawyerSession();
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactingId, setContactingId] = useState(null);
  const [error, setError] = useState("");
  const [successRequest, setSuccessRequest] = useState(null);
  const abortRef = useRef(null);
  const formRef = useRef(null);
  const submissionRequestIdRef = useRef(null);

  const loadRequests = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/advogado/quero-um-site", {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await readJson(response);

      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/queroumsite")}`,
        );
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível carregar suas solicitações.",
        );
      }

      setRequests(data.data || []);
      setForm((current) => ({
        ...current,
        officeName:
          current.officeName ||
          session.profileData?.nome_escritorio ||
          session.profileData?.name ||
          data.profile?.name ||
          "",
        contactEmail: current.contactEmail || data.profile?.email || "",
      }));
    } catch (loadError) {
      if (loadError.name === "AbortError") return;
      console.error("[QueroSite] Falha ao carregar:", loadError);
      setError(
        loadError.message || "Não foi possível carregar suas solicitações.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [router, session.profileData]);

  useEffect(() => {
    void loadRequests();
    return () => abortRef.current?.abort();
  }, [loadRequests]);

  function resetSubmissionIdentity() {
    if (!submitting) submissionRequestIdRef.current = null;
  }

  function updateField(name, value) {
    resetSubmissionIdentity();
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  function toggleFeature(feature) {
    resetSubmissionIdentity();
    setForm((current) => {
      const selected = current.desiredFeatures.includes(feature);
      return {
        ...current,
        desiredFeatures: selected
          ? current.desiredFeatures.filter((item) => item !== feature)
          : [...current.desiredFeatures, feature].slice(0, 10),
      };
    });
  }

  function selectProject(projectType) {
    resetSubmissionIdentity();
    setForm((current) => ({ ...current, projectType }));
    setSuccessRequest(null);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function submit(event) {
    event?.preventDefault();
    if (submitting) return;

    const requestId = submissionRequestIdRef.current || createRequestId();
    submissionRequestIdRef.current = requestId;
    const payload = normalizeSiteRequestPayload({ ...form, requestId });
    const validation = validateSiteRequestPayload(payload);
    if (!validation.valid) {
      submissionRequestIdRef.current = null;
      setFieldErrors(validation.errors);
      toast.error("Revise os campos destacados antes de enviar.");
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setSuccessRequest(null);

    try {
      const response = await fetch("/api/advogado/quero-um-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        if (data?.errors) {
          setFieldErrors(data.errors);
          submissionRequestIdRef.current = null;
        }
        throw new Error(
          data?.message || "Não foi possível enviar sua solicitação.",
        );
      }

      submissionRequestIdRef.current = null;
      setSuccessRequest({
        ...data.data,
        contactAvailable: Boolean(data.contactAvailable),
      });
      setRequests((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.id !== data.data?.id,
        );
        return [data.data, ...withoutDuplicate].slice(0, 5);
      });
      setForm((current) => ({
        ...INITIAL_FORM,
        officeName: current.officeName,
        contactEmail: current.contactEmail,
        contactPhone: current.contactPhone,
      }));
      toast.success(data.message || "Solicitação enviada com sucesso.");
    } catch (submitError) {
      toast.error(
        submitError.message || "Não foi possível enviar sua solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function openContact(siteRequest) {
    if (!siteRequest?.id || contactingId) return;

    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      try {
        popup.document.title = "Abrindo contato comercial...";
        popup.document.body.textContent = "Abrindo conversa no WhatsApp...";
      } catch {
        // O redirecionamento seguro continuará normalmente.
      }
    }

    setContactingId(siteRequest.id);
    try {
      const response = await fetch(
        `/api/advogado/quero-um-site/${siteRequest.id}/contato`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: createRequestId() }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data?.success || !data?.data?.url) {
        throw new Error(
          data?.message || "Não foi possível abrir o contato comercial.",
        );
      }

      if (popup && !popup.closed) {
        popup.location.replace(data.data.url);
      } else {
        window.location.assign(data.data.url);
      }
    } catch (contactError) {
      if (popup && !popup.closed) popup.close();
      toast.error(
        contactError.message || "Não foi possível abrir o contato comercial.",
      );
    } finally {
      setContactingId(null);
    }
  }

  const selectedProject = useMemo(
    () => form.projectType,
    [form.projectType],
  );

  return {
    ...session,
    form,
    formRef,
    fieldErrors,
    updateField,
    toggleFeature,
    selectProject,
    selectedProject,
    submit,
    submitting,
    requests,
    loading,
    error,
    reload: loadRequests,
    successRequest,
    setSuccessRequest,
    contactingId,
    openContact,
  };
}
