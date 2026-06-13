"use client";

import Image from "next/image";
import { Building2, Search, Users } from "lucide-react";

import LawyerCard from "./LawyerCard";
import styles from "../ClientDashboard.module.css";

export default function ClientDirectory({ controller }) {
  const specialties = Object.entries(controller.groupedLawyers).sort(([left], [right]) =>
    left.localeCompare(right, "pt-BR"),
  );

  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntroCard}>
        <div>
          <span className={styles.eyebrow}>Diretório jurídico</span>
          <h2>Encontre um profissional para o seu caso</h2>
          <p>
            Consulte especialidades, OAB, avaliações e escritórios vinculados.
            O contato direto está disponível nos perfis habilitados.
          </p>
        </div>
        <span className={styles.counterBadge}>{controller.lawyers.length} perfis</span>
      </section>

      <label className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar por nome ou número da OAB..."
          value={controller.lawyerSearch}
          onChange={(event) => controller.setLawyerSearch(event.target.value)}
        />
      </label>

      {!controller.lawyerSearch && controller.offices.length > 0 && (
        <section className={styles.directorySection}>
          <div className={styles.sectionTitleRow}>
            <div>
              <span className={styles.eyebrow}>Atendimento em equipe</span>
              <h2>Escritórios cadastrados</h2>
            </div>
            <Building2 size={19} aria-hidden="true" />
          </div>

          <div className={styles.officeGrid}>
            {controller.offices.map((office) => (
              <button
                key={office.id}
                type="button"
                className={styles.officeCard}
                onClick={() => controller.openOffice(office)}
              >
                <span className={styles.officeLogo}>
                  {office.logo_url ? (
                    <Image
                      src={office.logo_url}
                      alt={`Logo de ${office.nome}`}
                      width={54}
                      height={54}
                      unoptimized
                    />
                  ) : (
                    String(office.nome || "ES").slice(0, 2).toUpperCase()
                  )}
                </span>
                <span className={styles.officeCardCopy}>
                  <strong>{office.nome}</strong>
                  <small>{office.advogados.length} profissional(is)</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {specialties.length ? (
        specialties.map(([specialty, lawyers]) => {
          const expanded = controller.expandedSpecialties[specialty] === true;
          const visible = expanded ? lawyers : lawyers.slice(0, 6);

          return (
            <section key={specialty} className={styles.directorySection}>
              <div className={styles.sectionTitleRow}>
                <div>
                  <span className={styles.eyebrow}>Especialidade</span>
                  <h2>{specialty}</h2>
                </div>
                <span className={styles.counterBadge}>{lawyers.length}</span>
              </div>

              <div className={styles.lawyerGrid}>
                {visible.map((lawyer) => (
                  <LawyerCard
                    key={lawyer.id}
                    lawyer={lawyer}
                    online={controller.onlineLawyerIds.includes(lawyer.id)}
                    onOpen={controller.openLawyer}
                    onContact={controller.openChatSelector}
                  />
                ))}
              </div>

              {lawyers.length > 6 && (
                <button
                  type="button"
                  className={styles.showMoreButton}
                  onClick={() =>
                    controller.setExpandedSpecialties((current) => ({
                      ...current,
                      [specialty]: !expanded,
                    }))
                  }
                >
                  {expanded ? "Mostrar menos" : `Mostrar mais ${lawyers.length - 6}`}
                </button>
              )}
            </section>
          );
        })
      ) : (
        <div className={styles.largeEmptyState}>
          <Users size={28} aria-hidden="true" />
          <h2>Nenhum profissional encontrado</h2>
          <p>Altere a busca para consultar outros nomes ou números da OAB.</p>
        </div>
      )}
    </div>
  );
}
