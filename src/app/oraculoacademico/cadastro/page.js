"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
} from "lucide-react";

import { BR_STATES } from "@/lib/brStates";
import { formatCPF, isValidCPF } from "@/lib/cpf";
import { normalizeOABNumber, normalizeUF } from "@/lib/oab";

import SupervisorsStep, {
  createEmptySupervisor,
} from "./components/SupervisorsStep";
import TermsStep, { TERMS_ITEMS } from "./components/TermsStep";
import styles from "./OraculoWizard.module.css";

const STEP_LABELS = [
  "Criar conta",
  "Perfil jurídico/acadêmico",
  "Experiência e interesses",
  "Supervisores",
  "Termos e responsabilidade",
];

const PERFIL_OPTIONS = [
  { value: "ESTUDANTE", label: "Estudante de Direito a partir do 8º período" },
  { value: "ESTAGIARIO", label: "Estagiário inscrito na OAB" },
  { value: "ADVOGADO_OAB", label: "Já sou advogado com OAB" },
];

const AREAS_INTERESSE_OPTIONS = [
  "Família",
  "Consumidor",
  "Trabalhista",
  "Previdenciário",
  "Cível",
  "Criminal",
  "Imobiliário",
  "Bancário",
  "Outros",
];

const EXPERIENCIA_OPTIONS = [
  "Nenhuma experiência ainda",
  "Núcleo de Prática Jurídica",
  "Estágio em escritório",
  "Estágio em órgão público",
  "Estágio em fórum/cartório",
];

const DISPONIBILIDADE_OPTIONS = [
  "Até 2h por semana",
  "3 a 5h por semana",
  "6 a 10h por semana",
  "Mais de 10h por semana",
];

const INITIAL_FORM = {
  nome: "",
  email: "",
  whatsapp: "",
  cpf: "",
  cidade: "",
  estado: "",
  senha: "",
  confirmarSenha: "",
  origem_descoberta: "",
  tipo: "",
  instituicao_ensino: "",
  periodo_atual: "",
  previsao_conclusao: "",
  numero_matricula: "",
  participa_nucleo_pratica: false,
  fez_estagio_juridico: false,
  oab_estagiario_numero: "",
  oab_estagiario_uf: "",
  areas_interesse: [],
  experiencia_pratica: "",
  disponibilidade_semanal: "",
  bio: "",
  motivo_participacao: "",
};

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

