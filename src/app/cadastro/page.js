"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scale, Loader2, CheckCircle2 } from "lucide-react";
import styles from "./Cadastro.module.css";
import { verifyOAB } from "@/app/actions/verifyOAB";
import { signUpAction } from "@/app/actions/authActions";
import { normalizeOABNumber, normalizeUF } from "@/lib/oab";

export default function Cadastro() {
  const [activeTab, setActiveTab] = useState("client");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");

  // Form State
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    senha: "",
    confirmarSenha: "",
    // Advogados fields
    oab: "",
    estado: "",
    origem_descoberta: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "oab") {
      setFormData({ ...formData, oab: normalizeOABNumber(value) });
      return;
    }

    if (name === "estado") {
      setFormData({ ...formData, estado: normalizeUF(value) });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Validação básica do Front (senhas iguais)
    if (formData.senha !== formData.confirmarSenha) {
      setErrorMsg("As senhas não conferem. Verifique a digitação.");
      return;
    }

    setLoading(true);

    // Se for advogado, antes de criar o usuário no Supabase, verificamos a OAB
    if (activeTab === "lawyer") {
      const vResp = await verifyOAB(
        formData.oab,
        formData.estado,
        formData.nome,
      );

      if (!vResp.isValid) {
        setErrorMsg(vResp.message);
        setLoading(false);
        return;
      }
      setSuccessMsg(
        vResp.skipped
          ? vResp.message
          : `OAB ${vResp.data?.oab || formData.oab} validada junto ao CNA.`,
      );
    }

    // Preparar dados para o Server Action
    const authPayload = {
      email: formData.email,
      password: formData.senha,
      name: formData.nome,
      phone: formData.whatsapp,
      role: activeTab === "lawyer" ? "LAWYER" : "CLIENT",
      oab: formData.oab,
      estado: formData.estado,
      origem_descoberta: formData.origem_descoberta,
      referral_code: referralCode,
    };

    const response = await signUpAction(authPayload);

    if (response.success) {
      setSuccessMsg(response.message);
      // Opcional: Limpar formulário
      setFormData({
        nome: "",
        email: "",
        whatsapp: "",
        senha: "",
        confirmarSenha: "",
        oab: "",
        estado: "",
        origem_descoberta: "",
      });
    } else {
      // Capturamos o código do erro para exibir links especiais
      if (response.code === "USER_ALREADY_EXISTS") {
        setErrorMsg({
          type: "USER_ALREADY_EXISTS",
          text: response.message
        });
      } else {
        setErrorMsg(response.message);
      }
    }

    setLoading(false);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* LADO ESQUERDO: Branding */}
      <div className={styles.leftSide}>
        <div className={styles.leftPattern}></div>

        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar a Home
        </Link>

        <div className={styles.leftContent}>
          <h1 className={styles.leftTitle}>
            Comece sua jornada no <br />
            <span style={{ color: "var(--color-gold)" }}>SocialJurídico</span>
          </h1>
          <p className={styles.leftDesc}>
            Junte-se a milhares de advogados e clientes que já resolveram seus
            problemas de forma prática e segura com o uso da nossa plataforma.
          </p>

          <div className={styles.usersProof}>
            <div className={styles.avatars}>
              <div className={styles.avatar}>RC</div>
              <div className={styles.avatar}>JS</div>
              <div className={styles.avatar}>AL</div>
            </div>
            <span className={styles.proofText}>Junte-se a +1.000 usuários</span>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Formulario */}
      <div className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link href="/" className={styles.logoMobileOnly}>
            <Scale size={28} />
            SocialJurídico
          </Link>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Crie sua conta</h2>
            <p className={styles.formSubtitle}>
              Estamos animados para ter você a bordo
            </p>
          </div>

          {/* TABS (Cliente / Advogado) */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "client" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("client");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              type="button"
            >
              Sou Cliente
            </button>
            <button
              className={`${styles.tab} ${activeTab === "lawyer" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("lawyer");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              type="button"
            >
              Sou Advogado
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome completo</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className={styles.input}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div>
                <label className={styles.label}>WhatsApp</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="(11) 90000-0000"
                  required
                />
              </div>
            </div>

            {/* Campos Específicos de Advogado */}
            {activeTab === "lawyer" && (
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>OAB (somente números)</label>
                  <input
                    type="text"
                    name="oab"
                    value={formData.oab}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ex: 123456"
                    required
                  />
                </div>
                <div>
                  <label className={styles.label}>Estado (UF)</label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className={styles.input}
                    required
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    <option value="AC">AC - Acre</option>
                    <option value="AL">AL - Alagoas</option>
                    <option value="AP">AP - Amapá</option>
                    <option value="AM">AM - Amazonas</option>
                    <option value="BA">BA - Bahia</option>
                    <option value="CE">CE - Ceará</option>
                    <option value="DF">DF - Distrito Federal</option>
                    <option value="ES">ES - Espírito Santo</option>
                    <option value="GO">GO - Goiás</option>
                    <option value="MA">MA - Maranhão</option>
                    <option value="MT">MT - Mato Grosso</option>
                    <option value="MS">MS - Mato Grosso do Sul</option>
                    <option value="MG">MG - Minas Gerais</option>
                    <option value="PA">PA - Pará</option>
                    <option value="PB">PB - Paraíba</option>
                    <option value="PR">PR - Paraná</option>
                    <option value="PE">PE - Pernambuco</option>
                    <option value="PI">PI - Piauí</option>
                    <option value="RJ">RJ - Rio de Janeiro</option>
                    <option value="RN">RN - Rio Grande do Norte</option>
                    <option value="RS">RS - Rio Grande do Sul</option>
                    <option value="RO">RO - Rondônia</option>
                    <option value="RR">RR - Roraima</option>
                    <option value="SC">SC - Santa Catarina</option>
                    <option value="SP">SP - São Paulo</option>
                    <option value="SE">SE - Sergipe</option>
                    <option value="TO">TO - Tocantins</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === "lawyer" && formData.estado && formData.oab && (
              <div
                style={{
                  marginTop: "8px",
                  marginBottom: "16px",
                  color: "var(--color-gold)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                }}
              >
                Formato salvo: {formData.estado} {formData.oab}
              </div>
            )}

            <div className={styles.formGroup} style={{ marginTop: "16px" }}>
              <label className={styles.label}>
                Onde conheceu o Social Jurídico?
              </label>
              <select
                name="origem_descoberta"
                value={formData.origem_descoberta}
                onChange={handleChange}
                className={styles.input}
                required
              >
                <option value="" disabled>
                  Selecione uma opção
                </option>
                <option value="Grupo do Facebook">Grupo do Facebook</option>
                <option value="Linkedin">Linkedin</option>
                <option value="Instagram">Instagram</option>
                <option value="Pesquisa Google">Pesquisa Google</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <div>
                <label className={styles.label}>Senha</label>
                <input
                  type="password"
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
              <div>
                <label className={styles.label}>Confirmar senha</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <input
                type="checkbox"
                className={styles.checkbox}
                required
                id="terms"
              />
              <label htmlFor="terms" className={styles.checkboxLabel}>
                Eu concordo com os{" "}
                <Link href="/termos" className={styles.linkTag}>
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className={styles.linkTag}>
                  Política de Privacidade
                </Link>
                .
              </label>
            </div>

            {/* ERROR AND SUCCESS MESSAGES */}
            {errorMsg && (
              <div
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#EF4444",
                  padding: "16px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  fontSize: "0.92rem",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  lineHeight: "1.5"
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: typeof errorMsg === 'object' ? "8px" : "0" }}>
                  🚨 {typeof errorMsg === 'object' ? errorMsg.text : errorMsg}
                </div>
                
                {typeof errorMsg === 'object' && errorMsg.type === "USER_ALREADY_EXISTS" && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap" }}>
                    <Link 
                      href="/login/esqueci-senha" 
                      style={{ 
                        color: "var(--color-gold)", 
                        textDecoration: "underline", 
                        fontWeight: "600",
                        fontSize: "0.85rem"
                      }}
                    >
                      Esqueci minha senha
                    </Link>
                    <Link 
                      href="/contato" 
                      style={{ 
                        color: "var(--color-gold)", 
                        textDecoration: "underline", 
                        fontWeight: "600",
                        fontSize: "0.85rem"
                      }}
                    >
                      Falar com suporte
                    </Link>
                  </div>
                )}
              </div>
            )}

            {successMsg && (
              <div style={{ textAlign: 'center', padding: '16px' }}>
                <div style={{ color: 'var(--color-gold)', fontSize: '48px', marginBottom: '16px' }}>
                  <CheckCircle2 size={64} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '8px' }}>Verifique seu email!</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Enviamos um link de confirmação para <strong>{formData.email}</strong>. Por favor, clique no link para ativar sua conta antes de fazer o login.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <Link href="/login" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Ir para Login
                   </Link>
                   <button onClick={() => setSuccessMsg("")} className={styles.submitBtn} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Fazer novo cadastro
                   </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Loader2 className="animate-spin" size={20} />
                  {activeTab === "lawyer"
                    ? "Validando dados da OAB..."
                    : "Criando Conta..."}
                </div>
              ) : (
                "Criar conta"
              )}
            </button>

            <div className={styles.loginHint}>
              Já tem uma conta?{" "}
              <Link href="/login" className={styles.linkTag}>
                Fazer login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
