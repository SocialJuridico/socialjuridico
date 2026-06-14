"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  FileDown,
  Fingerprint,
  Loader2,
  MapPin,
  MonitorCheck,
  ShieldCheck,
} from "lucide-react";

import LawyerDashboardShell from "../../../components/LawyerDashboardShell";
import { downloadNotificationCertificate } from "../../notificationCertificate";
import styles from "./NotificationPreview.module.css";

function formatDate(value) {
  if (!value) return "Não registrado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function StatusBadge({ status }) {
  if (status === "lido") {
    return (
      <span className={`${styles.status} ${styles.read}`}>
        <CheckCircle2 size={13} aria-hidden="true" /> Ciência registrada
      </span>
    );
  }
  if (status === "erro_envio") {
    return (
      <span className={`${styles.status} ${styles.error}`}>
        <AlertTriangle size={13} aria-hidden="true" /> Falha no envio
      </span>
    );
  }
  return (
    <span className={`${styles.status} ${styles.pending}`}>
      <Clock3 size={13} aria-hidden="true" /> Aguardando ciência
    </span>
  );
}

export default function NotificationPreviewDashboard({ notificationId }) {
  const router = useRouter();
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/advogado/notificacaoextrajudicial/${notificationId}`,
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent(`/dashboard/advogado/notificacaoextrajudicial/preview/${notificationId}`)}`,
        );
        return;
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar a notificação.");
      }
      setNotification(data.data);
    } catch (loadError) {
      setError(loadError.message || "Não foi possível carregar a notificação.");
    } finally {
      setLoading(false);
    }
  }, [notificationId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyTrackingLink = useCallback(async () => {
    if (!notification?.trackingUrl) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${notification.trackingUrl}`,
      );
      toast.success("Link rastreável copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }, [notification]);

  const generateCertificate = useCallback(async () => {
    if (!notification || generating) return;
    setGenerating(true);
    try {
      await downloadNotificationCertificate(notification);
      toast.success("Certificado de rastreabilidade gerado.");
    } catch (certificateError) {
      toast.error(
        certificateError.message || "Não foi possível gerar o certificado.",
      );
    } finally {
      setGenerating(false);
    }
  }, [generating, notification]);

  return (
    <LawyerDashboardShell
      activeRoute="notificacaoextrajudicial"
      title="Visualização da Notificação"
      subtitle="Prévia interna sem registrar ciência do destinatário"
      icon={MonitorCheck}
    >
      <div className={styles.page}>
        <div className={styles.toolbar}>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard/advogado/notificacaoextrajudicial")
            }
          >
            <ArrowLeft size={15} aria-hidden="true" /> Voltar ao painel
          </button>

          {notification && (
            <div className={styles.toolbarActions}>
              <button type="button" onClick={copyTrackingLink}>
                <Copy size={14} aria-hidden="true" /> Copiar link
              </button>
              <a href={notification.documentUrl}>
                <Download size={14} aria-hidden="true" /> Baixar original
              </a>
              <button
                type="button"
                onClick={generateCertificate}
                disabled={generating || !notification.hash}
              >
                {generating ? (
                  <Loader2
                    size={14}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                ) : (
                  <FileDown size={14} aria-hidden="true" />
                )}
                Certificado
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className={styles.state}>
            <Loader2 size={30} className={styles.spinner} aria-hidden="true" />
            <strong>Carregando visualização segura...</strong>
            <span>
              Esta prévia não altera o status nem registra uma leitura do
              destinatário.
            </span>
          </div>
        ) : error ? (
          <div className={styles.state}>
            <AlertTriangle size={30} aria-hidden="true" />
            <strong>Não foi possível abrir a notificação</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : (
          notification && (
            <>
              <section className={styles.summary}>
                <div>
                  <span className={styles.eyebrow}>
                    <BellRing size={14} aria-hidden="true" /> Visualização interna
                    protegida
                  </span>
                  <h1>{notification.fileName}</h1>
                  <p>
                    Protocolo {notification.protocol} · enviado para{" "}
                    {notification.recipientEmail}
                  </p>
                </div>
                <StatusBadge status={notification.status} />
              </section>

              <div className={styles.content}>
                <section className={styles.viewer}>
                  <iframe
                    src={`/api/advogado/notificacaoextrajudicial/${notification.id}/arquivo?preview=1#toolbar=0`}
                    title={`Prévia de ${notification.fileName}`}
                  />
                </section>

                <aside className={styles.evidence}>
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <ShieldCheck size={17} aria-hidden="true" />
                      <strong>Registro do envio</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Protocolo</small>
                      <strong>{notification.protocol}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Responsável</small>
                      <strong>{notification.lawyerName}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Destinatário</small>
                      <strong>{notification.recipientEmail}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Enviado em</small>
                      <strong>{formatDate(notification.createdAt)}</strong>
                    </div>
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <MapPin size={17} aria-hidden="true" />
                      <strong>Evidências de ciência</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Primeira leitura</small>
                      <strong>{formatDate(notification.readAt)}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>IP registrado</small>
                      <strong>{notification.readIp || "Não registrado"}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Geolocalização</small>
                      <strong>{notification.readGeo || "Não autorizada"}</strong>
                    </div>
                    <div className={styles.field}>
                      <small>Navegador</small>
                      <strong>
                        {notification.readUserAgent || "Não registrado"}
                      </strong>
                    </div>
                  </section>

                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <Fingerprint size={17} aria-hidden="true" />
                      <strong>Integridade SHA-512</strong>
                    </div>
                    <div className={`${styles.field} ${styles.hash}`}>
                      <code>{notification.hash || "Hash indisponível"}</code>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )
        )}
      </div>
    </LawyerDashboardShell>
  );
}
