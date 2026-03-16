"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordAction } from '@/app/actions/authActions';
import styles from '../login/Login.module.css';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AtualizarSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

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
      setSuccessMsg('Sua senha foi atualizada! Redirecionando para a área logada...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } else {
      setErrorMsg(response.message);
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
          <h2 className={styles.formTitle}>Atualizar Senha</h2>
          <p className={styles.formSubtitle}>
            Por segurança, você precisa definir uma senha pessoal antes de continuar.
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
            {loading ? <Loader2 className="animate-spin" /> : 'Salvar e Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
