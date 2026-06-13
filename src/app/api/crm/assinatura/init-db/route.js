import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Inicialização por endpoint foi desativada. Aplique as migrations versionadas do projeto.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
