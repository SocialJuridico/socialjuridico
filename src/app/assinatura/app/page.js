import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileSignature,
  QrCode,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabaseServer";
import SignatureLogoutButton from "./SignatureLogoutButton";
import styles from "./app.module.css";

const planLabels = {
  FREE: "Gratuito",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Negócios",
  UNLIMITED: "Ilimitado",
};

export default async function SignatureAppPage() {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();

  const { data: account } = await supabase
    .from("signature_accounts")
    .select("full_name")
    .eq("user_id", authData.user.id)
    .single();

  const { data: membership } = await supabase
    .from("signature_organization_members")
    .select("organization_id")
    .eq("user_id", authData.user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .single();

  const [{ data: organization }, { data: subscription }, { data: usage }] = await Promise.all([
    supabase
      .from("signature_organizations")
      .select("name")
      .eq("id", membership.organization_id)
      .single(),
    supabase
      .from("signature_subscriptions")
      .select("plan_code, documents_limit, certificates_limit, current_period_end")
      .eq("organization_id", membership.organization_id)
      .single(),
    supabase
      .from("signature_usage_periods")
      .select("documents_used, certificates_used")
      .eq("organization_id", membership.organization_id)
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const documentsUsed = usage?.documents_used || 0;
  const documentsLimit = subscription?.documents_limit;
  const remaining = documentsLimit === null ? null : Math.max(0, (documentsLimit || 0) - documentsUsed);
  const progress = documentsLimit ? Math.min(100, (documentsUsed / documentsLimit) * 100) : 0;

  return (
    <div className={styles.appShell}>
      <header className={styles.appHeader}>
        <Link href="/assinatura" className={styles.brand}>
          <span><Scale size={22} /></span>
          <strong>Social Jurídico</strong>
          <small>Assinatura</small>
        </Link>
        <nav aria-label="Navegação da plataforma">
          <Link href="/assinatura/app" className={styles.activeNav}>Visão geral</Link>
          <span>Documentos</span>
          <span>Validação</span>
        </nav>
        <div className={styles.headerActions}>
          <span className={styles.planPill}>{planLabels[subscription?.plan_code] || "Gratuito"}</span>
          <SignatureLogoutButton />
        </div>
      </header>

      <main className={styles.appMain}>
        <div className={styles.pageHeading}>
          <div>
            <span>{organization?.name || "Minha organização"}</span>
            <h1>Olá, {account?.full_name?.split(" ")[0] || "cliente"}.</h1>
            <p>Acompanhe suas assinaturas e o consumo do plano neste mês.</p>
          </div>
          <button type="button" className={styles.primaryAction} disabled title="Disponível na próxima etapa">
            <FilePlus2 size={18} /> Novo documento
          </button>
        </div>

        <section className={styles.summaryGrid} aria-label="Resumo da conta">
          <article className={styles.usageCard}>
            <div className={styles.cardTop}><span><FileSignature size={19} /> Documentos do mês</span><strong>{documentsUsed}/{documentsLimit ?? "∞"}</strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
            <p>{remaining === null ? "Uso ilimitado no plano atual." : `${remaining} documento${remaining === 1 ? "" : "s"} disponível${remaining === 1 ? "" : "is"}.`}</p>
          </article>
          <article>
            <span className={styles.metricIcon}><ShieldCheck size={20} /></span>
            <strong>{usage?.certificates_used || 0}</strong>
            <p>Certificados utilizados</p>
          </article>
          <article>
            <span className={styles.metricIcon}><Clock3 size={20} /></span>
            <strong>0</strong>
            <p>Aguardando assinatura</p>
          </article>
          <article>
            <span className={styles.metricIcon}><BadgeCheck size={20} /></span>
            <strong>0</strong>
            <p>Documentos concluídos</p>
          </article>
        </section>

        <section className={styles.emptyWorkspace}>
          <div className={styles.emptyIcon}><FileCheck2 size={30} /></div>
          <h2>Seu espaço de assinaturas está pronto.</h2>
          <p>Na próxima etapa, conectaremos aqui o envio de documentos, os signatários e a cadeia de custódia compartilhada com o módulo jurídico.</p>
          <div className={styles.emptyActions}>
            <Link href="/validar"><QrCode size={17} /> Validar documento</Link>
            <Link href="/assinatura#planos">Conhecer planos <ArrowRight size={17} /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

