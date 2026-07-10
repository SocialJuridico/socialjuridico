import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { deriveAcademicIfApproved } from "@/lib/oraculo/radarAcademic/radarAcademicCaseGeneration";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export async function POST(_request, { params }) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return json({ success: false, message: auth.message }, auth.status);
    }

    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço administrativo indisponível." },
        503,
      );
    }

    const { id } = await params;
    if (!isValidUuid(id)) {
      return json({ success: false, message: "ID inválido." }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({
        status: "aprovado",
        publicado_em: new Date().toISOString(),
        aprovado_por: auth.user.id,
        rejeitado_motivo: null,
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao aprovar oportunidade: ${error.message}`);
    }

    if (!data) {
      return json({ success: false, message: "Oportunidade não encontrada." }, 404);
    }

    // A MESMA aprovação que publica o Radar Jurídico deriva o caso do Radar
    // Acadêmico (não-fatal).
    const academicDerived = await deriveAcademicIfApproved(data);

    return json({
      success: true,
      data,
      academicDerived,
      message: academicDerived
        ? "Oportunidade aprovada e caso acadêmico derivado."
        : "Oportunidade aprovada e publicada.",
    });
  } catch (error) {
    console.error("[Admin/Radar/:id/aprovar][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível aprovar a oportunidade." },
      500,
    );
  }
}
