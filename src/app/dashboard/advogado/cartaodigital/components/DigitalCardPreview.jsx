"use client";

import {
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
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
  Star,
  Youtube,
} from "lucide-react";

import styles from "../DigitalCard.module.css";

const ICONS = {
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

export default function DigitalCardPreview({ card }) {
  if (!card) return null;
  const links = [];
  if (card.whatsapp) links.push({ key: "whatsapp", label: "Falar no WhatsApp", detail: "Atendimento direto", icon: MessageCircle, featured: true });
  if (card.phone && card.showPhone) links.push({ key: "phone", label: "Ligar agora", detail: `+${card.phone}`, icon: Phone });
  if (card.publicEmail && card.showEmail) links.push({ key: "email", label: "Enviar e-mail", detail: card.publicEmail, icon: Mail });
  if (card.website) links.push({ key: "website", label: "Acessar site profissional", detail: card.website, icon: Globe2 });
  for (const link of card.customLinks || []) {
    if (link.enabled === false || !link.title) continue;
    links.push({ key: link.key, label: link.title, detail: link.url || "Configure a URL", icon: ICONS[link.icon] || LinkIcon });
  }

  return (
    <div
      className={`${styles.previewCanvas} ${styles[`previewTheme_${card.theme}`]} ${styles[`previewBackground_${card.backgroundStyle}`]}`}
      style={{ "--preview-accent": card.accentColor }}
    >
      <div className={styles.previewAmbientOne} aria-hidden="true" />
      <div className={styles.previewAmbientTwo} aria-hidden="true" />
      <article className={styles.previewCard}>
        <header className={styles.previewProfile}>
          <div className={styles.previewAvatarRing}>
            {card.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.avatarUrl} alt="" className={styles.previewAvatar} />
            ) : (
              <span className={styles.previewAvatarFallback}>{initials(card.displayName)}</span>
            )}
          </div>
          <div className={styles.previewNameRow}>
            <h3>{card.displayName || "Seu nome profissional"}</h3>
            {card.profile?.verified && <BadgeCheck size={17} aria-label="OAB verificada" />}
          </div>
          <p className={styles.previewHeadline}>{card.headline || "Seu posicionamento profissional aparecerá aqui"}</p>
          <div className={styles.previewCredentials}>
            {card.profile?.oab && <span><Scale size={11} /> OAB {card.profile.estado} {card.profile.oab}</span>}
            {card.showLocation && card.location && <span><MapPin size={11} /> {card.location}</span>}
          </div>
        </header>

        {card.bio && <p className={styles.previewBio}>{card.bio}</p>}
        {card.showRating && card.profile?.totalRatings > 0 && (
          <div className={styles.previewRating}>
            <Star size={12} fill="currentColor" /> {Number(card.profile.rating || 0).toFixed(1)}
            <span>{card.profile.totalRatings} avaliações</span>
          </div>
        )}

        <div className={styles.previewLinks}>
          {links.slice(0, 7).map((link) => {
            const Icon = link.icon;
            return (
              <div key={link.key} className={`${styles.previewLink} ${link.featured ? styles.previewLinkFeatured : ""}`}>
                <span><Icon size={16} /></span>
                <div><strong>{link.label}</strong><small>{link.detail}</small></div>
                <ExternalLink size={12} />
              </div>
            );
          })}
        </div>

        <div className={styles.previewSocials}>
          {card.instagram && <span><Instagram size={17} /></span>}
          {card.linkedin && <span><Linkedin size={17} /></span>}
          {card.youtube && <span><Youtube size={18} /></span>}
          {card.website && <span><Globe2 size={17} /></span>}
        </div>
        {card.showBrand && <footer className={styles.previewBrand}>Criado no Social Jurídico</footer>}
      </article>
    </div>
  );
}
