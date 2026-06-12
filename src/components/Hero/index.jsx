import "server-only";

import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Radar,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

import { supabase, supabaseAdmin } from "@/lib/supabase";
import styles from "./Hero.module.css";
import TrackedLink from "../TrackedLink";

async function getStats() {
  try {
    const client = supabaseAdmin || supabase;
    const approvedCutoff = new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const [clientesRes, advogadosRes, casosRes, radarRes] = await Promise.all([
      client.from("clientes").select("id", { count: "exact", head: true }),

      client.from("advogados").select("id", { count: "exact", head: true }),

      client
        .from("casos")
        .select("id", { count: "exact", head: true })
        .eq("status", "ABERTO"),

      client
        .from("radar_oportunidades")
        .select("id", { count: "exact", head: true })
        .eq("status", "aprovado")
        .gt("publicado_em", approvedCutoff)
        .lt("cliques_count", 5),
    ]);

    if (clientesRes.error) {
      console.error(
        "[Hero] Erro ao contar clientes:",
        clientesRes.error.message,
      );
    }

    if (advogadosRes.error) {
      console.error(
        "[Hero] Erro ao contar advogados:",
        advogadosRes.error.message,
      );
    }

    if (casosRes.error) {
      console.error("[Hero] Erro ao contar casos:", casosRes.error.message);
    }

    if (radarRes.error) {
      console.error(
        "[Hero] Erro ao contar oportunidades do Radar:",
        radarRes.error.message,
      );
    }

    return {
      totalClientes: clientesRes.error ? null : clientesRes.count,
      totalAdvogados: advogadosRes.error ? null : advogadosRes.count,
      totalCasos: casosRes.error ? null : casosRes.count,
      totalRadar: radarRes.error ? null : radarRes.count,
    };
  } catch (error) {
    console.error("[Hero] Erro ao buscar estatísticas:", error);

    return {
      totalClientes: null,
      totalAdvogados: null,
      totalCasos: null,
      totalRadar: null,
    };
  }
}

function formatGrowthCount(value) {
  const count = Number(value);

  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  if (count >= 1000) {
    return `${Math.floor(count / 100) * 100}+`;
  }

  if (count >= 100) {
    return `${Math.floor(count / 10) * 10}+`;
  }

  if (count >= 10) {
    return `${Math.floor(count / 10) * 10}+`;
  }

  return `${count}+`;
}

export default async function Hero() {
  const stats = await getStats();

  const statItems = [
    {
      key: "clientes",
      value: formatGrowthCount(stats.totalClientes),
      desktopLabel: "Clientes cadastrados",
      mobileLabel: "Clientes",
      icon: Users,
    },
    {
      key: "advogados",
      value: formatGrowthCount(stats.totalAdvogados),
      desktopLabel: "Advogados na plataforma",
      mobileLabel: "Advogados",
      icon: Scale,
    },
    {
      key: "casos",
      value: formatGrowthCount(stats.totalCasos),
      desktopLabel: "Casos abertos agora",
      mobileLabel: "Casos abertos",
      icon: BriefcaseBusiness,
    },
    {
      key: "radar",
      value: formatGrowthCount(stats.totalRadar),
      desktopLabel: "Oportunidades no Radar",
      mobileLabel: "Radar Jurídico",
      icon: Radar,
    },
  ].filter((item) => item.value !== null);

  return (
    <section id="inicio" className={styles.heroSection}>
      <div className={styles.backgroundGlow} aria-hidden="true" />

      <div className={styles.content}>
        <h1 className={styles.title}>
          Encontre o advogado certo
          <span className={styles.highlight}> para o seu caso.</span>
        </h1>

        <p className={styles.subtitle}>
          Publique seu caso gratuitamente e receba o interesse de advogados
          cadastrados na plataforma. Conte o que aconteceu por texto, áudio ou
          vídeo.
        </p>

        <div className={styles.ctaWrapper}>
          <TrackedLink
            href="/cadastro"
            event="hero_client_cta_click"
            properties={{
              placement: "hero_primary",
              destination: "/cadastro",
              variant: "default",
            }}
            className={styles.primaryButton}
          >
            Publicar meu caso gratuitamente
            <ArrowRight size={20} aria-hidden="true" />
          </TrackedLink>

          <TrackedLink
            href="/sou-advogado"
            event="hero_lawyer_cta_click"
            properties={{
              placement: "hero_secondary",
              destination: "/sou-advogado",
              variant: "default",
            }}
            className={styles.secondaryButton}
          >
            Sou advogado
          </TrackedLink>
        </div>

        <div className={styles.trustRow}>
          <span className={styles.trustItem}>
            <BadgeCheck size={16} aria-hidden="true" />
            Gratuito para clientes
          </span>

          <span className={styles.trustDivider} aria-hidden="true" />

          <span className={styles.trustItem}>
            <ShieldCheck size={16} aria-hidden="true" />
            Comunicação segura
          </span>
        </div>

        {statItems.length > 0 && (
          <div
            className={styles.statsBar}
            aria-label="Números do Social Jurídico"
          >
            {statItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <div key={item.key} className={styles.statGroup}>
                  {index > 0 && (
                    <div className={styles.statDivider} aria-hidden="true" />
                  )}

                  <div className={styles.statItem}>
                    <div className={styles.statIconWrapper}>
                      <Icon
                        size={20}
                        className={styles.statIcon}
                        aria-hidden="true"
                      />
                    </div>

                    <div className={styles.statTexts}>
                      <strong className={styles.statNumber}>
                        {item.value}
                      </strong>

                      <span className={styles.statLabel}>
                        <span className={styles.desktopLabel}>
                          {item.desktopLabel}
                        </span>

                        <span className={styles.mobileLabel}>
                          {item.mobileLabel}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
