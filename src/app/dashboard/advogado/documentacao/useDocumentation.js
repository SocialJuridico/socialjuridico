"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getLawyerDocumentation,
  listLawyerDocumentation,
} from "@/services/documentationService";

export function useDocumentation() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listLawyerDocumentation(query);
      const nextItems = result.data || [];
      setItems(nextItems);
      setSelectedSlug((current) => {
        if (current && nextItems.some((item) => item.slug === current)) return current;
        return nextItems[0]?.slug || "";
      });
    } catch (requestError) {
      if (requestError.status === 401) {
        window.location.href = `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/documentacao")}`;
        return;
      }
      setError(requestError.message || "Não foi possível carregar a documentação.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadItems(), query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadItems, query]);

  useEffect(() => {
    if (!selectedSlug) {
      setSelected(null);
      return;
    }

    let cancelled = false;
    setLoadingDocument(true);
    setError("");
    getLawyerDocumentation(selectedSlug)
      .then((result) => {
        if (!cancelled) setSelected(result.data || null);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setSelected(null);
          setError(requestError.message || "Não foi possível abrir a documentação.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDocument(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  return {
    items,
    query,
    selectedSlug,
    selected,
    loading,
    loadingDocument,
    error,
    setQuery,
    setSelectedSlug,
    loadItems,
  };
}
