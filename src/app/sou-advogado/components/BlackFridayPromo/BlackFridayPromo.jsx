import Link from "next/link";
import { ArrowRight, CalendarClock, Coins, HandCoins, QrCode, ShieldCheck, Sparkles } from "lucide-react";

import { getLawyerPlan } from "@/lib/billing/catalog";
import { PROMO_INVEST_MAX_PURCHASES, PROMO_INVEST_MIN_CENTS } from "@/lib/billing/promoInvest";
import styles from "./BlackFridayPromo.module.css";

const minPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
  .format(PROMO_INVEST_MIN_CENTS / 100);
const proJuris = getLawyerPlan("PRO").juris;

// Selo do topo da página que leva até a seção da Black Friday.
export function BlackFridayHeroBadge() {
  return (
    <Link prefetch={false} href="#black-friday" className={styles.heroBadge}>
      <span className={styles.heroBadgeTag}>Black Friday</span>
      <span className={styles.heroBadgeText}>Você decide quanto paga pelo Plano PRO</span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

export default function BlackFridayPromo() {
  return (
    <section id="black-friday" className={styles.section} aria-labelledby="black-friday-title">
      <div className={styles.stripe} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index}>Black Friday · Quer Investir Quanto? ·</span>
        ))}
      </div>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            Black Friday Social Jurídico
          </span>

          <h2 id="black-friday-title" className={styles.title}>
            Quer Investir <span>Quanto?</span>
          </h2>

          <p className={styles.subtitle}>
            Nesta Black Friday, quem decide o preço do Plano PRO é você. Escolha
            o valor, pague no Pix e tenha todas as ferramentas profissionais
            liberadas por 30 dias.
          </p>

          <div className={styles.priceTag}>
            <small>Plano PRO a partir de</small>
            <strong>{minPrice}</strong>
            <span>você escolhe o valor</span>
          </div>

          <div className={styles.actions}>
            <Link
              prefetch={false}
              href="/cadastro?perfil=advogado&promo=quer-investir-quanto"
              className={styles.primaryAction}
            >
              <HandCoins size={19} aria-hidden="true" />
              Quero investir meu valor
            </Link>
            <Link prefetch={false} href="/login" className={styles.secondaryAction}>
              Já tenho conta
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <ul className={styles.cards}>
          <li className={styles.card}>
            <span className={styles.cardIcon}><QrCode size={22} aria-hidden="true" /></span>
            <div>
              <h3>Você escolhe o valor</h3>
              <p>Pagamento único via Pix, a partir de {minPrice}. Sem cartão e sem renovação automática.</p>
            </div>
          </li>
          <li className={styles.card}>
            <span className={styles.cardIcon}><Coins size={22} aria-hidden="true" /></span>
            <div>
              <h3>PRO completo + {proJuris} Juris</h3>
              <p>Todas as ferramentas do Plano PRO por 30 dias e {proJuris} Juris direto na sua carteira.</p>
            </div>
          </li>
          <li className={styles.card}>
            <span className={styles.cardIcon}><CalendarClock size={22} aria-hidden="true" /></span>
            <div>
              <h3>Vale por até {PROMO_INVEST_MAX_PURCHASES} meses</h3>
              <p>Use a promoção em até {PROMO_INVEST_MAX_PURCHASES} meses. Do {PROMO_INVEST_MAX_PURCHASES + 1}º mês em diante, vale o valor normal do plano.</p>
            </div>
          </li>
        </ul>
      </div>

      <p className={styles.notice}>
        <ShieldCheck size={16} aria-hidden="true" />
        Pagamento processado pelo Mercado Pago. Promoção para advogados sem plano
        ativo, disponível no menu do painel após o cadastro.
      </p>
    </section>
  );
}
