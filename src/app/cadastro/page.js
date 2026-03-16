"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Loader2 } from 'lucide-react';
import styles from './Cadastro.module.css';
import { verifyOAB } from '@/app/actions/verifyOAB';

export default function Cadastro() {
  const [activeTab, setActiveTab] = useState('client');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    senha: '',
    confirmarSenha: '',
    // Advogados fields
    oab: '',
    estado: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validação básica do Front (senhas iguais)
    if (formData.senha !== formData.confirmarSenha) {
      setErrorMsg('As senhas não conferem. Verifique a digitação.');
      return;
    }

    setLoading(true);

    // Se for advogado, antes de criar o usuário no Supabase, verificamos a OAB
    if (activeTab === 'lawyer') {
      const vResp = await verifyOAB(formData.oab, formData.estado, formData.nome);
      
      if (!vResp.isValid) {
        setErrorMsg(vResp.message); // ex: nome no CNA é diferente
        setLoading(false);
        return;
      }
      
      // Se passou da OAB:
      setSuccessMsg(`OAB ${vResp.data?.oab || formData.oab} validada junto ao CNA. Finalizando criação da conta...`);
      // Simulação fake de insert final no DB até o usuário ligar o backend:
      setTimeout(() => {
        setSuccessMsg('Conta Advogado Criada Com Sucesso!');
        setLoading(false);
      }, 1500);
      
    } else {
      // Se for apenas cliente, cria direto
      setSuccessMsg('Iniciando criação na tabela "clientes"...');
      setTimeout(() => {
        setSuccessMsg('Conta Cliente Criada Com Sucesso!');
        setLoading(false);
      }, 1000);
    }
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
            <span style={{ color: 'var(--color-gold)' }}>SocialJurídico</span>
          </h1>
          <p className={styles.leftDesc}>
            Junte-se a milhares de advogados e clientes que já resolveram seus problemas de forma prática e segura com o uso da nossa plataforma.
          </p>
          
          <div className={styles.usersProof}>
            <div className={styles.avatars}>
              <div className={styles.avatar}>RC</div>
              <div className={styles.avatar}>JS</div>
              <div className={styles.avatar}>AL</div>
            </div>
            <span className={styles.proofText}>
              Junte-se a +1.000 usuários
            </span>
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
              className={`${styles.tab} ${activeTab === 'client' ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab('client');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              type="button"
            >
              Sou Cliente
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'lawyer' ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab('lawyer');
                setErrorMsg('');
                setSuccessMsg('');
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
            {activeTab === 'lawyer' && (
              <div className={styles.formRow}>
                <div>
                  <label className={styles.label}>OAB (Número)</label>
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
                    <option value="" disabled>Selecione</option>
                    <option value="SP">SP - São Paulo</option>
                    <option value="RJ">RJ - Rio de Janeiro</option>
                    <option value="MG">MG - Minas Gerais</option>
                    <option value="PR">PR - Paraná</option>
                    <option value="SC">SC - Santa Catarina</option>
                    <option value="RS">RS - Rio Grande do Sul</option>
                    <option value="BA">BA - Bahia</option>
                    <option value="DF">DF - Distrito Federal</option>
                    <option value="GO">GO - Goiás</option>
                    <option value="PE">PE - Pernambuco</option>
                  </select>
                </div>
              </div>
            )}

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
              <input type="checkbox" className={styles.checkbox} required id="terms" />
              <label htmlFor="terms" className={styles.checkboxLabel}>
                Eu concordo com os <Link href="/termos" className={styles.linkTag}>Termos de Uso</Link> e a <Link href="/privacidade" className={styles.linkTag}>Política de Privacidade</Link>.
              </label>
            </div>

            {/* ERROR AND SUCCESS MESSAGES */}
            {errorMsg && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                🚨 {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                ✅ {successMsg}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Loader2 className="animate-spin" size={20} />
                  {activeTab === 'lawyer' ? 'Verificando OAB no CNA...' : 'Criando Conta...'}
                </div>
              ) : (
                'Criar conta'
              )}
            </button>

            <div className={styles.loginHint}>
              Já tem uma conta? <Link href="/login" className={styles.linkTag}>Fazer login</Link>
            </div>
            
          </form>
        </div>
      </div>

    </div>
  );
}