export default function OraculoCadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [supervisores, setSupervisores] = useState([createEmptySupervisor()]);
  const [terms, setTerms] = useState({});
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const docFieldForTipo = useMemo(() => {
    if (form.tipo === "ESTAGIARIO") return "comprovante_estagiario";
    return "comprovante_matricula";
  }, [form.tipo]);

  const docLabelForTipo = useMemo(() => {
    if (form.tipo === "ESTAGIARIO") return "comprovante de inscrição de estagiário";
    return "comprovante de matrícula atualizado";
  }, [form.tipo]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (type === "checkbox") {
      update(name, checked);
      return;
    }
    if (name === "whatsapp") {
      update(name, formatPhone(value));
      return;
    }
    if (name === "cpf") {
      update(name, formatCPF(value));
      return;
    }
    if (name === "estado" || name === "oab_estagiario_uf") {
      update(name, normalizeUF(value));
      return;
    }
    if (name === "oab_estagiario_numero") {
      update(name, normalizeOABNumber(value));
      return;
    }
    if (name === "tipo" && value === "ADVOGADO_OAB") {
      router.push("/cadastro?perfil=advogado");
      return;
    }

    update(name, value);
  }

  function toggleArea(area) {
    setForm((current) => {
      const has = current.areas_interesse.includes(area);
      return {
        ...current,
        areas_interesse: has
          ? current.areas_interesse.filter((item) => item !== area)
          : [...current.areas_interesse, area],
      };
    });
  }

  function handleFileChange(field, event) {
    const file = event.target.files?.[0] || null;
    setFiles((current) => ({ ...current, [field]: file }));
  }

  function validateStep(currentStep) {
    if (currentStep === 0) {
      if (form.nome.trim().length < 3) return "Informe seu nome completo.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return "Informe um endereço de e-mail válido.";
      }
      const phoneDigits = form.whatsapp.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        return "Informe um número de WhatsApp válido.";
      }
      if (!isValidCPF(form.cpf)) return "Informe um CPF válido.";
      if (!form.cidade.trim() || !form.estado) {
        return "Informe cidade e estado.";
      }
      if (form.senha.length < 8) {
        return "A senha deve possuir pelo menos oito caracteres.";
      }
      if (form.senha !== form.confirmarSenha) {
        return "As senhas não conferem.";
      }
      if (!form.origem_descoberta) {
        return "Informe onde conheceu o Social Jurídico.";
      }
      return null;
    }

    if (currentStep === 1) {
      if (!form.tipo || form.tipo === "ADVOGADO_OAB") {
        return "Selecione seu perfil jurídico/acadêmico.";
      }
      if (!form.instituicao_ensino.trim()) {
        return "Informe a instituição de ensino.";
      }
      if (form.tipo === "ESTUDANTE" && !form.periodo_atual) {
        return "Informe seu período atual.";
      }
      if (
        form.tipo === "ESTAGIARIO" &&
        (form.oab_estagiario_numero.length < 3 || !form.oab_estagiario_uf)
      ) {
        return "Informe o número e a UF da sua inscrição de estagiário na OAB.";
      }
      if (!files[docFieldForTipo]) {
        return `Envie o ${docLabelForTipo}.`;
      }
      return null;
    }

    if (currentStep === 2) {
      if (!form.areas_interesse.length) {
        return "Selecione ao menos uma área de interesse.";
      }
      if (!form.experiencia_pratica) {
        return "Selecione seu nível de experiência prática.";
      }
      if (!form.disponibilidade_semanal) {
        return "Selecione sua disponibilidade semanal.";
      }
      return null;
    }

    if (currentStep === 3) {
      if (!supervisores.length || supervisores.length > 3) {
        return "Indique de 1 a 3 advogados supervisores.";
      }
      for (const supervisor of supervisores) {
        if (supervisor.nome.trim().length < 3) {
          return "Informe o nome de todos os supervisores.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supervisor.email.trim())) {
          return "Informe um e-mail válido para cada supervisor.";
        }
        if (!supervisor.oab_numero || !supervisor.oab_uf) {
          return "Informe a OAB e a UF de cada supervisor.";
        }
        if (!supervisor.relacao) {
          return "Selecione a relação com cada supervisor indicado.";
        }
      }
      const emails = supervisores.map((item) => item.email.toLowerCase().trim());
      if (new Set(emails).size !== emails.length) {
        return "Os e-mails dos supervisores indicados devem ser distintos.";
      }
      return null;
    }

    if (currentStep === 4) {
      const allChecked = TERMS_ITEMS.every((item) => terms[item.key]);
      if (!allChecked) {
        return "Você precisa aceitar todas as declarações e termos para continuar.";
      }
      return null;
    }

    return null;
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }
    setErrorMsg("");
    setStep((current) => Math.min(current + 1, STEP_LABELS.length - 1));
  }

  function goBack() {
    setErrorMsg("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleFinalSubmit() {
    const validationError = validateStep(4);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg("");
    setLoading(true);

    try {
      const payload = {
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        whatsapp: form.whatsapp,
        senha: form.senha,
        cpf: form.cpf,
        cidade: form.cidade.trim(),
        estado: form.estado,
        origem_descoberta: form.origem_descoberta,
        tipo: form.tipo,
        instituicao_ensino: form.instituicao_ensino.trim(),
        periodo_atual: form.periodo_atual || null,
        previsao_conclusao: form.previsao_conclusao || null,
        numero_matricula: form.numero_matricula || null,
        participa_nucleo_pratica: form.participa_nucleo_pratica,
        fez_estagio_juridico: form.fez_estagio_juridico,
        oab_estagiario_numero: form.oab_estagiario_numero || null,
        oab_estagiario_uf: form.oab_estagiario_uf || null,
        areas_interesse: form.areas_interesse,
        experiencia_pratica: form.experiencia_pratica,
        disponibilidade_semanal: form.disponibilidade_semanal,
        bio: form.bio.trim(),
        motivo_participacao: form.motivo_participacao.trim(),
        supervisores: supervisores.map((supervisor) => ({
          nome: supervisor.nome.trim(),
          email: supervisor.email.trim().toLowerCase(),
          oab_numero: supervisor.oab_numero,
          oab_uf: supervisor.oab_uf,
          relacao: supervisor.relacao,
        })),
        termos_aceitos: true,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(payload));
      if (files[docFieldForTipo]) {
        formData.append(docFieldForTipo, files[docFieldForTipo]);
      }

      const response = await fetch("/api/oraculo/cadastro", {
        method: "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setErrorMsg(
          result?.message || "Não foi possível concluir o cadastro.",
        );
        return;
      }

      setSuccessMsg(
        result.message || "Cadastro recebido! Verifique seu e-mail.",
      );
    } catch (error) {
      console.error("[Oraculo/Cadastro] Erro:", error);
      setErrorMsg("Ocorreu um erro ao enviar seu cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (successMsg) {
    return (
      <main className={styles.page}>
        <section className={styles.leftSide}>
          <div className={styles.leftPattern} aria-hidden="true" />
          <div className={styles.leftContent}>
            <span className={styles.brand}>
              <span className={styles.brandIcon}>
                <GraduationCap size={20} aria-hidden="true" />
              </span>
              Oráculo Acadêmico
            </span>
            <span className={styles.eyebrow}>Cadastro concluído</span>
            <h1 className={styles.title}>
              Seu cadastro está a caminho da ativação.
            </h1>
          </div>
        </section>

        <section className={styles.rightSide}>
          <div className={styles.formContainer}>
            <div className={styles.successCard}>
              <CheckCircle2 size={44} color="#4ade80" aria-hidden="true" />
              <h1>Cadastro enviado!</h1>
              <p>{successMsg}</p>
              <p>
                Enviamos convites de supervisor para os advogados indicados e
                um e-mail de confirmação de conta para você. Assim que seus
                documentos forem validados e pelo menos um supervisor
                aprovar, seu acesso é liberado.
              </p>
              <Link href="/oraculoacademico/login" className={styles.submitBtn}>
                Ir para o login
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.leftSide}>
        <div className={styles.leftPattern} aria-hidden="true" />

        <Link href="/oraculoacademico" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para o Oráculo Acadêmico
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.brand}>
            <span className={styles.brandIcon}>
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            Oráculo Acadêmico
          </span>

          <header className={styles.header}>
            <span className={styles.eyebrow}>Cadastro do Oráculo Acadêmico</span>
            <h1 className={styles.title}>{STEP_LABELS[step]}</h1>
            <p className={styles.subtitle}>
              Etapa {step + 1} de {STEP_LABELS.length}
            </p>
          </header>

          <div className={styles.stepper}>
            {STEP_LABELS.map((label, index) => (
              <div
                key={label}
                className={`${styles.stepperItem} ${
                  index < step
                    ? styles.stepperItemDone
                    : index === step
                      ? styles.stepperItemActive
                      : ""
                }`}
              >
                <span className={styles.stepperMarker}>{index + 1}</span>
                <span className={styles.stepperLabel}>{label}</span>
              </div>
            ))}
          </div>

          <div className={styles.whoCanJoin}>
            <span className={styles.whoCanJoinTitle}>Quem pode participar?</span>
            <ul>
              <li>Estudante de Direito a partir do 8º período ou estagiário inscrito na OAB.</li>
              <li>Comprovante válido: matrícula atualizada ou inscrição de estagiário.</li>
              <li>Advogado Supervisor vinculado, identificado por sua OAB.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link href="/oraculoacademico" className={styles.logoMobileOnly}>
            <GraduationCap size={24} aria-hidden="true" />
            Oráculo Acadêmico
          </Link>

          <div className={styles.mobileProgress}>
            {STEP_LABELS.map((label, index) => (
              <div
                key={label}
                className={`${styles.mobileProgressStep} ${
                  index < step
                    ? styles.mobileProgressStepDone
                    : index === step
                      ? styles.mobileProgressStepActive
                      : ""
                }`}
              />
            ))}
          </div>

          <div className={styles.card}>
          {errorMsg && (
            <div className={styles.errorMessage} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 0 && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nome completo</label>
                <input
                  type="text"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className={styles.input}
                  maxLength={120}
                  disabled={loading}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className={styles.input}
                    maxLength={160}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>WhatsApp</label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="(15) 99999-9999"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>CPF</label>
                  <input
                    type="text"
                    name="cpf"
                    value={form.cpf}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={form.cidade}
                    onChange={handleChange}
                    className={styles.input}
                    maxLength={120}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Estado</label>
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    {BR_STATES.map(([uf, name]) => (
                      <option key={uf} value={uf}>
                        {uf} — {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Onde conheceu o Oráculo Acadêmico?
                  </label>
                  <select
                    name="origem_descoberta"
                    value={form.origem_descoberta}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={loading}
                  >
                    <option value="">Selecione</option>
                    <option value="Grupo do Facebook">Grupo do Facebook</option>
                    <option value="Instagram">Instagram</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Pesquisa Google">Pesquisa no Google</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Senha</label>
                  <input
                    type="password"
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Mínimo de 8 caracteres"
                    disabled={loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Confirmar senha</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    value={form.confirmarSenha}
                    onChange={handleChange}
                    className={styles.input}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Qual é o seu perfil atualmente?
                </label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {PERFIL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.tipo && form.tipo !== "ADVOGADO_OAB" && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Instituição de ensino/faculdade
                    </label>
                    <input
                      type="text"
                      name="instituicao_ensino"
                      value={form.instituicao_ensino}
                      onChange={handleChange}
                      className={styles.input}
                      maxLength={180}
                      disabled={loading}
                    />
                  </div>

                  {form.tipo === "ESTUDANTE" && (
                    <>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Período atual</label>
                          <input
                            type="text"
                            name="periodo_atual"
                            value={form.periodo_atual}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="Ex.: 8º período"
                            disabled={loading}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.label}>
                            Previsão de conclusão
                          </label>
                          <input
                            type="date"
                            name="previsao_conclusao"
                            value={form.previsao_conclusao}
                            onChange={handleChange}
                            className={styles.input}
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Número de matrícula (opcional)
                        </label>
                        <input
                          type="text"
                          name="numero_matricula"
                          value={form.numero_matricula}
                          onChange={handleChange}
                          className={styles.input}
                          maxLength={60}
                          disabled={loading}
                        />
                      </div>

                      <div className={styles.checkboxRow}>
                        <input
                          id="participa_nucleo_pratica"
                          type="checkbox"
                          name="participa_nucleo_pratica"
                          checked={form.participa_nucleo_pratica}
                          onChange={handleChange}
                          className={styles.checkbox}
                          disabled={loading}
                        />
                        <label
                          htmlFor="participa_nucleo_pratica"
                          className={styles.checkboxLabel}
                        >
                          Participa ou participou de Núcleo de Prática Jurídica
                        </label>
                      </div>

                      <div className={styles.checkboxRow}>
                        <input
                          id="fez_estagio_juridico"
                          type="checkbox"
                          name="fez_estagio_juridico"
                          checked={form.fez_estagio_juridico}
                          onChange={handleChange}
                          className={styles.checkbox}
                          disabled={loading}
                        />
                        <label
                          htmlFor="fez_estagio_juridico"
                          className={styles.checkboxLabel}
                        >
                          Já fez estágio jurídico
                        </label>
                      </div>
                    </>
                  )}

                  {form.tipo === "ESTAGIARIO" && (
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Número da inscrição de estagiário na OAB
                        </label>
                        <input
                          type="text"
                          name="oab_estagiario_numero"
                          value={form.oab_estagiario_numero}
                          onChange={handleChange}
                          className={styles.input}
                          inputMode="numeric"
                          maxLength={10}
                          disabled={loading}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label className={styles.label}>UF da inscrição</label>
                        <select
                          name="oab_estagiario_uf"
                          value={form.oab_estagiario_uf}
                          onChange={handleChange}
                          className={styles.input}
                          disabled={loading}
                        >
                          <option value="">Selecione</option>
                          {BR_STATES.map(([uf, name]) => (
                            <option key={uf} value={uf}>
                              {uf} — {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {docLabelForTipo}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(event) =>
                        handleFileChange(docFieldForTipo, event)
                      }
                      className={styles.input}
                      disabled={loading}
                    />
                    <p className={styles.hint}>
                      PDF, JPG, PNG ou WEBP, até 8 MB.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Áreas de interesse</label>
                <div className={styles.chips}>
                  {AREAS_INTERESSE_OPTIONS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      className={`${styles.chip} ${
                        form.areas_interesse.includes(area)
                          ? styles.chipActive
                          : ""
                      }`}
                      onClick={() => toggleArea(area)}
                      disabled={loading}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Nível de experiência prática
                </label>
                <select
                  name="experiencia_pratica"
                  value={form.experiencia_pratica}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {EXPERIENCIA_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Disponibilidade semanal</label>
                <select
                  name="disponibilidade_semanal"
                  value={form.disponibilidade_semanal}
                  onChange={handleChange}
                  className={styles.input}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {DISPONIBILIDADE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Pequena bio profissional/acadêmica
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={2000}
                  disabled={loading}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Por que deseja participar do Oráculo Acadêmico?
                </label>
                <textarea
                  name="motivo_participacao"
                  value={form.motivo_participacao}
                  onChange={handleChange}
                  className={styles.textarea}
                  maxLength={2000}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <SupervisorsStep
              supervisores={supervisores}
              onChange={setSupervisores}
              disabled={loading}
            />
          )}

          {step === 4 && (
            <TermsStep terms={terms} onChange={setTerms} disabled={loading} />
          )}

          <div className={styles.actions}>
            {step > 0 && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={goBack}
                disabled={loading}
              >
                Voltar
              </button>
            )}

            {step < STEP_LABELS.length - 1 ? (
              <button
                type="button"
                className={styles.nextBtn}
                onClick={goNext}
                disabled={loading}
              >
                Continuar
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleFinalSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2
                      size={17}
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                    Enviando cadastro...
                  </>
                ) : (
                  "Concluir cadastro"
                )}
              </button>
            )}
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
