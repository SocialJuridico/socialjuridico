"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  Mail,
  Lock,
  CheckCircle,
  Download,
  AlertTriangle,
  Eye,
  MapPin,
  Loader2
} from "lucide-react";
import styles from "./Assinatura.module.css";

export default function AssinaturaClient({ signatureId, initialRole }) {
  const [sigData, setSigData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [signingLoading, setSigningLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // PDF.js State Variables
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfRenderLoading, setPdfRenderLoading] = useState(false);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);

  // Signature Coordinates & Placement (percentage coordinates 0.0 to 1.0)
  const [stampPage, setStampPage] = useState(1);
  const [stampX, setStampX] = useState(initialRole === "lawyer" ? 0.08 : 0.52);
  const [stampY, setStampY] = useState(0.82);
  const [isDragging, setIsDragging] = useState(false);

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

  // Fetch signature details from the database
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
        setError(data.message || "Não foi possível carregar os detalhes do documento.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexão ao buscar os dados do documento.");
    } finally {
      setLoading(false);
    }
  };

  // Load PDF Document when details are fetched and PDF.js is loaded
  useEffect(() => {
    if (!pdfLibLoaded || !sigData?.document_url) return;

    let active = true;
    async function loadPdf() {
      setPdfRenderLoading(true);
      try {
        const proxyUrl = `/api/crm/assinatura/proxy-pdf?url=${encodeURIComponent(sigData.document_url)}`;
        const loadingTask = window.pdfjsLib.getDocument(proxyUrl);
        const loadedPdf = await loadingTask.promise;

        if (active) {
          setPdfDoc(loadedPdf);
          setTotalPages(loadedPdf.numPages);
          setStampPage(loadedPdf.numPages); // Default to last page for stamp
        }
      } catch (err) {
        console.error("Error loading PDF via proxy:", err);
      } finally {
        if (active) setPdfRenderLoading(false);
      }
    }

    loadPdf();
    return () => { active = false; };
  }, [pdfLibLoaded, sigData?.document_url]);

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

    // A small timeout ensures the canvas element is fully mounted in the DOM
    const timer = setTimeout(renderPage, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pdfDoc, stampPage]);

  // Handle click on canvas container to place the signature stamp instantly
  const handleSheetClick = (e) => {
    if (isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let pctX = clickX / rect.width;
    let pctY = clickY / rect.height;

    // Center stamp relative to click position, restrict inside boundaries
    setStampX(Math.max(0.01, Math.min(0.99 - 0.44, pctX - 0.22)));
    setStampY(Math.max(0.01, Math.min(0.99 - 0.12, pctY - 0.06)));
  };

  const handleDragStart = (e) => {
    e.preventDefault();
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
      x = Math.max(0.01, Math.min(0.99 - 0.44, x - 0.22));
      y = Math.max(0.01, Math.min(0.99 - 0.12, y - 0.06));

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

  const handleSendOtp = async () => {
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/assinatura/enviar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_id: signatureId, role: initialRole, is_otp_request: true })
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
      } else {
        setError(data.message || "Erro ao enviar o código de confirmação.");
      }
    } catch (err) {
      console.error(err);
      setError("Falha de rede ao disparar o código para o seu e-mail.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSign = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) return;

    setSigningLoading(true);
    setError("");
    try {
      const res = await fetch("/api/crm/assinatura/validar-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_id: signatureId,
          role: initialRole,
          code: otpCode.trim(),
          stamp_page: stampPage,
          stamp_x: stampX,
          stamp_y: stampY
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        fetchSignatureDetails();
      } else {
        setError(data.message || "Código incorreto ou expirado.");
      }
    } catch (err) {
      console.error(err);
      setError("Erro ao processar sua assinatura eletrônica.");
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
    ? typeof sigData.metadata === "string"
      ? JSON.parse(sigData.metadata)
      : sigData.metadata
    : null;
  const currentParty = meta ? meta[initialRole] : null;
  const alreadySigned = currentParty?.signed;

  return (
    <div className={styles.container}>
      {/* Selo e Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.logo}>SJ</div>
        <h1>Portal de Assinatura Eletrônica</h1>
        <p className={styles.subtitle}>
          Ambiente criptografado e seguro com validade jurídica de acordo com a MP nº 2.200-2.
        </p>
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
              Tipo: <strong style={{ textTransform: "capitalize" }}>{sigData.document_type}</strong> | Código: <strong>{sigData.verification_code}</strong>
            </p>
          </div>

          {/* Visualizador de PDF Interativo Real */}
          <div className={styles.pdfViewer} id="pdf-viewer-container" style={{ height: "auto", maxHeight: "720px", overflowY: "auto", overflowX: "hidden" }}>
            {sigData.document_url ? (
              <div 
                id="mock-sheet" 
                className={styles.pdfCanvasContainer}
                onClick={handleSheetClick}
                style={{ position: "relative", width: "100%", margin: "0 auto", display: "block", cursor: "crosshair" }}
              >
                {pdfRenderLoading && (
                  <div className={styles.noPdf} style={{ minHeight: "400px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 className={styles.spin} size={40} color="var(--color-gold)" />
                    <p style={{ marginTop: "12px", color: "rgba(255,255,255,0.6)" }}>Carregando páginas do contrato...</p>
                  </div>
                )}
                
                <canvas id="pdf-canvas" style={{ display: "block", width: "100%", height: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", borderRadius: "12px", background: "#fff" }} />

                {/* Camada do Carimbo Draggable sobre o PDF REAL */}
                {!pdfRenderLoading && !alreadySigned && otpSent && (
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
                    <div className={styles.stampLogo}>SJ</div>
                    <div className={styles.stampTextContainer}>
                      <div className={styles.stampHeader}>ASSINADO DIGITALMENTE</div>
                      <div className={styles.stampSignerName}>
                        {currentParty?.name ? currentParty.name.toUpperCase().substring(0, 18) : "SIGNATÁRIO"}
                      </div>
                      <div className={styles.stampValidationInfo}>Arraste para posicionar</div>
                    </div>
                    <div className={styles.stampTooltip}>Arraste-me no documento! 📄</div>
                  </div>
                )}
              </div>
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
              <p>
                Sua assinatura eletrônica foi validada e estampada no documento com integridade criptográfica.
              </p>

              <div className={styles.signerDetailBox}>
                <p><strong>Nome:</strong> {currentParty?.name}</p>
                <p><strong>E-mail:</strong> {currentParty?.email}</p>
                <p><strong>Assinado em:</strong> {new Date(currentParty?.signed_at || new Date()).toLocaleString("pt-BR")}</p>
                <p><strong>IP Rastreado:</strong> {currentParty?.ip || "Confirmado"}</p>
              </div>

              {sigData.document_url && (
                <a href={sigData.document_url} target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>
                  <Download size={18} /> Baixar PDF Assinado
                </a>
              )}
            </div>
          ) : (
            <div className={styles.actionBlock}>
              <div className={styles.signerIntro}>
                <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "#c5a059", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Signatário Autenticado</p>
                <h3>{currentParty?.name}</h3>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Email: {currentParty?.email}</p>
              </div>

              {error && (
                <div className={styles.errorAlert}>
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {!otpSent ? (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <p className={styles.stepInstructions}>
                    Para assinar, enviaremos um código de segurança de 6 dígitos de validação para o seu e-mail cadastrado acima.
                  </p>
                  <button onClick={handleSendOtp} className={styles.actionBtn} disabled={otpLoading}>
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
                  <p className={styles.stepInstructions}>
                    Insira abaixo o código de 6 dígitos que enviamos para o seu e-mail <strong>{currentParty.email}</strong>:
                  </p>

                  {/* Posicionamento do Carimbo no Documento */}
                  <div className={styles.positionSection}>
                    <div className={styles.positionTitle}>
                      <MapPin size={16} />
                      <span>Posicionar Assinatura</span>
                    </div>

                    <div className={styles.pageSelectorWrapper}>
                      <span className={styles.pageSelectorLabel}>Carimbar na Página:</span>
                      <div className={styles.pageControls}>
                        <button
                          type="button"
                          className={styles.pageButton}
                          onClick={() => setStampPage(Math.max(1, stampPage - 1))}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          value={stampPage}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/\D/g, ""), 10);
                            setStampPage(isNaN(val) ? 1 : Math.max(1, Math.min(totalPages, val)));
                          }}
                          className={styles.pageInput}
                        />
                        <button
                          type="button"
                          className={styles.pageButton}
                          onClick={() => setStampPage(Math.min(totalPages, stampPage + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <p className={styles.dragInstructions} style={{ textAlign: "left", margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
                      👉 O carimbo dourado está posicionado sobre o documento ao lado. <strong>Arraste o carimbo dourado diretamente sobre o PDF</strong> até o local exato da assinatura!
                    </p>
                  </div>

                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input
                      type="text"
                      placeholder="Código de 6 dígitos"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      maxLength={6}
                      className={styles.otpInput}
                    />
                  </div>

                  <button
                    type="submit"
                    className={styles.actionBtn}
                    disabled={signingLoading || otpCode.length < 6}
                    style={{
                      background: "linear-gradient(135deg, #00e676 0%, #00c853 100%)",
                      color: "#fff",
                      boxShadow: "0 4px 15px rgba(0, 230, 118, 0.2)"
                    }}
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
            <span>
              Assinatura eletrônica em total conformidade com a MP 2.200-2/2001 e Lei 14.063/2020.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
