import { Star } from "lucide-react";
import styles from "../Pesquisas.module.css";

export default function SurveyStars({ value = 0, size = 16 }) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));

  return (
    <span className={styles.stars} aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? "#d4af37" : "transparent"}
          color={star <= rating ? "#d4af37" : "rgba(255,255,255,0.2)"}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
