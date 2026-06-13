"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";

import styles from "../ClientDashboard.module.css";

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatMemberSince(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function ClientProfile({ controller }) {
  const [form, setForm] = useState({ name: "", phone: "", password: "" });

  useEffect(() => {
    setForm({
      name: controller.profile?.name || "",
      phone: controller.profile?.phone || "",
      password: "",
    });
  }, [controller.profile]);

  const submit = async (event) => {
    event.preventDefault();
    const success = await controller.updateProfile(form);
    if (success) setForm((current) => ({ ...current, password: "" }));
  };

  return (
    <div className={styles.pageStack}>
      <section className={styles.profileHero}>
        <span className={styles.profileHeroAvatar}>
          {String(controller.profile?.name || "Cliente")
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((item) => item[0])
            .join("")
            .toUpperCase()}
        </span>
        <div>
          <span className={styles.eyebrow}>Conta do cliente</span>
          <h2>{controller.profile?.name || "Cliente"}</h2>
          <p>{controller.profile?.email}</p>
        </div>
        <span className={styles.verifiedAccountBadge}>
          <ShieldCheck size={15} aria-hidden="true" />
          Sessão autenticada
        </span>
      </section>

      <section className={styles.profileGridLayout}>
        <form className={styles.profileFormCard} onSubmit={submit}>
          <div className={styles.sectionTitleRow}>
            <div>
              <span className={styles.eyebrow}>Dados pessoais</span>
              <h2>Informações da conta</h2>
              <p>Atualize apenas os dados necessários para o atendimento.</p>
            </div>
            <User size={19} aria-hidden="true" />
          </div>

          <label className={styles.field}>
            <span>Nome completo</span>
            <div className={styles.inputWithIcon}>
              <User size={16} aria-hidden="true" />
              <input
                type="text"
                minLength={3}
                maxLength={160}
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>Telefone ou WhatsApp</span>
            <div className={styles.inputWithIcon}>
              <Phone size={16} aria-hidden="true" />
              <input
                type="tel"
                inputMode="tel"
                placeholder="(51) 99999-9999"
                value={formatPhone(form.phone)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>E-mail cadastrado</span>
            <div className={`${styles.inputWithIcon} ${styles.readOnlyField}`}>
              <Mail size={16} aria-hidden="true" />
              <input type="email" value={controller.profile?.email || ""} readOnly />
            </div>
            <small>O e-mail não pode ser alterado por esta tela.</small>
          </label>

          <label className={styles.field}>
            <span>Nova senha — opcional</span>
            <div className={styles.inputWithIcon}>
              <KeyRound size={16} aria-hidden="true" />
              <input
                type="password"
                minLength={6}
                autoComplete="new-password"
                placeholder="Deixe em branco para manter a atual"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </div>
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={controller.busy}
          >
            {controller.busy ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>

        <div className={styles.profileSideStack}>
          <article className={styles.accountInfoCard}>
            <div className={styles.sectionTitleRow}>
              <div>
                <span className={styles.eyebrow}>Resumo da conta</span>
                <h2>Cadastro</h2>
              </div>
              <Lock size={18} aria-hidden="true" />
            </div>
            <dl className={styles.accountInfoList}>
              <div>
                <dt>Tipo de conta</dt>
                <dd>Cliente</dd>
              </div>
              <div>
                <dt>Membro desde</dt>
                <dd>
                  <CalendarDays size={13} aria-hidden="true" />
                  {formatMemberSince(controller.profile?.created_at)}
                </dd>
              </div>
              <div>
                <dt>Casos publicados</dt>
                <dd>{controller.summary.totalCases}</dd>
              </div>
            </dl>
          </article>

          <article className={styles.accountActionCard}>
            <div>
              <span className={styles.eyebrow}>Orientação</span>
              <h2>Apresentação da plataforma</h2>
              <p>Revise as principais áreas e ações disponíveis no painel.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={controller.restartTour}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reiniciar apresentação
            </button>
          </article>

          <article className={styles.dangerZoneCard}>
            <div>
              <span className={styles.eyebrow}>Privacidade e LGPD</span>
              <h2>Solicitar exclusão da conta</h2>
              <p>
                O pedido será analisado em até 48 horas. A conta não é apagada
                imediatamente, permitindo verificação de identidade, casos ativos e
                obrigações legais de retenção.
              </p>
            </div>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={() =>
                controller.setModal({
                  type: "account-deletion",
                  confirmedName: "",
                  reason: "",
                })
              }
            >
              <Trash2 size={15} aria-hidden="true" />
              Abrir solicitação de exclusão
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
