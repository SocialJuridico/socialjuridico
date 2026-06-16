"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  Share2,
  Sparkles,
  Star,
  Youtube,
} from "lucide-react";
import toast from "react-hot-toast";

import styles from "./PublicDigitalCard.module.css";

const CUSTOM_ICONS = {
  link: LinkIcon,
  calendar: CalendarDays,
  briefcase: BriefcaseBusiness,
  book: BookOpen,
  file: FileText,
  globe: Globe2,
  message: MessageCircle,
  scale: Scale,
  star: Star,
};

function initials(name) {
  return String(name || "Advogado")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function PublicDigitalCard({ card }) {
  const [sharing, setSharing] = useState(false);
  const endpoint = `/api/cartao/${encodeURIComponent(card.slug)}/evento`;

  function record(eventType, linkKey = null, source = "PUBLIC_CARD") {
    const payload = JSON.stringify({ eventType, linkKey, source });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([payload], { type: "application/json" }));
        return;
      }
    } catch {
      // Alguns navegadores bloqueiam sendBeacon; o fetch keepalive abaixo é o fallback.
    }
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => null);
  }

  useEffect(() => {
    record("VIEW", null, "PUBLIC_CARD_LOAD");
    // A visualização é deduplicada no servidor por cartão, visitante e minuto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.slug]);

  const links = useMemo(() => {
    const result = [];
    if (card.whatsapp) {
      result.push({
        key: "whatsapp",
        title: "Falar no WhatsApp",
        subtitle: "Atendimento direto",
        href: `https://wa.me/${card.whatsapp}?text=${encodeURIComponent(`Olá, ${card.displayName}. Encontrei seu cartão digital no Social Jurídico.`)}`,
        icon: MessageCircle,
        featured: true,
      });
    }
    if (card.phone && card.showPhone) {
      result.push({
        key: "phone",
        title: "Ligar agora",
        subtitle: `+${card.phone}`,
        href: `tel:+${card.phone}`,
        icon: Phone,
      });
    }
    if (card.publicEmail && card.showEmail) {
      result.push({
        key: "email",
        title: "Enviar e-mail",
        subtitle: card.publicEmail,
        href: `mailto:${card.publicEmail}`,
        icon: Mail,
      });
    }
    if (card.website) {
      result.push({
        key: "website",
        title: "Acessar site profissional",
        subtitle: new URL(card.website).hostname,
        href: card.website,
        icon: Globe2,
      });
    }
    for (const item of card.customLinks || []) {
      if (item.enabled === false) continue;
      result.push({
        key: `custom:${item.key}`,
        title: item.title,
        subtitle: new URL(item.url).hostname,
        href: item.url,
        icon: CUSTOM_ICONS[item.icon] || LinkIcon,
      });
    }
    return result;
  }, [card]);

  const hasLegalNotificationLink = useMemo(
    () =>
      links.some((link) => {
        const searchable = `${link.title || ""} ${link.subtitle || ""} ${link.href || ""}`.toLowerCase();
        return searchable.includes("notificacao") || searchable.includes("notificação");
      }),
    [links],
  );

  async function shareCard() {
    setSharing(true);
    try {
      record("SHARE", null, navigator.share ? "WEB_SHARE" : "COPY_LINK");
      if (navigator.share) {
        await navigator.share({
          title: card.displayName,
          text: `${card.displayName} — ${card.headline}`,
          url: card.publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(card.publicUrl);
        toast.success("Link do cartão copiado.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Não foi possível compartilhar o cartão.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <main
      className={`${styles.page} ${styles[`theme_${card.theme}`]} ${styles[`background_${card.backgroundStyle}`]}`}
      style={{ "--card-accent": card.accentColor }}
    >
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />

      <section className={styles.card} aria-label={`Cartão digital de ${card.displayName}`}>
        <div className={styles.topActions}>
          <button type="button" onClick={shareCard} disabled={sharing} aria-label="Compartilhar cartão">
            <Share2 size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(card.publicUrl);
              record("SHARE", null, "COPY_LINK");
              toast.success("Link copiado.");
            }}
            aria-label="Copiar link"
          >
            <Copy size={17} aria-hidden="true" />
          </button>
        </div>

        <header className={styles.profileHeader}>
          <div className={styles.avatarRing}>
            {card.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.avatarUrl} alt={card.displayName} className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback}>{initials(card.displayName)}</span>
            )}
          </div>
          <div className={styles.identity}>
            <div className={styles.nameRow}>
              <h1>{card.displayName}</h1>
              {card.profile.verified && <BadgeCheck size={19} aria-label="OAB verificada" />}
            </div>
            <p className={styles.headline}>{card.headline}</p>
            <div className={styles.credentials}>
              {card.profile.oab && (
                <span><Scale size={13} aria-hidden="true" /> OAB {card.profile.estado} {card.profile.oab}</span>
              )}
              {card.showLocation && card.location && (
                <span><MapPin size={13} aria-hidden="true" /> {card.location}</span>
              )}
            </div>
          </div>
        </header>

        {card.bio && <p className={styles.bio}>{card.bio}</p>}

        {card.showRating && card.profile.totalRatings > 0 && (
          <div className={styles.rating}>
            <Star size={15} fill="currentColor" aria-hidden="true" />
            <strong>{card.profile.rating.toFixed(1)}</strong>
            <span>{card.profile.totalRatings} avaliação{card.profile.totalRatings === 1 ? "" : "ões"}</span>
          </div>
        )}

        <div className={styles.linkStack}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.key}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className={`${styles.actionLink} ${link.featured ? styles.featuredLink : ""}`}
                onClick={() => record("CLICK", link.key, "PUBLIC_CARD_LINK")}
              >
                <span className={styles.actionIcon}><Icon size={19} aria-hidden="true" /></span>
                <span className={styles.actionCopy}><strong>{link.title}</strong><small>{link.subtitle}</small></span>
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            );
          })}
        </div>

        <div className={styles.socials} aria-label="Redes sociais">
          {card.instagram && <a href={card.instagram} target="_blank" rel="noopener noreferrer" onClick={() => record("CLICK", "instagram")} aria-label="Instagram"><Instagram size={20} /></a>}
          {card.linkedin && <a href={card.linkedin} target="_blank" rel="noopener noreferrer" onClick={() => record("CLICK", "linkedin")} aria-label="LinkedIn"><Linkedin size={20} /></a>}
          {card.youtube && <a href={card.youtube} target="_blank" rel="noopener noreferrer" onClick={() => record("CLICK", "youtube")} aria-label="YouTube"><Youtube size={21} /></a>}
          {card.website && <a href={card.website} target="_blank" rel="noopener noreferrer" onClick={() => record("CLICK", "website")} aria-label="Website"><Globe2 size={20} /></a>}
        </div>

        <a className={styles.saveContact} href={`/api/cartao/${encodeURIComponent(card.slug)}/vcard`}>
          <Download size={17} aria-hidden="true" /> Salvar contato no celular
        </a>

        <div className={styles.privacyNotice}>
          <strong>Privacidade e finalidade</strong>
          <p>
            {hasLegalNotificationLink
              ? "Ao abrir este cartão ou acessar links de notificação extrajudicial, dados técnicos como IP, navegador e horário podem ser registrados para segurança, rastreabilidade e finalidade estritamente de citação jurídica."
              : "Ao visualizar ou interagir com este cartão, a plataforma registra dados técnicos mínimos, como IP tratado em hash, navegador e horário, para segurança, métricas agregadas e prevenção de abuso."}
          </p>
          <span>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>
            <a href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</a>
          </span>
        </div>

        {card.showBrand && (
          <footer className={styles.brandFooter}>
            <a href="https://www.socialjuridico.com.br" target="_blank" rel="noopener noreferrer">
              <Sparkles size={13} aria-hidden="true" /> Criado no Social Jurídico
            </a>
          </footer>
        )}
      </section>
    </main>
  );
}
