"use client";

import {
  AlertTriangle,
  Coins,
  FileKey2,
  Fingerprint,
  HardDrive,
  Link2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

import styles from "../../smartdoc/SmartDoc.module.css";
import extras from "../DocumentProtectionExtras.module.css";

function formatStorage(value) {
  const mb = Number(value || 0);
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb >= 10240 ? 0 : 1)} GB`;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

export default function ProtectionOverview({ metrics, openUpload, plan, usage }) {
  return (
    <>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" /> Proteção documental
          </span>
          <h1>
            Integridade registrada com <span>SHA-512.</span>
          </h1>
          <p>
            Validação real do arquivo, download autenticado e auditoria sem URL
            pública, seguindo a mesma experiência visual do SmartDoc.
          </p>
        </div>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={openUpload}
        >
          <UploadCloud size={17} aria-hidden="true" /> Nova blindagem
        </button>
      </section>

      {metrics.legacy > 0 && (
        <section className={extras.legacyAlert} role="status">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>{metrics.legacy} registro(s) do módulo antigo</strong>
            <span>
              O acervo histórico está disponível na aba Legado, com acesso ao
              arquivo e emissão do certificado técnico de blindagem.
            </span>
          </div>
        </section>
      )}

      <section className={styles.overview} aria-label="Resumo da blindagem">
        <article className={styles.storageCard}>
          <div className={styles.storageHeader}>
            <span>
              <HardDrive size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Armazenamento do plano {plan.type}</small>
              <strong>
                {formatStorage(usage.usedStorageMb)} de{" "}
                {formatStorage(usage.storageLimitMb)}
              </strong>
            </div>
          </div>
          <div className={styles.storageTrack} aria-hidden="true">
            <span
              style={{ width: `${Math.min(100, usage.percentage || 0)}%` }}
            />
          </div>
          <p>{formatStorage(usage.remainingStorageMb)} disponíveis.</p>
        </article>

        <article className={styles.metricCard}>
          <span>
            <FileKey2 size={18} aria-hidden="true" />
          </span>
          <div>
            <small>Blindados</small>
            <strong>{metrics.protected || 0}</strong>
            <p>documentos com hash</p>
          </div>
        </article>

        <article className={styles.metricCard}>
          <span>
            <Link2 size={18} aria-hidden="true" />
          </span>
          <div>
            <small>Vinculados</small>
            <strong>{metrics.linked || 0}</strong>
            <p>associados ao CRM</p>
          </div>
        </article>

        <article className={styles.metricCard}>
          <span>
            <Coins size={18} aria-hidden="true" />
          </span>
          <div>
            <small>Custo</small>
            <strong>
              {plan.type === "START"
                ? `${plan.protectCost || 3} Juris`
                : "Incluída"}
            </strong>
            <p>
              {plan.type === "START"
                ? `saldo atual: ${plan.balance || 0}`
                : `plano ${plan.type}`}
            </p>
          </div>
        </article>

        <article className={styles.metricCard}>
          <span>
            <Fingerprint size={18} aria-hidden="true" />
          </span>
          <div>
            <small>Integridade</small>
            <strong>SHA-512</strong>
            <p>calculado no backend</p>
          </div>
        </article>
      </section>
    </>
  );
}
