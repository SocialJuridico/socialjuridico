"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileWarning,
  Loader2,
  Maximize2,
  Minimize2,
  Presentation,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import viewerStyles from "./PresentationFrame.module.css";
import {
  PRESENTATION_ZOOM_STEP,
  clampPresentationPage,
  clampPresentationZoom,
  createPresentationFileName,
} from "./presentationViewerUtils";

export default function PresentationFrame({ documentSlug }) {
  const viewerRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const pdfDocumentRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [downloadUrl, setDownloadUrl] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [stageWidth, setStageWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect?.width || 0);
      if (width > 0) setStageWidth(width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === viewerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    let loadingTask = null;
    let mounted = true;

    setLoading(true);
    setError("");
    setPageNumber(1);
    setPageCount(0);
    setZoom(1);
    setDownloadUrl("");

    async function loadPresentation() {
      try {
        const response = await fetch(
          `/api/advogado/documentacao-slide?slug=${encodeURIComponent(documentSlug)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.message || "Não foi possível recuperar o PDF da apresentação.",
          );
        }

        const contentType = String(response.headers.get("content-type") || "")
          .toLowerCase();
        if (!contentType.includes("application/pdf")) {
          throw new Error("O arquivo retornado não é um PDF válido.");
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!arrayBuffer.byteLength) {
          throw new Error("O PDF da apresentação está vazio.");
        }

        const pdfBytes = new Uint8Array(arrayBuffer);
        const downloadBytes = pdfBytes.slice();
        objectUrl = URL.createObjectURL(
          new Blob([downloadBytes], { type: "application/pdf" }),
        );

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({
          data: pdfBytes,
          isEvalSupported: false,
          useWorkerFetch: false,
        });
        const pdfDocument = await loadingTask.promise;

        if (!mounted) {
          await pdfDocument.destroy();
          return;
        }

        pdfDocumentRef.current = pdfDocument;
        setDownloadUrl(objectUrl);
        setPageCount(pdfDocument.numPages);
      } catch (requestError) {
        if (requestError?.name === "AbortError") return;
        if (mounted) {
          setError(
            requestError?.message || "Não foi possível abrir a apresentação.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPresentation();

    return () => {
      mounted = false;
      controller.abort();
      renderTaskRef.current?.cancel?.();
      const pdfDocument = pdfDocumentRef.current;
      pdfDocumentRef.current = null;
      if (pdfDocument) {
        void pdfDocument.destroy();
      } else {
        void loadingTask?.destroy?.();
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentSlug]);

  useEffect(() => {
    const pdfDocument = pdfDocumentRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!pdfDocument || !canvas || !stage || !pageCount) return undefined;

    let active = true;
    setRendering(true);
    renderTaskRef.current?.cancel?.();

    async function renderPage() {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          320,
          (stageWidth || stage.clientWidth || baseViewport.width) - 32,
        );
        const fitScale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({
          scale: Math.min(3, Math.max(0.5, fitScale * zoom)),
        });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas indisponível para renderização.");

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        context.save();
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.restore();

        const renderTask = page.render({
          canvasContext: context,
          viewport,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (renderError) {
        if (renderError?.name !== "RenderingCancelledException" && active) {
          setError(
            renderError?.message || "Não foi possível renderizar este slide.",
          );
        }
      } finally {
        if (active) setRendering(false);
      }
    }

    void renderPage();
    return () => {
      active = false;
      renderTaskRef.current?.cancel?.();
    };
  }, [pageCount, pageNumber, stageWidth, zoom]);

  const changePage = useCallback(
    (nextPage) => {
      setPageNumber(clampPresentationPage(nextPage, pageCount));
    },
    [pageCount],
  );

  const handleViewerKeyDown = useCallback(
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "ArrowLeft") changePage(pageNumber - 1);
      if (event.key === "ArrowRight") changePage(pageNumber + 1);
      if (event.key === "Home") changePage(1);
      if (event.key === "End") changePage(pageCount);
    },
    [changePage, pageCount, pageNumber],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewerRef.current?.requestFullscreen?.();
      }
    } catch {
      setError("Não foi possível alterar o modo de tela cheia.");
    }
  }, []);

  if (error) {
    return (
      <div className={viewerStyles.error} role="alert">
        <FileWarning size={26} aria-hidden="true" />
        <div>
          <h3>Não foi possível carregar a apresentação</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <section
      className={viewerStyles.viewer}
      ref={viewerRef}
      tabIndex={0}
      onKeyDown={handleViewerKeyDown}
      aria-label="Visualizador da apresentação"
    >
      <header className={viewerStyles.toolbar}>
        <div className={viewerStyles.identity}>
          <span className={viewerStyles.icon}>
            <Presentation size={17} aria-hidden="true" />
          </span>
          <div>
            <strong>Apresentação oficial</strong>
            <small>
              {pageCount ? `Slide ${pageNumber} de ${pageCount}` : "Carregando arquivo"}
            </small>
          </div>
        </div>

        <div className={viewerStyles.controls}>
          <button
            type="button"
            onClick={() => changePage(pageNumber - 1)}
            disabled={loading || pageNumber <= 1}
            aria-label="Slide anterior"
            title="Slide anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => changePage(pageNumber + 1)}
            disabled={loading || pageNumber >= pageCount}
            aria-label="Próximo slide"
            title="Próximo slide"
          >
            <ChevronRight size={18} />
          </button>
          <span className={viewerStyles.divider} aria-hidden="true" />
          <button
            type="button"
            onClick={() =>
              setZoom((value) =>
                clampPresentationZoom(value - PRESENTATION_ZOOM_STEP),
              )
            }
            disabled={loading || zoom <= 0.75}
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={loading || zoom === 1}
            aria-label="Restaurar zoom"
            title="Restaurar zoom"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              setZoom((value) =>
                clampPresentationZoom(value + PRESENTATION_ZOOM_STEP),
              )
            }
            disabled={loading || zoom >= 2}
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <ZoomIn size={17} />
          </button>
          <span className={viewerStyles.divider} aria-hidden="true" />
          <button
            type="button"
            onClick={toggleFullscreen}
            disabled={loading}
            aria-label={fullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"}
            title={fullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"}
          >
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={createPresentationFileName(documentSlug)}
              aria-label="Baixar apresentação em PDF"
              title="Baixar apresentação em PDF"
            >
              <Download size={17} />
            </a>
          )}
        </div>
      </header>

      <div className={viewerStyles.stage} ref={stageRef}>
        <canvas
          ref={canvasRef}
          className={viewerStyles.canvas}
          aria-label={`Slide ${pageNumber} de ${pageCount || 1}`}
        />
        {(loading || rendering) && (
          <div className={viewerStyles.overlay} aria-live="polite">
            <Loader2 size={26} className={viewerStyles.spin} aria-hidden="true" />
            <span>{loading ? "Preparando apresentação..." : "Renderizando slide..."}</span>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <footer className={viewerStyles.footer}>
          <button
            type="button"
            onClick={() => changePage(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <label>
            <span className={viewerStyles.visuallyHidden}>Selecionar slide</span>
            <input
              type="range"
              min="1"
              max={pageCount}
              value={pageNumber}
              onChange={(event) => changePage(event.target.value)}
              aria-label={`Slide ${pageNumber} de ${pageCount}`}
            />
          </label>
          <button
            type="button"
            onClick={() => changePage(pageNumber + 1)}
            disabled={pageNumber >= pageCount}
          >
            Próximo
            <ChevronRight size={16} />
          </button>
        </footer>
      )}
    </section>
  );
}
