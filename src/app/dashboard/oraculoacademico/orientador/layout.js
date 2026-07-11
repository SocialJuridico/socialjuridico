import { redirect } from "next/navigation";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import StaffShell from "../_staffShared/StaffShell";

export const metadata = { title: "Dashboard do Professor Orientador — Oráculo Acadêmico" };

export default async function OrientadorLayout({ children }) {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  return (
    <StaffShell
      role="ORACULO_PROFESSOR_ORIENTADOR"
      homeHref="/dashboard/oraculoacademico/orientador"
      brandLabel="Orientador"
      context={context}
    >
      {children}
    </StaffShell>
  );
}
