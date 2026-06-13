"use client";

import Image from "next/image";
import {
  Briefcase,
  CheckCircle2,
  Lock,
  MessageSquare,
  Sparkles,
  Star,
} from "lucide-react";

import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";
import styles from "../ClientDashboard.module.css";

export default function LawyerCard({ lawyer, online, onOpen, onContact }) {
  const initials = String(lawyer.name || "Advogado")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();

  return (
    <article
      className={`${styles.lawyerCard} ${
        lawyer.is_premium ? styles.lawyerCardPro : ""
      }`}
    >
      <button
        type="button"
        className={styles.lawyerMainButton}
        onClick={() => onOpen(lawyer)}
        aria-label={`Abrir perfil de ${lawyer.name}`}
      >
        <div className={styles.lawyerCardTop}>
          <span className={styles.presenceBadge}>
            <span
              className={online ? styles.onlineDot : styles.offlineDot}
              aria-hidden="true"
            />
            {online ? "Online" : "Offline"}
          </span>
          {lawyer.is_premium && (
            <span className={styles.proBadge}>
              <Sparkles size={11} aria-hidden="true" /> PRO
            </span>
          )}
        </div>

        <div className={styles.lawyerAvatarWrap}>
          {lawyer.avatar ? (
            <Image
              src={lawyer.avatar}
              alt={`Foto de ${lawyer.name}`}
              width={76}
              height={76}
              className={styles.lawyerAvatar}
              unoptimized
            />
          ) : (
            <span className={styles.lawyerAvatarFallback}>{initials}</span>
          )}
          {lawyer.oab_verification_status === "VERIFIED" && (
            <span className={styles.verifiedBadgeWrap}>
              <VerifiedBadge size={45} />
            </span>
          )}
        </div>

        <div className={styles.lawyerIdentity}>
          <h3>{lawyer.name}</h3>
          <p>{lawyer.oab ? `OAB ${lawyer.oab}` : "OAB em verificação"}</p>
          {lawyer.nome_escritorio && (
            <span className={styles.officeTag}>
              <Briefcase size={12} aria-hidden="true" />
              {lawyer.nome_escritorio}
            </span>
          )}
        </div>

        <p className={styles.lawyerSpecialties}>
          {lawyer.specialties || "Atuação jurídica geral"}
        </p>

        <div className={styles.lawyerStats}>
          <span>
            <Star size={13} aria-hidden="true" />
            <strong>{Number(lawyer.avg_rating || 0).toFixed(1)}</strong>
            {lawyer.total_ratings ? ` (${lawyer.total_ratings})` : ""}
          </span>
          <span>
            <CheckCircle2 size={13} aria-hidden="true" />
            {lawyer.consulta === "Paga" ? "Consulta paga" : "Contato inicial"}
          </span>
        </div>
      </button>

      <button
        type="button"
        className={
          lawyer.is_premium
            ? styles.contactLawyerButton
            : styles.contactLawyerButtonDisabled
        }
        onClick={() => lawyer.is_premium && onContact(lawyer)}
        disabled={!lawyer.is_premium}
      >
        {lawyer.is_premium ? (
          <>
            <MessageSquare size={14} aria-hidden="true" />
            Falar com o advogado
          </>
        ) : (
          <>
            <Lock size={13} aria-hidden="true" />
            Contato direto indisponível
          </>
        )}
      </button>
    </article>
  );
}
