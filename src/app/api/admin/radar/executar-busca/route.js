import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { runRadarFetch } from "@/lib/radar/runRadarFetch";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  try {
    const auth = await getAuthenticatedAdmin();

    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    console.log(
      `[Radar Admin API] Execução manual iniciada por: ${auth.user.email}`,
    );

    const result = await runRadarFetch();

    if (!result.success) {
      return json(
        {
          success: false,
          message:
            "A busca automática não pôde ser concluída. Verifique os logs do Radar.",
          stats: result.stats,
          timestamp: result.timestamp,
        },
        502,
      );
    }

    return json(result);
  } catch (error) {
    console.error("[Radar Admin API] Erro na execução manual:", error);

    return json(
      {
        success: false,
        message: "Erro interno ao executar a busca automática.",
      },
      500,
    );
  }
}

export async function GET() {
  return json(
    {
      success: false,
      message: "Método não permitido. Utilize POST.",
    },
    405,
  );
}
