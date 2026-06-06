import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Auxiliar para verificar se o usuário atual é admin
async function checkAdmin(supabase) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { errorStatus: 401, message: "Não autorizado" };
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id, role")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (adminError || !admin) {
    return { errorStatus: 403, message: "Acesso restrito a administradores" };
  }

  return { user, admin };
}

// PATCH /api/admin/radar/:id
// Permite editar campos de uma oportunidade pública pelo ID.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "ID é obrigatório" }, { status: 400 });
    }

    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus }
      );
    }

    const body = await request.json();
    const updateData = {};

    // Campos permitidos para atualização
    const allowedFields = [
      "titulo",
      "categoria",
      "fonte",
      "url_original",
      "trecho_publico",
      "cidade",
      "estado",
      "score_intencao",
      "urgencia",
      "resumo_ia",
      "status",
      "aprovado_por",
      "rejeitado_motivo",
      "reportado"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "Nenhum campo para atualizar informado" }, { status: 400 });
    }

    // Validações
    if (updateData.url_original !== undefined) {
      try {
        new URL(updateData.url_original);
      } catch {
        return NextResponse.json({ success: false, message: "A URL original é inválida" }, { status: 400 });
      }
    }

    if (updateData.trecho_publico !== undefined && updateData.trecho_publico !== null) {
      if (updateData.trecho_publico.length > 500) {
        return NextResponse.json(
          { success: false, message: "O trecho público não pode exceder 500 caracteres" },
          { status: 400 }
        );
      }
    }

    if (updateData.score_intencao !== undefined) {
      const parsedScore = parseInt(updateData.score_intencao);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return NextResponse.json({ success: false, message: "O score de intenção deve ser entre 0 e 100" }, { status: 400 });
      }
      updateData.score_intencao = parsedScore;
    }

    if (updateData.urgencia !== undefined) {
      const urgency = String(updateData.urgencia).toLowerCase();
      if (!["baixa", "media", "alta"].includes(urgency)) {
        return NextResponse.json({ success: false, message: "A urgência deve ser 'baixa', 'media' ou 'alta'" }, { status: 400 });
      }
      updateData.urgencia = urgency;
    }

    if (updateData.status !== undefined) {
      const status = String(updateData.status).toLowerCase();
      if (!["pendente", "aprovado", "rejeitado", "arquivado"].includes(status)) {
        return NextResponse.json({ success: false, message: "Status inválido" }, { status: 400 });
      }
      updateData.status = status;
      
      // Se status mudou para aprovado, define publicado_em
      if (status === "aprovado") {
        updateData.publicado_em = new Date().toISOString();
        updateData.aprovado_por = adminCheck.user.id;
      }
    }

    if (updateData.url_original) {
      let fType = "Outros";
      const urlLower = updateData.url_original.toLowerCase();
      if (urlLower.includes("facebook.com")) fType = "Facebook";
      else if (urlLower.includes("instagram.com")) fType = "Instagram";
      else if (urlLower.includes("x.com") || urlLower.includes("twitter.com")) fType = "X";
      else if (urlLower.includes("reddit.com")) fType = "Reddit";
      else if (urlLower.includes("jusbrasil.com")) fType = "JusBrasil";
      else if (updateData.fonte) fType = mapearFonteTipo(updateData.fonte);
      updateData.fonte_tipo = fType;
    } else if (updateData.fonte) {
      updateData.fonte_tipo = mapearFonteTipo(updateData.fonte);
    }

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json(
          { success: false, message: "Esta URL original já está cadastrada.", isDuplicate: true },
          { status: 409 }
        );
      }
      console.error(`Erro admin radar PATCH id=${id}:`, error.message);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log(`[Radar Admin] Oportunidade editada: ${id}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro geral na API PATCH /api/admin/radar/:id:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}

function mapearFonteTipo(fonte) {
  if (!fonte) return "Outros";
  const f = fonte.toLowerCase().trim();
  if (f.includes("facebook")) return "Facebook";
  if (f.includes("google")) return "Google";
  if (f.includes("reddit")) return "Reddit";
  if (f.includes("twitter") || f === "x") return "X";
  if (f.includes("instagram")) return "Instagram";
  if (f.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}
