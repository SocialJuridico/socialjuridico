import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import styles from "../AdminDashboard.module.css";

function CardContent({
  icon: Icon,
  title,
  value,
  tone = "default",
  highlighted = false,
}) {
  const classes = [
    styles.dashboardCard,
    styles[`cardTone_${tone}`],
    highlighted
      ? styles.dashboardCardHighlighted
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className={styles.dashboardCardTop}>
        <span
          className={
            styles.dashboardCardIcon
          }
        >
          <Icon
            size={18}
            aria-hidden="true"
          />
        </span>

        <ArrowUpRight
          size={16}
          className={
            styles.dashboardCardArrow
          }
          aria-hidden="true"
        />
      </div>

      <div
        className={
          styles.dashboardCardContent
        }
      >
        <h3>{title}</h3>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export default function AdminDashboardCard({
  href,
  onClick,
  disabled = false,
  ...contentProps
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={styles.dashboardCardLink}
      >
        <CardContent {...contentProps} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={
        styles.dashboardCardButton
      }
      onClick={onClick}
      disabled={disabled}
    >
      <CardContent {...contentProps} />
    </button>
  );
}