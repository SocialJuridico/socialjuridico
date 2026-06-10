import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";

async function countRows(query, resourceName) {
  const result = await query;

  if (result.error) {
    throw new Error(`${resourceName}: ${result.error.message}`);
  }

  return result.count || 0;
}

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
      );
    }

    const { db } = auth;
    const [
      totalClientes,
      totalAdvogados,
      totalCasos,
      totalComunicados,
      totalRadarPendente,
    ] = await Promise.all([
      countRows(
        db.from("clientes").select("id", { count: "exact", head: true }),
        "clientes",
      ),
      countRows(
        db.from("advogados").select("id", { count: "exact", head: true }),
        "advogados",
      ),
      countRows(
        db.from("casos").select("id", { count: "exact", head: true }),
        "casos",
      ),
      countRows(
        db
          .from("notificacoes")
          .select("id", { count: "exact", head: true })
          .eq("tipo", "ADMIN_BROADCAST"),
        "comunicados administrativos",
      ),
      countRows(
        db
          .from("radar_oportunidades")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente"),
        "radar_oportunidades",
      ),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalClientes,
          totalAdvogados,
          totalCasos,
          totalNotificacoes: totalComunicados,
          totalRadarPendente,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[Admin/Stats] Erro:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Não foi possível carregar as métricas administrativas.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
