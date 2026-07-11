import { redirect, notFound } from "next/navigation";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import { getSupervisorAlert } from "@/lib/oraculo/staff/supervisorAlerts";
import AlertReviewClient from "./AlertReviewClient";

export const metadata = { title: "Revisar Alerta — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function SupervisorAlertaPage({ params }) {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const detail = await getSupervisorAlert({ authUserId: context.authUserId, id });
  if (!detail) notFound();

  return <AlertReviewClient id={id} initialAlert={detail.alert} student={detail.student} />;
}
