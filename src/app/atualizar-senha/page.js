"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { updatePasswordAction } from '@/app/actions/authActions';
import styles from '../login/Login.module.css';
import { Loader2, ShieldCheck } from 'lucide-react';

function AtualizarSenhaContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRecovery = searchParams.get('type') === 'recovery';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 8) {
      setErrorMsg('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const response = await updatePasswordAction(password);

    if (response.success) {
      setSuccessMsg(`Sua senha foi ${isRecovery ? 'redefinida' : 'atualizada'}! Redirecionando...`);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      setErrorMsg(response.message || "Erro ao atualizar senha.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className={styles.formContainer} style={{ background: 'var(--color-black-light)', padding: '48px', borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        
        <div className={styles.formHeader}>
          <div style={{ color: 'var(--color-gold)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <ShieldCheck size={48} />
          </div>
          <h2 className={styles.formTitle}>{isRecovery ? 'Redefinir Senha' : 'Atualizar Senha'}</h2>
          <p className={styles.formSubtitle}>
            {isRecovery 
              ? 'Crie uma nova senha forte para acessar sua conta com segurança.' 
              : 'Por segurança, você precisa definir uma senha pessoal antes de continuar.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nova Senha</label>
            <input 
              type="password" 
              className={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirmar Nova Senha</label>
            <input 
              type="password" 
              className={styles.input} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required 
            />
          </div>

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
                Salvando...
              </div>
            ) : (
              isRecovery ? 'Redefinir Senha' : 'Salvar e Continuar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AtualizarSenha() {
  return (
    <Suspense fallback={
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#D4AF37' }}>
        <Loader2 className="animate-spin" size={48} />
      </div>
    }>
      <AtualizarSenhaContent />
    </Suspense>
  );
}
