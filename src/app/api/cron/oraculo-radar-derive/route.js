import { NextResponse } from "next/server";

import { ensureAcademicCasesFromRadar } from "@/lib/oraculo/radarAcademic/radarAcademicCaseGeneration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/cron/oraculo-radar-derive
// Deriva casos acadêmicos (IA) a partir de oportunidades aprovadas do Radar
// Jurídico. Protegido pelo mesmo segredo de cron do Radar.
export async function POST(request) {
  const cronSecret = process.env.RADAR_CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    return NextResponse.json(
      { success: false, message: "Segredo de cron ausente no servidor." },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, message: "Não autorizado." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 5, 1),
    20,
  );

  try {
    const result = await ensureAcademicCasesFromRadar(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[Oraculo/RadarDerive] Erro:", error);
    return NextResponse.json(
      { success: false, message: "Falha ao derivar casos acadêmicos." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Use POST." },
    { status: 405 },
  );
}
