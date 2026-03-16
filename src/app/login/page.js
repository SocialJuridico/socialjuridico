"use client";

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Loader2, AlertCircle } from 'lucide-react';
import styles from './Login.module.css';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';

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

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.email, password: formData.senha })
    });
    const response = await res.json();

    if (response.success) {
      setSuccessMsg('Login realizado com sucesso! Redirecionando...');
      const role = response.user?.role || 'CLIENT';
      const needsUpdate = response.user?.needsPasswordUpdate === true;
      
      setTimeout(() => {
        if (needsUpdate) {
          router.push('/atualizar-senha');
        } else {
          if (role === 'ADMIN') router.push('/admin');
          else if (role === 'LAWYER') router.push('/dashboard/advogado');
          else router.push('/dashboard/cliente');
        }
      }, 1500);
    } else {
      setErrorMsg(response.message || 'Erro ao realizar login. Verifique suas credenciais.');
      setLoading(false);
    }
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

          {/* Banner de sessão expirada */}
          {sessionExpired && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '8px',
              color: '#eab308',
              fontSize: '0.88rem',
              fontWeight: 600
            }}>
              <AlertCircle size={18} style={{flexShrink: 0}} />
              Sua sessão expirou após 4 horas de inatividade. Por segurança, faça login novamente.
            </div>
          )}

          {/* Mensagem de erro */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '8px',
              color: '#ef4444',
              fontSize: '0.88rem',
              fontWeight: 600
            }}>
              <AlertCircle size={18} style={{flexShrink: 0}} />
              {errorMsg}
            </div>
          )}

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

            {/* SUCCESS MESSAGES */}
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

export default function Login() {
  return (
    <Suspense fallback={
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#000', 
        color: '#D4AF37' 
      }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
