import { redirect } from "next/navigation";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import StaffShell from "../_staffShared/StaffShell";

export const metadata = { title: "Dashboard do Supervisor Jurídico — Oráculo Acadêmico" };

export default async function SupervisorLayout({ children }) {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  return (
    <StaffShell
      role="ORACULO_SUPERVISOR_JURIDICO"
      homeHref="/dashboard/oraculoacademico/supervisor"
      brandLabel="Supervisor"
      context={context}
    >
      {children}
    </StaffShell>
  );
}
