import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Siren } from "lucide-react";

import { supabaseAdmin } from "@/lib/supabase";
import { DEFAULT_PUBLIC_APP_ORIGIN } from "@/lib/publicAppOrigin";
import {
  getIntentTier,
  INTENT_TIER_LABELS,
} from "@/lib/clientDashboard/caseIntentQuestions";
import { PRIORITY_LABELS } from "@/lib/clientDashboard/caseClassification";

import styles from "./PublicOpportunity.module.css";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadPublicCase(id) {
  if (!supabaseAdmin || !UUID_RE.test(String(id || ""))) return null;

  const { data } = await supabaseAdmin
    .from("casos")
    .select(
      "id, area_atuacao, cidade, estado, status, advogado_id, prioridade, is_emergencia, intencao_fechamento, created_at, public_share_description",
    )
    .eq("id", id)
    .maybeSingle();

  return data || null;
}

function isAvailable(caseItem) {
  return (
    !caseItem.advogado_id &&
    ["ABERTO", "NEGOCIANDO"].includes(String(caseItem.status || "").toUpperCase())
  );
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const caseItem = await loadPublicCase(id);

  if (!caseItem) {
    return { title: "Oportunidade — Social Jurídico" };
  }

  const local = [caseItem.cidade, caseItem.estado].filter(Boolean).join("/");
  const title = `${caseItem.area_atuacao || "Caso jurídico"}${local ? ` em ${local}` : ""} — Social Jurídico`;
  const description =
    caseItem.public_share_description ||
    "Nova oportunidade jurídica disponível na plataforma Social Jurídico.";

  // metadataBase fixo no domínio real garante que a og:image gerada pelo
  // arquivo opengraph-image.jsx (com width/height automáticos) seja uma URL
  // absoluta de produção — crawlers de redes sociais nunca resolvem localhost.
  // NÃO definimos openGraph.images/twitter.images aqui de propósito: o arquivo
  // opengraph-image.jsx já injeta a tag com dimensões; duplicar quebraria o
  // preview (Facebook ignora og:image sem width/height).
  return {
    metadataBase: new URL(DEFAULT_PUBLIC_APP_ORIGIN),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/oportunidades/${id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PublicOpportunityPage({ params }) {
  const { id } = await params;
  const caseItem = await loadPublicCase(id);

  if (!caseItem) notFound();

  const available = isAvailable(caseItem);
  const tier = getIntentTier(caseItem.intencao_fechamento);
  const local = [caseItem.cidade, caseItem.estado].filter(Boolean).join(" - ");
  const loginHref = "/login?redirectTo=/dashboard/advogado/oportunidade";

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.brand}>Social Jurídico</span>

        <div className={styles.badges}>
          {caseItem.is_emergencia && (
            <span className={`${styles.badge} ${styles.badgeEmergency}`}>
              <Siren size={12} aria-hidden="true" /> Emergência
            </span>
          )}
          {caseItem.prioridade && caseItem.prioridade !== "NORMAL" && (
            <span className={styles.badge}>
              {PRIORITY_LABELS[caseItem.prioridade] || caseItem.prioridade}
            </span>
          )}
          <span className={styles.badge}>{INTENT_TIER_LABELS[tier]}</span>
          <span className={styles.badgeArea}>
            {caseItem.area_atuacao || "Direito Geral"}
          </span>
        </div>

        <h1>{caseItem.area_atuacao || "Nova oportunidade jurídica"}</h1>

        {local && (
          <span className={styles.location}>
            <MapPin size={14} aria-hidden="true" /> {local}
          </span>
        )}

        <p className={styles.description}>
          {caseItem.public_share_description ||
            "Nova oportunidade jurídica disponível na plataforma Social Jurídico."}
        </p>

        {available ? (
          <>
            <Link href={loginHref} className={styles.cta}>
              Entrar para ver detalhes e manifestar interesse
            </Link>
            <p className={styles.hint}>
              Ainda não tem conta? O login também permite se cadastrar como
              advogado na plataforma.
            </p>
          </>
        ) : (
          <>
            <div className={styles.unavailable}>
              <ShieldCheck size={16} aria-hidden="true" />
              Este caso já foi assumido por outro profissional.
            </div>
            <Link href={loginHref} className={styles.cta}>
              Ver outras oportunidades disponíveis
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
