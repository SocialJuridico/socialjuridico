"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Send,
} from "lucide-react";

import styles from "./Contato.module.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
  website: "",
};

export default function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({
    type: "idle",
    message: "",
  });

  const isSubmitting = status.type === "loading";

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setStatus({
      type: "loading",
      message: "Enviando sua mensagem...",
    });

    try {
      const response = await fetch("/api/contato", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Não foi possível enviar sua mensagem.",
        );
      }

      setForm(initialForm);

      setStatus({
        type: "success",
        message:
          "Mensagem enviada com sucesso. Nossa equipe responderá pelo e-mail informado.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar sua mensagem.",
      });
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="contact-name" className={styles.label}>
            Nome completo
          </label>

          <input
            id="contact-name"
            name="name"
            type="text"
            className={styles.input}
            placeholder="Como podemos chamar você?"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
            value={form.name}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contact-email" className={styles.label}>
            E-mail
          </label>

          <input
            id="contact-email"
            name="email"
            type="email"
            className={styles.input}
            placeholder="seu@email.com"
            autoComplete="email"
            maxLength={160}
            required
            value={form.email}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="contact-phone" className={styles.label}>
            Telefone ou WhatsApp
            <span className={styles.optionalLabel}>opcional</span>
          </label>

          <input
            id="contact-phone"
            name="phone"
            type="tel"
            className={styles.input}
            placeholder="(15) 99999-9999"
            autoComplete="tel"
            maxLength={30}
            value={form.phone}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contact-subject" className={styles.label}>
            Assunto
          </label>

          <select
            id="contact-subject"
            name="subject"
            className={styles.select}
            required
            value={form.subject}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="" disabled>
              Selecione um assunto
            </option>

            <option value="suporte">
              Suporte técnico
            </option>

            <option value="cadastro">
              Cadastro ou acesso à conta
            </option>

            <option value="financeiro">
              Financeiro, planos ou pagamentos
            </option>

            <option value="advogado">
              Cadastro ou validação de advogado
            </option>

            <option value="privacidade">
              Privacidade e proteção de dados
            </option>

            <option value="exclusao">
              Exclusão de conta ou dados
            </option>

            <option value="parceria">
              Parcerias e imprensa
            </option>

            <option value="seguranca">
              Segurança ou denúncia
            </option>

            <option value="outro">
              Outro assunto
            </option>
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="contact-message" className={styles.label}>
          Mensagem
        </label>

        <textarea
          id="contact-message"
          name="message"
          className={styles.textarea}
          placeholder="Descreva sua solicitação com detalhes. Não envie senhas, dados bancários ou informações sensíveis desnecessárias."
          minLength={10}
          maxLength={4000}
          required
          value={form.message}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>

      <div
        className={styles.honeypot}
        aria-hidden="true"
      >
        <label htmlFor="contact-website">
          Website
        </label>

        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={handleChange}
        />
      </div>

      <p className={styles.privacyNotice}>
        Ao enviar, você concorda com o tratamento das informações
        necessárias para responder à solicitação, conforme a{" "}
        <a href="/privacidade">
          Política de Privacidade
        </a>
        .
      </p>

      {status.type !== "idle" && (
        <div
          className={`${styles.statusMessage} ${
            status.type === "success"
              ? styles.statusSuccess
              : status.type === "error"
                ? styles.statusError
                : styles.statusLoading
          }`}
          role={status.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {status.type === "success" && (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}

          {status.type === "error" && (
            <AlertCircle size={18} aria-hidden="true" />
          )}

          {status.type === "loading" && (
            <LoaderCircle
              size={18}
              className={styles.spinner}
              aria-hidden="true"
            />
          )}

          <span>{status.message}</span>
        </div>
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle
              size={19}
              className={styles.spinner}
              aria-hidden="true"
            />
            Enviando...
          </>
        ) : (
          <>
            Enviar mensagem
            <Send size={19} aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}