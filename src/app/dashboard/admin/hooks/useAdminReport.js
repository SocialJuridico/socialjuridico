"use client";

import {
  useCallback,
  useState,
} from "react";
import toast from "react-hot-toast";

import {
  generateAdminUsageReport,
} from "../services/adminReportService";

const initialOptions = {
  period: 7,
  includeLawyers: true,
  includeClients: true,
  includeDbTotals: true,
  includeSatisfaction: true,
};

export function useAdminReport(admin) {
  const [modalOpen, setModalOpen] =
    useState(false);

  const [generating, setGenerating] =
    useState(false);

  const [options, setOptions] =
    useState(initialOptions);

  const updateOption = useCallback(
    (name, value) => {
      setOptions((current) => ({
        ...current,
        [name]: value,
      }));
    },
    [],
  );

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (generating) {
      return;
    }

    setModalOpen(false);
  }, [generating]);

  const generateReport = useCallback(
    async () => {
      if (generating) {
        return;
      }

      if (
        !options.includeLawyers &&
        !options.includeClients
      ) {
        toast.error(
          "Selecione pelo menos Advogados ou Clientes.",
        );

        return;
      }

      setModalOpen(false);
      setGenerating(true);

      const toastId = toast.loading(
        "Buscando dados do relatório...",
      );

      try {
        await generateAdminUsageReport({
          admin,
          options,
          onRenderStart() {
            toast.loading(
              "Renderizando documento PDF...",
              {
                id: toastId,
              },
            );
          },
        });

        toast.success(
          "Relatório gerado com sucesso!",
          {
            id: toastId,
          },
        );
      } catch (error) {
        console.error(
          "[Admin Report] Erro:",
          error,
        );

        toast.error(
          error.message ||
            "Não foi possível gerar o relatório.",
          {
            id: toastId,
          },
        );
      } finally {
        setGenerating(false);
      }
    },
    [admin, generating, options],
  );

  return {
    modalOpen,
    generating,
    options,
    openModal,
    closeModal,
    updateOption,
    generateReport,
  };
}