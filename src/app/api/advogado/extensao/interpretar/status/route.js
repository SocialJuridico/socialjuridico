import { NextResponse } from "next/server";

import { requireInterpretarAccess, serializeAccess } from "@/lib/extensaoInterpretarAccess";

// GET /api/advogado/extensao/interpretar/status — autenticado (Bearer).
// Usado pela extensão pra saber se o módulo de IA está liberado e quanta cota resta.
export async function GET(request) {
  try {
    const access = await requireInterpretarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
    }

    return NextResponse.json({ success: true, data: serializeAccess(access) });
  } catch (error) {
    console.error("Erro na API GET /api/advogado/extensao/interpretar/status:", error);
    return NextResponse.json({ success: false, message: "Não foi possível carregar o status." }, { status: 500 });
  }
}
