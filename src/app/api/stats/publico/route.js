import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/stats/publico — sem autenticação, apenas contagens públicas
export async function GET() {
  try {
    const [clientesRes, advRes] = await Promise.all([
      supabaseAdmin.from("clientes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("advogados").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalClientes: clientesRes.count || 0,
          totalAdvogados: advRes.count || 0,
        },
      },
      {
        headers: {
          // Cache de 5 minutos no CDN, 1 min stale-while-revalidate
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Erro na API GET /api/stats/publico:", error);
    return NextResponse.json(
      { success: false, data: { totalClientes: 0, totalAdvogados: 0 } },
      { status: 500 }
    );
  }
}
