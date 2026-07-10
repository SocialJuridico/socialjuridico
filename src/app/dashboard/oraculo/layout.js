import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";

import OraculoSidebar from "./OraculoSidebar";
import OraculoLogoutButton from "./OraculoLogoutButton";
import styles from "./OraculoStudentDashboard.module.css";

export const metadata = {
  title: "Dashboard do Oráculo Acadêmico",
};

function initialsFrom(name = "") {
  const parts = name.split(" ").filter(Boolean);
  if (!parts.length) return "OA";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function OraculoStudentLayout({ children }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);

  if (!context) redirect("/oraculoacademico/login");

  const institutionName = context.institutionName || "Instituição de ensino";
  const programName = context.programName || "Sem programa vinculado";
  const studentInitials = initialsFrom(context.studentName);

  return (
    <div className={styles.shell}>
      <OraculoSidebar />

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.context}>
            <span>{context.institutionInitials || studentInitials}</span>
            <div>
              <strong>{institutionName}</strong>
              <small>{programName}</small>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.notificationButton}
              type="button"
              aria-label="Notificações"
            >
              <Bell size={17} aria-hidden="true" />
            </button>
            <div className={styles.profile}>
              <strong>{context.studentName}</strong>
              <small>{context.periodoAtual || "Estudante de Direito"}</small>
            </div>
            <OraculoLogoutButton />
          </div>
        </header>

        {children}
      </section>
    </div>
  );
}
