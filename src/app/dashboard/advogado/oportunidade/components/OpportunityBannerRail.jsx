"use client";

import { Expand } from "lucide-react";
import { useCallback, useState } from "react";

import styles from "../Oportunidade.module.css";
import OpportunityBannerModal from "./OpportunityBannerModal";
import railStyles from "./OpportunityBannerRail.module.css";

export default function OpportunityBannerRail({ banners, loading, side }) {
  const [selectedBanner, setSelectedBanner] = useState(null);
  const closeModal = useCallback(() => setSelectedBanner(null), []);

  if (loading && banners.length === 0) {
    return (
      <aside className={styles.bannerRail} aria-label={`Publicidade ${side}`}>
        <div className={styles.bannerPlaceholder} aria-hidden="true" />
        <div className={styles.bannerPlaceholder} aria-hidden="true" />
      </aside>
    );
  }

  return (
    <>
      <aside className={styles.bannerRail} aria-label={`Publicidade ${side}`}>
        {banners.slice(0, 3).map((banner) => (
          <button
            key={banner.id}
            type="button"
            className={`${styles.bannerButton} ${railStyles.interactiveBanner}`}
            onClick={() => setSelectedBanner(banner)}
            aria-label={`Ampliar banner: ${
              banner.alt_text || banner.name || "Banner"
            }`}
            aria-haspopup="dialog"
          >
            <img
              src={banner.image_url}
              alt={banner.alt_text || banner.name || "Banner"}
              loading="lazy"
            />
            <span className={railStyles.expandHint} aria-hidden="true">
              <Expand size={13} />
              Ampliar
            </span>
          </button>
        ))}
      </aside>

      <OpportunityBannerModal banner={selectedBanner} onClose={closeModal} />
    </>
  );
}
