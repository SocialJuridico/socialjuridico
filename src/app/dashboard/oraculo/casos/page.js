import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import {
  loadAvailableOraculoCases,
  loadMyOraculoClaims,
  loadOraculoClaimCooldown,
} from "@/lib/oraculo/oraculoCases";
import {
  listRadarAcademicCases,
  listRadarAcademicAreas,
  radarAcademicSummary,
} from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";

import CasosClient from "./CasosClient";

export const metadata = { title: "Central de Casos — Oráculo Acadêmico" };

export default async function OraculoCasosPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const canClaim = context.studentStatus === "ATIVO";

  const [available, claims, cooldown, radarCases, radarAreas, radarSummary] =
    await Promise.all([
      loadAvailableOraculoCases(context.oraculoId),
      loadMyOraculoClaims(context.oraculoId),
      loadOraculoClaimCooldown(context.oraculoId),
      listRadarAcademicCases({}),
      listRadarAcademicAreas(),
      radarAcademicSummary(),
    ]);

  return (
    <CasosClient
      available={available}
      claims={claims}
      cooldown={cooldown}
      canClaim={canClaim}
      radarCases={radarCases}
      radarAreas={radarAreas}
      radarSummary={radarSummary}
    />
  );
}
