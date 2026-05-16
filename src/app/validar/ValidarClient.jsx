"use client";

import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, FileText, Search, Loader2, Calendar, Mail, Compass, ArrowRight, Download, Info } from 'lucide-react';
import styles from './Validar.module.css';

export default function ValidarClient() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [documentData, setDocumentData] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setDocumentData(null);

    // Formata o código para garantir caixa alta e remover espaços
    const formattedCode = code.toUpperCase().trim();

    try {
      const res = await fetch(`/api/crm/assinatura?code=${formattedCode}`);
      const data = await res.json();

      if (data.success && data.data) {
        setDocumentData(data.data);
      } else {
        setError(data.message || 'Código de validação não encontrado. Verifique se digitou corretamente.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao validar o documento. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'signed':
        return <span className={styles.badgeSuccess}>Assinado por Completo</span>;
      case 'partially_signed':
        return <span className={styles.badgeWarning}>Parcialmente Assinado</span>;
      default:
        return <span className={styles.badgePending}>Pendente</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    }).format(new Date(dateStr)) + ' -03:00';
  };

  // Extrai dados úteis da metadata
  const meta = documentData?.metadata 
    ? (typeof documentData.metadata === 'string' ? JSON.parse(documentData.metadata) : documentData.metadata) 
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <div className={styles.logoBadge}>SJ</div>
        <h1 className={styles.title}>Validador de Assinaturas</h1>
        <p className={styles.subtitle}>Verifique a validade jurídica, autoria e integridade de documentos assinados no ecossistema SocialJurídico.</p>
      </div>

      <div className={styles.card}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <label htmlFor="validationCode" className={styles.inputLabel}>Código de Validação do Documento</label>
          <div className={styles.inputGroup}>
            <input
              id="validationCode"
              type="text"
              placeholder="Ex: SJ-A7D9-E8C2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={styles.input}
              maxLength={15}
            />
            <button type="submit" className={styles.searchBtn} disabled={loading || !code.trim()}>
              {loading ? <Loader2 className={styles.spin} size={20} /> : <Search size={20} />}
              <span>Validar</span>
            </button>
          </div>
          <p className={styles.helpText}>Digite o código único de 12 caracteres (incluindo o prefixo "SJ-") localizado no rodapé do documento assinado.</p>
        </form>

        {error && (
          <div className={styles.errorAlert}>
            <AlertTriangle size={24} className={styles.alertIcon} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontWeight: 700 }}>Validação Falhou</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        )}

        {documentData && meta && (
          <div className={styles.resultContainer}>
            {/* Cabeçalho do Resultado - Certificado de Validez */}
            <div className={styles.certHeader}>
              <div className={styles.certIconContainer}>
                <CheckCircle size={44} color="#00e676" className={styles.pulseCheck} />
              </div>
              <div className={styles.certHeaderText}>
                <h3 className={styles.certTitle}>Assinatura Eletrônica Válida</h3>
                <p className={styles.certSub}>Documento registrado no SocialJurídico com integridade e rastreabilidade asseguradas.</p>
              </div>
              <div className={styles.statusBadgeWrapper}>
                {getStatusBadge(documentData.status)}
              </div>
            </div>

            {/* Grid de Informações do Documento */}
            <div className={styles.infoGrid}>
              <div className={styles.infoBlock}>
                <FileText size={20} className={styles.blockIcon} />
                <div>
                  <span className={styles.blockLabel}>Nome do Documento</span>
                  <span className={styles.blockVal}>{documentData.document_name}</span>
                </div>
              </div>
              <div className={styles.infoBlock}>
                <Calendar size={20} className={styles.blockIcon} />
                <div>
                  <span className={styles.blockLabel}>Data do Registro</span>
                  <span className={styles.blockVal}>{formatDate(documentData.created_at)}</span>
                </div>
              </div>
              <div className={styles.infoBlock}>
                <Compass size={20} className={styles.blockIcon} />
                <div>
                  <span className={styles.blockLabel}>Código de Validação</span>
                  <span className={styles.blockVal} style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '1px', color: 'var(--color-gold)' }}>{documentData.verification_code}</span>
                </div>
              </div>
              <div className={styles.infoBlock}>
                <Shield size={20} className={styles.blockIcon} />
                <div>
                  <span className={styles.blockLabel}>Tipo do Documento</span>
                  <span className={styles.blockVal} style={{ textTransform: 'capitalize' }}>{documentData.document_type}</span>
                </div>
              </div>
            </div>

            {/* Informações dos Signatários */}
            <div className={styles.sectionTitleWrapper}>
              <h4 className={styles.sectionTitle}>Signatários do Documento</h4>
            </div>

            <div className={styles.signersList}>
              {/* Signatário 1: Advogado */}
              <div className={styles.signerCard}>
                <div className={styles.signerHeader}>
                  <div className={styles.signerAvatar}>ADV</div>
                  <div>
                    <h5 className={styles.signerName}>{meta.lawyer.name}</h5>
                    <p className={styles.signerRole}>Advogado(a) Autor(a)</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    {meta.lawyer.signed ? (
                      <span className={styles.badgeSigned}>Assinatura Confirmada</span>
                    ) : (
                      <span className={styles.badgePending}>Assinatura Pendente</span>
                    )}
                  </div>
                </div>
                {meta.lawyer.signed && (
                  <div className={styles.signerMeta}>
                    <div className={styles.metaRow}>
                      <Mail size={14} /> <span>Email: {meta.lawyer.email}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <Calendar size={14} /> <span>Assinado em: {formatDate(meta.lawyer.signed_at)}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <Info size={14} /> <span>IP: {meta.lawyer.ip} | Autenticado via E-mail OTP</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Signatário 2: Cliente */}
              <div className={styles.signerCard}>
                <div className={styles.signerHeader}>
                  <div className={styles.signerAvatar} style={{ background: 'rgba(0,230,118,0.1)', color: '#00e676' }}>CLI</div>
                  <div>
                    <h5 className={styles.signerName}>{meta.client.name}</h5>
                    <p className={styles.signerRole}>Cliente / Parte Contratante</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    {meta.client.signed ? (
                      <span className={styles.badgeSigned}>Assinatura Confirmada</span>
                    ) : (
                      <span className={styles.badgePending}>Assinatura Pendente</span>
                    )}
                  </div>
                </div>
                {meta.client.signed && (
                  <div className={styles.signerMeta}>
                    <div className={styles.metaRow}>
                      <Mail size={14} /> <span>Email: {meta.client.email}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <Calendar size={14} /> <span>Assinado em: {formatDate(meta.client.signed_at)}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <Info size={14} /> <span>IP: {meta.client.ip} | Autenticado via E-mail OTP</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes de Criptografia e Hashes */}
            <div className={styles.sectionTitleWrapper}>
              <h4 className={styles.sectionTitle}>Integridade Criptográfica</h4>
            </div>

            <div className={styles.cryptoBox}>
              <div className={styles.hashRow}>
                <span className={styles.hashLabel}>HASH SHA-256 Assinado</span>
                <span className={styles.hashValue}>{documentData.signed_hash || 'Disponível após todas as assinaturas'}</span>
              </div>
              <div className={styles.hashRow}>
                <span className={styles.hashLabel}>HASH SHA-256 Original</span>
                <span className={styles.hashValue}>{documentData.original_hash || '-'}</span>
              </div>
              <p className={styles.cryptoDisclaimer}>O hash criptográfico garante que o documento não sofreu nenhuma alteração física ou de conteúdo após a coleta das assinaturas eletrônicas. Qualquer alteração invalida a integridade da assinatura.</p>
            </div>

            {/* Ações do Documento */}
            {documentData.document_url && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <a 
                  href={documentData.document_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={styles.downloadBtn}
                >
                  <Download size={18} /> Baixar PDF Assinado e Blindado
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
