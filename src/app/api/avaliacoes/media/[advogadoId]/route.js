import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/avaliacoes/media/[advogadoId]
// Retorna apenas a média e total — informação pública (sem dados de quem avaliou)
export async function GET(request, { params }) {
  try {
    const { advogadoId } = await params;

    if (!advogadoId) {
      return NextResponse.json(
        { success: false, message: "advogadoId é obrigatório" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("avaliacoes_advogado")
      .select("nota")
      .eq("advogado_id", advogadoId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: { media: null, total: 0 },
      });
    }

    const total = data.length;
    const soma = data.reduce((acc, a) => acc + (a.nota || 0), 0);
    const media = parseFloat((soma / total).toFixed(1));

    return NextResponse.json({
      success: true,
      data: { media, total },
    });
  } catch (error) {
    console.error("Erro ao calcular média:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno" },
      { status: 500 }
    );
  }
}
