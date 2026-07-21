import { NextResponse } from "next/server";

import { requireInterpretarAccess } from "@/lib/extensaoInterpretarAccess";
import { listInterpretarConsultas } from "@/lib/extensaoInterpretarLog";

// GET /api/advogado/extensao/interpretar/historico — autenticado (Bearer).
// Últimas consultas do advogado (transparência). Reusa a autenticação do módulo.
export async function GET(request) {
  try {
    const access = await requireInterpretarAccess(request);
    if (!access.ok) {
      return NextResponse.json({ success: false, code: access.code, message: access.message }, { status: access.status });
    }

    const consultas = await listInterpretarConsultas(access.profile.id);
    return NextResponse.json({ success: true, data: { consultas } });
  } catch (error) {
    console.error("Erro na API GET /api/advogado/extensao/interpretar/historico:", error);
    return NextResponse.json({ success: false, message: "Não foi possível carregar o histórico." }, { status: 500 });
  }
}
