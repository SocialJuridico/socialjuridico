"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";

import styles from "./portal.module.css";

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SignaturePortalClient({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // PDF.js State Variables
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfRenderLoading, setPdfRenderLoading] = useState(false);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);

  // Signature Coordinates & Placement (percentage coordinates 0.0 to 1.0)
  const [stampPage, setStampPage] = useState(1);
  const [stampX, setStampX] = useState(0.5); // Default center x
  const [stampY, setStampY] = useState(0.85); // Default bottom y
  const [isDragging, setIsDragging] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");

  const apiBase = `/api/assinatura/public/${encodeURIComponent(token)}`;

  useEffect(() => {
    const formatted = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "America/Sao_Paulo",
      hour12: false,
    }).format(new Date());
    setCurrentDateTime(`${formatted}-0300`);
  }, []);

  // Dynamic script loader for PDF.js (guarantees zero Turbopack compile issues)
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfLibLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfLibLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load PDF.js from CDN");
      setError("Erro ao carregar renderizador de PDF. Por favor, recarregue a página.");
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(apiBase, { cache: "no-store" });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success) throw new Error(result?.message || "Convite inválido.");
        if (!active) return;
        setData(result.data);
        setLoading(false);

        const viewedResponse = await fetch(apiBase, { method: "POST" });
        const viewed = await viewedResponse.json().catch(() => null);
        if (active && viewedResponse.ok && viewed?.data) setData(viewed.data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Não foi possível abrir o convite.");
        setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [apiBase]);

  const documentUrl = `${apiBase}/documento`;
  const finalUrl = `${apiBase}/documento?final=1`;

  // Load PDF Document when details are fetched and PDF.js is loaded
  useEffect(() => {
    if (!pdfLibLoaded || !data?.document) return;

    let active = true;
    async function loadPdf() {
      setPdfRenderLoading(true);
      try {
        const loadingTask = window.pdfjsLib.getDocument(documentUrl);
        const loadedPdf = await loadingTask.promise;

        if (active) {
          setPdfDoc(loadedPdf);
          setTotalPages(loadedPdf.numPages);
          setStampPage(loadedPdf.numPages); // Default to last page for stamp
        }
      } catch (err) {
        console.error("Error loading PDF:", err);
      } finally {
        if (active) setPdfRenderLoading(false);
      }
    }

    loadPdf();
    return () => { active = false; };
  }, [pdfLibLoaded, data?.document, documentUrl]);

  // Render the selected PDF page to the <canvas>
  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(stampPage);
        if (!active) return;

        const canvas = document.getElementById("pdf-canvas");
        if (!canvas) return;

        const context = canvas.getContext("2d");
        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : 700;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering page to canvas:", err);
      }
    }

    const timer = setTimeout(renderPage, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pdfDoc, stampPage]);

  // Handle click on canvas container to place the signature stamp instantly
  const handleSheetClick = (e) => {
    if (isDragging || completed || readOnly || unavailable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let pctX = clickX / rect.width;
    let pctY = clickY / rect.height;

    // Center stamp relative to click position
    setStampX(Math.max(0.01, Math.min(0.99 - 0.40, pctX - 0.20)));
    setStampY(Math.max(0.01, Math.min(0.99 - 0.08, pctY - 0.04)));
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    if (completed || readOnly || unavailable) return;
    setIsDragging(true);
  };

  // Drag listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const container = document.getElementById("mock-sheet");
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      let x = (clientX - rect.left) / rect.width;
      let y = (clientY - rect.top) / rect.height;

      // Keep within bounds
      x = Math.max(0.01, Math.min(0.99 - 0.40, x - 0.20));
      y = Math.max(0.01, Math.min(0.99 - 0.08, y - 0.04));

      setStampX(x);
      setStampY(y);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleMouseMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleMouseMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  async function requestOtp() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch(`${apiBase}/otp`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || "Não foi possível enviar o código.");
      setOtpSent(true);
      setStatusMessage(result.message || "Código enviado.");
    } catch (otpError) {
      setError(otpError.message || "Não foi possível enviar o código.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sign(event) {
    event.preventDefault();
    if (submitting) return;
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Informe o código de 6 dígitos.");
      return;
    }
    if (!accepted) {
      setError("Confirme o aceite eletrônico para continuar.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatusMessage("");
    try {
      const response = await fetch(`${apiBase}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: otpCode,
          accepted,
          documentHash: data.document.sha256,
          stampPage,
          stampX,
          stampY,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.message || "Não foi possível concluir.");
      setData(result.data);
      setStatusMessage(result.message || "Participação concluída.");
      setOtpCode("");
    } catch (signError) {
      setError(signError.message || "Não foi possível concluir a assinatura.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className={styles.loading}><Loader2 size={30} className={styles.spin} /><span>Carregando documento protegido...</span></main>;
  }

  if (error && !data) {
    return <main className={styles.errorPage}><AlertCircle size={38} /><h1>Convite indisponível</h1><p>{error}</p><Link href="/assinatura">Conhecer o Social Jurídico Assinatura</Link></main>;
  }

  const completed = data.recipient.status === "COMPLETED";
  const readOnly = data.recipient.role === "COPY";
  const unavailable = data.envelope.expired || ["VOIDED", "EXPIRED"].includes(data.envelope.status);

  return (
    <main className={styles.portal}>
      <header className={styles.topbar}>
        <Link href="/assinatura" className={styles.brand}><span><Scale size={21} /></span><div><strong>Social Jurídico</strong><small>Assinatura</small></div></Link>
        <span className={styles.secure}><ShieldCheck size={16} /> Ambiente protegido</span>
      </header>

      <section className={styles.heading}>
        <div><span>Documento eletrônico</span><h1>{data.envelope.title}</h1><p>Enviado por {data.organization.name} para {data.recipient.name}.</p></div>
        <div className={styles.headingCode}><small>Código de verificação</small><strong>{data.envelope.verificationCode}</strong></div>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.documentPanel}>
          <header>
            <div><FileText size={18} /><span>{data.document?.name || "Documento PDF"}</span></div>
            <a href={documentUrl} target="_blank" rel="noopener noreferrer"><Download size={16} /> Abrir PDF</a>
          </header>

          <div className={styles.pdfContainer}>
            {pdfRenderLoading && (
              <div className={styles.pdfLoader}>
                <Loader2 size={30} className={styles.spin} />
                <span>Carregando visualização do PDF...</span>
              </div>
            )}
            
            <div 
              id="mock-sheet" 
              className={styles.pdfCanvasContainer}
              onClick={handleSheetClick}
              style={{ position: "relative", width: "100%", cursor: (!completed && !readOnly && !unavailable) ? "crosshair" : "default" }}
            >
              <canvas id="pdf-canvas" className={styles.pdfCanvas} />

              {/* Gold stamp overlay */}
              {!completed && !readOnly && !unavailable && otpSent && (
                <div 
                  className={`${styles.draggableStamp} ${isDragging ? styles.dragging : ""}`}
                  style={{ 
                    left: `${stampX * 100}%`, 
                    top: `${stampY * 100}%` 
                  }}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src="/Logo.png" alt="SJ Logo" className={styles.stampLogoImg} />
                  <div className={styles.stampTextContainer}>
                    <div className={styles.stampHeader}>Documento assinado digitalmente</div>
                    <div className={styles.stampSignerName}>
                      {data.recipient.name ? data.recipient.name.toUpperCase().substring(0, 18) : "SIGNATÁRIO"}
                    </div>
                    <div className={styles.stampDate}>
                      Data: {currentDateTime || "Carregando..."}
                    </div>
                    <div className={styles.stampValidationInfo}>Verifique em socialjuridico.com.br/validar</div>
                  </div>
                  <div className={styles.stampTooltip}>Arraste-me no documento! 📄</div>
                </div>
              )}
            </div>
          </div>

          <footer className={styles.pdfFooter}>
            <div className={styles.pdfControls}>
              <button 
                type="button" 
                className={styles.pageBtn}
                disabled={stampPage <= 1} 
                onClick={() => setStampPage(p => Math.max(1, p - 1))}
              >
                Página Anterior
              </button>
              <span className={styles.pageIndicator}>Página {stampPage} de {totalPages}</span>
              <button 
                type="button" 
                className={styles.pageBtn}
                disabled={stampPage >= totalPages} 
                onClick={() => setStampPage(p => Math.min(totalPages, p + 1))}
              >
                Próxima Página
              </button>
            </div>
            <div><LockKeyhole size={14} /> SHA-256: <code>{data.document?.sha256}</code></div>
          </footer>
        </section>

        <aside className={styles.actionPanel}>
          <div className={styles.identityCard}><span><BadgeCheck size={20} /></span><div><small>Destinatário</small><strong>{data.recipient.name}</strong><p>{data.recipient.emailMasked}</p></div></div>

          {completed ? (
            <section className={styles.completedCard}>
              <CheckCircle2 size={34} />
              <h2>Participação concluída</h2>
              <p>Registrada em {formatDate(data.recipient.completedAt)}.</p>
              {data.finalAvailable ? <a href={finalUrl} target="_blank" rel="noopener noreferrer"><Download size={16} /> Baixar documento final</a> : <span>O documento final ficará disponível quando todos concluírem.</span>}
            </section>
          ) : readOnly ? (
            <section className={styles.readOnlyCard}><FileCheck2 size={30} /><h2>Cópia para conhecimento</h2><p>Você pode visualizar e baixar o documento. Nenhuma assinatura é necessária para este convite.</p></section>
          ) : unavailable ? (
            <section className={styles.unavailableCard}><AlertCircle size={30} /><h2>Assinatura indisponível</h2><p>Este envelope foi cancelado ou o convite expirou.</p></section>
          ) : (
            <section className={styles.signingCard}>
              <span className={styles.stepLabel}>Confirmação de identidade</span>
              <h2>{data.recipient.role === "APPROVER" ? "Aprovar documento" : "Assinar documento"}</h2>
              <p>Leia o PDF completo. Em seguida, confirme sua identidade pelo código enviado ao e-mail do convite.</p>

              {otpSent && (
                <div className={styles.stampWarning}>
                  <p>👉 <strong>Posicione sua assinatura:</strong> Arraste o carimbo dourado sobre o documento ao lado para o local onde deseja fixá-lo. Você pode navegar pelas páginas pelos botões abaixo do PDF.</p>
                </div>
              )}

              {!otpSent ? (
                <button type="button" className={styles.primaryButton} onClick={requestOtp} disabled={submitting}>{submitting ? <Loader2 size={17} className={styles.spin} /> : <Mail size={17} />} {submitting ? "Enviando..." : "Enviar código de segurança"}</button>
              ) : (
                <form onSubmit={sign}>
                  <label htmlFor="signature-otp"><span>Código de 6 dígitos</span><div><KeyRound size={17} /><input id="signature-otp" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6} /></div></label>
                  <label className={styles.acceptance}><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /><span>Declaro que li o documento identificado pelo hash acima e concordo em assiná-lo eletronicamente, vinculando minha identidade, data, hora e evidências técnicas a este aceite.</span></label>
                  <button type="submit" className={styles.primaryButton} disabled={submitting || otpCode.length !== 6 || !accepted}>{submitting ? <Loader2 size={17} className={styles.spin} /> : <BadgeCheck size={17} />} {submitting ? "Concluindo..." : data.recipient.role === "APPROVER" ? "Confirmar aprovação" : "Assinar eletronicamente"}</button>
                  <button type="button" className={styles.resendButton} onClick={requestOtp} disabled={submitting}>Reenviar código</button>
                </form>
              )}
            </section>
          )}

          {statusMessage && <div className={styles.successMessage} role="status"><CheckCircle2 size={16} /> {statusMessage}</div>}
          {error && <div className={styles.errorMessage} role="alert"><AlertCircle size={16} /> {error}</div>}

          <dl className={styles.details}>
            <div><dt>Enviado em</dt><dd>{formatDate(data.envelope.sentAt)}</dd></div>
            <div><dt>Expira em</dt><dd>{formatDate(data.envelope.expiresAt)}</dd></div>
            <div><dt>Método</dt><dd>E-mail + código OTP</dd></div>
          </dl>
        </aside>
      </div>

      <footer className={styles.footer}><ShieldCheck size={15} /> O acesso, as tentativas de validação e o aceite são registrados na trilha de evidências.</footer>
    </main>
  );
}
