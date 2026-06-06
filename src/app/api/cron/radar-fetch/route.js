/**
 * O Radar Jurídico coleta apenas referências a conteúdos públicos e links originais,
 * sem coleta de dados pessoais privados. As oportunidades são salvas como pendentes
 * para curadoria administrativa antes da exibição aos advogados.
 */

import { runRadarFetch } from "@/lib/radar/runRadarFetch";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/cron/radar-fetch
// Executa a busca automatizada de oportunidades públicas externamente via cron agendado
export async function POST(request) {
  try {
    const cronSecret = process.env.RADAR_CRON_SECRET;

    // Se o segredo de cron não estiver configurado no servidor, rejeitar com erro 500 seguro
    if (!cronSecret || cronSecret.trim() === "") {
      console.error("[Radar Cron API] Erro: RADAR_CRON_SECRET não está configurado nas variáveis de ambiente.");
      return NextResponse.json(
        { success: false, message: "Configuração do segredo de cron ausente no servidor" },
        { status: 500 }
      );
    }

    // Validar header de Autorização
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[Radar Cron API] Tentativa de acesso não autorizado bloqueada.");
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    // Executar o robô de busca
    const result = await runRadarFetch();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error("[Radar Cron API] Erro crítico na execução:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Erro interno no servidor",
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// Retorna erro para qualquer outro método HTTP
export async function GET() {
  return NextResponse.json(
    { success: false, message: "Método não permitido. Utilize o método POST." },
    { status: 405 }
  );
}
