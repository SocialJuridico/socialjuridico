"use client";

import { useEffect, useRef } from "react";

import styles from "./ParticlesBackground.module.css";

const BG_COLOR = "#1a1a1a";
const COLORS = ["rgba(212, 175, 55, OPACITY)", "rgba(47, 143, 120, OPACITY)"];
const LINK_DISTANCE = 130;
const BASE_PARTICLE_COUNT_PER_PX = 1 / 14000;

function createParticles(width, height) {
  const count = Math.max(
    24,
    Math.min(90, Math.round(width * height * BASE_PARTICLE_COUNT_PER_PX)),
  );

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    radius: 1 + Math.random() * 1.6,
    colorIndex: Math.random() > 0.6 ? 1 : 0,
  }));
}

export default function ParticlesBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles = [];
    let animationFrameId = null;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
    }

    function drawFrame() {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];

        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < LINK_DISTANCE) {
            const opacity = (1 - distance / LINK_DISTANCE) * 0.16;
            ctx.strokeStyle = `rgba(212, 175, 55, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const particle of particles) {
        ctx.beginPath();
        ctx.fillStyle = COLORS[particle.colorIndex].replace(
          "OPACITY",
          "0.55",
        );
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step() {
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      }

      drawFrame();
      animationFrameId = window.requestAnimationFrame(step);
    }

    resize();

    if (prefersReducedMotion) {
      drawFrame();
    } else {
      animationFrameId = window.requestAnimationFrame(step);
    }

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-hidden="true"
    />
  );
}
