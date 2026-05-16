"use client";

import React, { useState, useEffect } from 'react';
import { Shield, FileText, Mail, Lock, CheckCircle, ArrowRight, Loader2, Download, AlertTriangle, Eye } from 'lucide-react';
import styles from './Assinatura.module.css';

export default function AssinaturaClient({ signatureId, initialRole }) {
  const [sigData, setSigData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [signingLoading, setSigningLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSignatureDetails();
  }, [signatureId]);

  const fetchSignatureDetails = async () => {
    try {
      const res = await fetch(`/api/crm/assinatura?id=${signatureId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSigData(data.data);
      } else {
        setError(data.message || 'Não foi possível carregar os detalhes do documento.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao buscar os dados do documento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crm/assinatura/enviar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_id: signatureId, role: initialRole })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.message || 'Erro ao enviar o código de confirmação.');
      }
    } catch (err) {
      console.error(err);
      setError('Falha de rede ao disparar o código para o seu e-mail.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSign = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) return;

    setSigningLoading(true);
    setError('');
    try {
      const res = await fetch('/api/crm/assinatura/validar-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_id: signatureId,
          role: initialRole,
          code: otpCode.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        fetchSignatureDetails(); // Recarrega os dados finais assinalados
      } else {
        setError(data.message || 'Código incorreto ou expirado.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar sua assinatura eletrônica.');
    } finally {
      setSigningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spin} size={48} color="var(--color-gold)" />
        <p>Carregando ambiente seguro de assinatura eletrônica...</p>
      </div>
    );
  }

  if (error && !sigData) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} color="#ff443a" />
        <h2>Ops! Ocorreu um problema</h2>
        <p>{error}</p>
      </div>
    );
  }

  const meta = sigData?.metadata 
    ? (typeof sigData.metadata === 'string' ? JSON.parse(sigData.metadata) : sigData.metadata) 
    : null;
  const currentParty = meta ? meta[initialRole] : null;

  // Verifica se o signatário atual já assinou
  const alreadySigned = currentParty?.signed;

  return (
    <div className={styles.container}>
      {/* Selo e Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.logo}>SJ</div>
        <h1>Portal de Assinatura Eletrônica</h1>
        <p className={styles.subtitle}>Ambiente criptografado e seguro com validade jurídica de acordo com a MP nº 2.200-2.</p>
      </div>

      <div className={styles.mainLayout}>
        {/* Painel do Documento */}
        <div className={styles.docPanel}>
          <div className={styles.panelTitle}>
            <FileText size={20} />
            <span>Revisar Documento</span>
          </div>
          <div className={styles.docDetails}>
            <h3>{sigData.document_name}</h3>
            <p className={styles.docMeta}>
              Tipo: <strong style={{ textTransform: 'capitalize' }}>{sigData.document_type}</strong> | 
              Código: <strong>{sigData.verification_code}</strong>
            </p>
          </div>

          {/* Visualizador de PDF */}
          <div className={styles.pdfViewer}>
            {sigData.document_url ? (
              <iframe 
                src={`${sigData.document_url}#toolbar=0`} 
                title="Document Viewer" 
                className={styles.iframe}
              />
            ) : (
              <div className={styles.noPdf}>
                <Eye size={40} />
                <p>Nenhum PDF disponível para visualização automática.</p>
              </div>
            )}
          </div>
        </div>

        {/* Painel de Ações de Assinatura */}
        <div className={styles.signPanel}>
          <div className={styles.panelTitle}>
            <Shield size={20} />
            <span>Assinatura Digital</span>
          </div>

          {success || alreadySigned ? (
            <div className={styles.successBlock}>
              <CheckCircle size={52} color="#00e676" className={styles.pulseCheck} />
              <h2>Assinatura Realizada!</h2>
              <p>Parabéns! Sua assinatura eletrônica foi validada e estampada no documento com integridade criptográfica SHA-256.</p>
              
              <div className={styles.signerDetailBox}>
                <p><strong>Nome:</strong> {currentParty?.name}</p>
                <p><strong>E-mail:</strong> {currentParty?.email}</p>
                <p><strong>Assinado em:</strong> {new Date(currentParty?.signed_at || new Date()).toLocaleString('pt-BR')}</p>
                <p><strong>IP Rastreado:</strong> {currentParty?.ip || 'Confirmado'}</p>
              </div>

              {sigData.document_url && (
                <a 
                  href={sigData.document_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.downloadBtn}
                >
                  <Download size={18} /> Baixar PDF Assinado
                </a>
              )}
            </div>
          ) : (
            <div className={styles.actionBlock}>
              <div className={styles.signerIntro}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#c5a059', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signatário Autenticado</p>
                <h3>{currentParty?.name}</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Email: {currentParty?.email}</p>
              </div>

              {error && (
                <div className={styles.errorAlert}>
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {!otpSent ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <p className={styles.stepInstructions}>Para assinar, enviaremos um código de segurança de 6 dígitos de validação para o seu e-mail cadastrado acima.</p>
                  <button 
                    onClick={handleSendOtp} 
                    className={styles.actionBtn}
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <>
                        <Loader2 className={styles.spin} size={20} />
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        <span>Solicitar Código por E-mail</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleVerifyAndSign} className={styles.otpForm}>
                  <p className={styles.stepInstructions}>Insira abaixo o código de 6 dígitos que enviamos para o seu e-mail <strong>{currentParty.email}</strong>:</p>
                  
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input 
                      type="text" 
                      placeholder="Código de 6 dígitos" 
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className={styles.otpInput}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={styles.actionBtn}
                    disabled={signingLoading || otpCode.length < 6}
                    style={{ background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)', color: '#fff', boxShadow: '0 4px 15px rgba(0, 230, 118, 0.2)' }}
                  >
                    {signingLoading ? (
                      <>
                        <Loader2 className={styles.spin} size={20} />
                        <span>Processando Assinatura...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        <span>Confirmar e Assinar Documento</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button" 
                    onClick={handleSendOtp} 
                    className={styles.resendBtn}
                    disabled={otpLoading}
                  >
                    Reenviar código por e-mail
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Selo de Garantia Legal */}
          <div className={styles.legalSeal}>
            <Shield size={16} />
            <span>Assinatura eletrônica em total conformidade com a MP 2.200-2/2001 e Lei 14.063/2020.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
