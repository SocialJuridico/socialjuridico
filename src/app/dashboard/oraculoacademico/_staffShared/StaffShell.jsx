import { Bell } from "lucide-react";

import StaffSidebar from "./StaffSidebar";
import StaffLogoutButton from "./StaffLogoutButton";
import styles from "../../oraculo/OraculoStudentDashboard.module.css";

function initialsFrom(name = "") {
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "OA";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default function StaffShell({ role, homeHref, brandLabel, context, children }) {
  return (
    <div className={styles.shell}>
      <StaffSidebar role={role} homeHref={homeHref} brandLabel={brandLabel} />

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.context}>
            <span>{initialsFrom(context.name)}</span>
            <div>
              <strong>{context.name}</strong>
              <small>{context.cargo || brandLabel}</small>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.notificationButton} type="button" aria-label="Notificações">
              <Bell size={17} aria-hidden="true" />
            </button>
            <StaffLogoutButton />
          </div>
        </header>

        {children}
      </section>
    </div>
  );
}
