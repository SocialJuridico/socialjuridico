"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import styles from "./ScrollToTop.module.css";

const VISIBILITY_THRESHOLD = 500;

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setIsVisible(window.scrollY > VISIBILITY_THRESHOLD);
    }

    updateVisibility();

    window.addEventListener("scroll", updateVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`${styles.scrollToTopButton} ${
        isVisible ? styles.visible : ""
      }`}
      aria-label="Voltar ao topo da página"
      title="Voltar ao topo"
    >
      <ArrowUp size={21} strokeWidth={2.3} aria-hidden="true" />
    </button>
  );
}