"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { formatPhone } from "@/lib/securityUtils";

import { useLawyerSession } from "../LawyerSessionContext";

export const SPECIALTIES = Object.freeze([
  "Trabalhista",
  "Civil",
  "Penal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Digital",
  "Consumidor",
  "Imobiliario",
  "Empresarial",
  "Bancario",
  "Saude",
  "Transito",
  "Administrativo",
  "Militar",
  "Internacional",
  "Ambiental",
  "Constitucional",
  "Eleitoral",
  "Desportivo",
]);

const EMPTY_FORM = {
  name: "",
  phone: "",
  bio: "",
  oab: "",
  estado: "",
  specialties: "",
  consulta: "Gratuita",
  tempo: "",
  valor: "",
  password: "",
};

function cleanDigits(value, maxLength = 13) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function normalizeForm(profile) {
  return {
    name: profile?.name || "",
    phone: cleanDigits(profile?.phone),
    bio: profile?.bio || "",
    oab: profile?.oab || "",
    estado: profile?.estado || "",
    specialties: profile?.specialties || "",
    consulta: profile?.consulta === "Paga" ? "Paga" : "Gratuita",
    tempo: profile?.tempo || "",
    valor:
      profile?.valor === null || profile?.valor === undefined
        ? ""
        : String(profile.valor),
    password: "",
  };
}

function splitSpecialties(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayload(form) {
  const payload = {
    phone: cleanDigits(form.phone),
    bio: String(form.bio || "").trim(),
    specialties: splitSpecialties(form.specialties).join(", "),
    consulta: form.consulta === "Paga" ? "Paga" : "Gratuita",
    tempo: form.consulta === "Paga" ? String(form.tempo || "").trim() : "",
    valor:
      form.consulta === "Paga" && form.valor !== ""
        ? Number(form.valor)
        : 0,
  };

  if (form.password) {
    payload.password = form.password;
  }

  return payload;
}

export function useLawyerProfile() {
  const {
    profileData,
    loadingProfile,
    sessionError,
    refreshProfile,
    setProfileData,
  } = useLawyerSession();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profileData) {
      setForm(normalizeForm(profileData));
    }
  }, [profileData]);

  const selectedSpecialties = useMemo(
    () => splitSpecialties(form.specialties),
    [form.specialties],
  );

  const completion = useMemo(() => {
    const checks = [
      Boolean(profileData?.avatar),
      Boolean(form.phone),
      Boolean(form.bio && form.bio.trim().length >= 80),
      selectedSpecialties.length > 0,
      Boolean(form.consulta === "Gratuita" || (form.tempo && form.valor)),
    ];
    const done = checks.filter(Boolean).length;
    return {
      done,
      total: checks.length,
      percentage: Math.round((done / checks.length) * 100),
      missing: [
        !profileData?.avatar ? "foto profissional" : null,
        !form.phone ? "WhatsApp de contato" : null,
        !(form.bio && form.bio.trim().length >= 80)
          ? "bio com pelo menos 80 caracteres"
          : null,
        !selectedSpecialties.length ? "especialidades" : null,
        form.consulta === "Paga" && (!form.tempo || !form.valor)
          ? "tempo e valor da consulta"
          : null,
      ].filter(Boolean),
    };
  }, [form.bio, form.consulta, form.phone, form.tempo, form.valor, profileData?.avatar, selectedSpecialties.length]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: field === "phone" ? cleanDigits(value) : value,
    }));
  }

  function toggleSpecialty(specialty) {
    setForm((current) => {
      const currentItems = splitSpecialties(current.specialties);
      const next = currentItems.includes(specialty)
        ? currentItems.filter((item) => item !== specialty)
        : [...currentItems, specialty];
      return { ...current, specialties: next.join(", ") };
    });
  }

  async function saveProfile(event) {
    event?.preventDefault();

    if (form.password && form.password.length < 6) {
      toast.error("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (form.password && form.password.length > 72) {
      toast.error("A nova senha ultrapassa o limite permitido.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Salvando perfil...");

    try {
      const response = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Nao foi possivel salvar o perfil.");
      }

      await refreshProfile();
      setForm((current) => ({ ...current, password: "" }));
      toast.success("Perfil atualizado com sucesso.", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Nao foi possivel salvar o perfil.", {
        id: toastId,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error("Envie uma imagem JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem deve ter no maximo 4MB.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Atualizando foto...");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/perfil/avatar", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Nao foi possivel atualizar a foto.");
      }

      setProfileData((current) => ({ ...current, avatar: data.url }));
      await refreshProfile();
      toast.success("Foto atualizada com sucesso.", { id: toastId });
    } catch (error) {
      toast.error(error.message || "Nao foi possivel atualizar a foto.", {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return {
    profileData,
    loadingProfile,
    sessionError,
    form,
    selectedSpecialties,
    completion,
    fileInputRef,
    isSaving,
    isUploading,
    updateField,
    toggleSpecialty,
    saveProfile,
    uploadAvatar,
    formatPhone,
  };
}
