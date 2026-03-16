"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Loader2 } from 'lucide-react';
import styles from './Login.module.css';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    // Simulação fake de login até que o Supabase seja conectado
    setTimeout(() => {
      if (formData.email && formData.senha) {
        setSuccessMsg('Login realizado com sucesso! Redirecionando...');
        // router.push('/dashboard') seria chamado aqui
        setLoading(false);
      } else {
        setErrorMsg('Por favor, preencha todos os campos.');
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className={styles.pageWrapper}>
      
      {/* LADO ESQUERDO: Branding (Mesmo do Cadastro) */}
      <div className={styles.leftSide}>
        <div className={styles.leftPattern}></div>
        
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar a Home
        </Link>
        
        <div className={styles.leftContent}>
          <h1 className={styles.leftTitle}>
            Bem-vindo de volta ao <br /> 
            <span style={{ color: 'var(--color-gold)' }}>SocialJurídico</span>
          </h1>
          <p className={styles.leftDesc}>
            Acesse sua conta para continuar gerenciando seus casos, conversando com advogados ou acompanhando seus clientes.
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

      {/* LADO DIREITO: Formulario de Login */}
      <div className={styles.rightSide}>
        <div className={styles.formContainer}>
          
          <Link href="/" className={styles.logoMobileOnly}>
            <Scale size={28} />
            SocialJurídico
          </Link>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Acesse sua conta</h2>
            <p className={styles.formSubtitle}>
              Digite seu email e senha para entrar.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            
            <div className={styles.formGroup}>
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

            <div className={styles.formGroup}>
              <label className={styles.label}>Senha</label>
              <input 
                type="password" 
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                className={styles.input} 
                placeholder="********" 
                required 
              />
            </div>

            <div className={styles.optionsRow}>
              <div className={styles.checkboxGroup}>
                <input type="checkbox" className={styles.checkbox} id="remember" />
                <label htmlFor="remember" className={styles.checkboxLabel}>
                  Lembrar-me
                </label>
              </div>
              
              <Link href="#" className={styles.forgotPassword}>
                Esqueceu sua senha?
              </Link>
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
                  Entrando...
                </div>
              ) : (
                'Entrar na plataforma'
              )}
            </button>

            <div className={styles.loginHint}>
              Ainda não tem uma conta? <Link href="/cadastro" className={styles.linkTag}>Cadastre-se grátis</Link>
            </div>
            
          </form>
        </div>
      </div>

    </div>
  );
}
