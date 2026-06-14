"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  getDigitalCard,
  getDigitalCardQrDataUrl,
  registerDigitalCardPdfDownload,
  saveDigitalCard,
} from "@/services/digitalCardService";

import { generateDigitalCardPdf } from "./digitalCardPdf";

const EMPTY_METRICS = Object.freeze({
  views: 0,
  uniqueVisitors: 0,
  clicks: 0,
  shares: 0,
  vcardDownloads: 0,
  pdfDownloads: 0,
  topLinks: [],
});

function cardToForm(card) {
  return {
    displayName: card.displayName || "",
    slug: card.slug || "",
    headline: card.headline || "",
    bio: card.bio || "",
    avatarUrl: card.avatarUrl || "",
    publicEmail: card.publicEmail || "",
    phone: card.phone || "",
    whatsapp: card.whatsapp || "",
    website: card.website || "",
    instagram: card.instagram || "",
    linkedin: card.linkedin || "",
    youtube: card.youtube || "",
    location: card.location || "",
    theme: card.theme || "midnight",
    accentColor: card.accentColor || "#D4AF37",
    backgroundStyle: card.backgroundStyle || "aurora",
    customLinks: Array.isArray(card.customLinks) ? card.customLinks : [],
    showEmail: card.showEmail === true,
    showPhone: card.showPhone !== false,
    showLocation: card.showLocation !== false,
    showRating: card.showRating !== false,
    showBrand: card.showBrand !== false,
    isPublished: card.isPublished === true,
  };
}

export function useDigitalCard() {
  const [card, setCard] = useState(null);
  const [form, setForm] = useState(null);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await getDigitalCard();
      setCard(response.data);
      const nextForm = cardToForm(response.data);
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
      setMetrics(response.metrics || EMPTY_METRICS);
    } catch (requestError) {
      console.error("[Cartão Digital] Falha ao carregar:", requestError);
      if (requestError.status === 401) {
        window.location.href = `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/cartaodigital")}`;
        return;
      }
      setError(requestError.message || "Não foi possível carregar o cartão digital.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback((field, value) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setFieldErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }, []);

  const addCustomLink = useCallback(() => {
    setForm((current) => {
      if (!current || current.customLinks.length >= 8) return current;
      return {
        ...current,
        customLinks: [
          ...current.customLinks,
          {
            key: `link-${Date.now()}`,
            title: "Novo link",
            url: "",
            icon: "link",
            enabled: true,
          },
        ],
      };
    });
  }, []);

  const updateCustomLink = useCallback((index, field, value) => {
    setForm((current) => {
      if (!current) return current;
      const links = current.customLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [field]: value } : link,
      );
      return { ...current, customLinks: links };
    });
    setFieldErrors((current) => ({ ...current, customLinks: undefined, form: undefined }));
  }, []);

  const removeCustomLink = useCallback((index) => {
    setForm((current) =>
      current
        ? { ...current, customLinks: current.customLinks.filter((_, linkIndex) => linkIndex !== index) }
        : current,
    );
  }, []);

  const moveCustomLink = useCallback((index, direction) => {
    setForm((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.customLinks.length) return current;
      const links = [...current.customLinks];
      [links[index], links[target]] = [links[target], links[index]];
      return { ...current, customLinks: links };
    });
  }, []);

  const persist = useCallback(async (overrides = {}, successMessage = "Cartão salvo com sucesso.") => {
    if (!form || !card) return null;
    setSaving(true);
    setFieldErrors({});
    try {
      const response = await saveDigitalCard({
        ...form,
        ...overrides,
        updatedAt: card.updatedAt,
      });
      setCard(response.data);
      const nextForm = cardToForm(response.data);
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
      toast.success(response.message || successMessage);
      return response.data;
    } catch (requestError) {
      console.error("[Cartão Digital] Falha ao salvar:", requestError);
      setFieldErrors(requestError.payload?.errors || { form: requestError.message });
      toast.error(requestError.message || "Não foi possível salvar o cartão.");
      return null;
    } finally {
      setSaving(false);
    }
  }, [card, form]);

  const save = useCallback(() => persist({}, "Cartão salvo com sucesso."), [persist]);
  const togglePublish = useCallback(
    () => persist({ isPublished: !form?.isPublished }, form?.isPublished ? "Cartão retirado do ar." : "Cartão publicado."),
    [form?.isPublished, persist],
  );

  const copyLink = useCallback(async () => {
    const publicUrl = card?.publicUrl;
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link do cartão copiado.");
  }, [card?.publicUrl]);

  const share = useCallback(async () => {
    if (!card?.publicUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: form?.displayName || card.displayName,
          text: `${form?.displayName || card.displayName} — ${form?.headline || card.headline}`,
          url: card.publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(card.publicUrl);
        toast.success("Link copiado para compartilhar.");
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") toast.error("Não foi possível compartilhar o cartão.");
    }
  }, [card, form]);

  const downloadPdf = useCallback(async () => {
    if (!card || !form) return;
    setExporting(true);
    try {
      const previewCard = { ...card, ...form, publicUrl: card.publicUrl };
      let qr = "";
      try {
        qr = await getDigitalCardQrDataUrl(card.publicUrl);
      } catch (qrError) {
        console.warn("[Cartão Digital] PDF sem QR Code:", qrError);
      }
      await generateDigitalCardPdf(previewCard, qr);
      setMetrics((current) => ({ ...current, pdfDownloads: Number(current.pdfDownloads || 0) + 1 }));
      registerDigitalCardPdfDownload().catch(() => null);
      toast.success(qr ? "PDF interativo gerado com QR Code." : "PDF interativo gerado com link clicável.");
    } catch (pdfError) {
      console.error("[Cartão Digital] Falha ao gerar PDF:", pdfError);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  }, [card, form]);

  const previewCard = useMemo(
    () => (card && form ? { ...card, ...form, customLinks: form.customLinks || [] } : card),
    [card, form],
  );
  const dirty = Boolean(form && savedSnapshot && JSON.stringify(form) !== savedSnapshot);

  return {
    card,
    form,
    previewCard,
    metrics,
    loading,
    refreshing,
    saving,
    exporting,
    error,
    fieldErrors,
    dirty,
    load,
    updateField,
    addCustomLink,
    updateCustomLink,
    removeCustomLink,
    moveCustomLink,
    save,
    togglePublish,
    copyLink,
    share,
    downloadPdf,
  };
}
