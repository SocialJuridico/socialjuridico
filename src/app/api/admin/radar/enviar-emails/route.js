import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { radarLoteCasosTemplate } from "@/lib/emailTemplates";

export const dynamic = "force-dynamic";

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

function getApprovedCutoff() {
  return new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus },
      );
    }

    const { count, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id", { count: "exact", head: true })
      .eq("status", "aprovado")
      .gt("publicado_em", getApprovedCutoff())
      .eq("email_enviado", false);

    if (error) {
      console.error(
        "Erro ao obter contagem de e-mails de radar pendentes:",
        error.message,
      );
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, count: count || 0 });
  } catch (error) {
    console.error("Erro geral na API GET /api/admin/radar/enviar-emails:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json(
        { success: false, message: adminCheck.message },
        { status: adminCheck.errorStatus },
      );
    }

    const { data: oportunidades, error: opError } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id, titulo, categoria, cidade, estado, score_intencao")
      .eq("status", "aprovado")
      .gt("publicado_em", getApprovedCutoff())
      .eq("email_enviado", false);

    if (opError) {
      console.error(
        "Erro ao buscar oportunidades para envio de e-mail:",
        opError.message,
      );
      return NextResponse.json(
        { success: false, message: opError.message },
        { status: 500 },
      );
    }

    if (!oportunidades || oportunidades.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nenhuma oportunidade aprovada pendente de envio.",
        },
        { status: 400 },
      );
    }

    const { data: advogados, error: advError } = await supabaseAdmin
      .from("advogados")
      .select("name, email")
      .not("email", "is", null);

    if (advError) {
      console.error(
        "Erro ao buscar advogados para envio de e-mail:",
        advError.message,
      );
      return NextResponse.json(
        { success: false, message: advError.message },
        { status: 500 },
      );
    }

    if (!advogados || advogados.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Nenhum advogado cadastrado com e-mail válido.",
        },
        { status: 400 },
      );
    }

    const seenEmails = new Set();
    const uniqueAdvogados = advogados.filter((advogado) => {
      const email = advogado.email?.trim().toLowerCase();
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    console.log(
      `[Radar Lote Email] Iniciando disparo para ${uniqueAdvogados.length} advogados com ${oportunidades.length} casos.`,
    );

    const BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES_MS = 1500;

    for (let index = 0; index < uniqueAdvogados.length; index += BATCH_SIZE) {
      const batch = uniqueAdvogados.slice(index, index + BATCH_SIZE);
      const emailPayloads = batch.map((advogado) => ({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: [advogado.email.trim()],
        subject: `⚖️ ${oportunidades.length} Novo${oportunidades.length > 1 ? "s" : ""} Caso${oportunidades.length > 1 ? "s" : ""} no Radar do Social Jurídico`,
        html: radarLoteCasosTemplate({
          oportunidades,
          lawyerName: advogado.name || "Advogado(a)",
        }),
      }));

      try {
        const { error: batchError } = await resend.batch.send(emailPayloads);
        if (batchError) {
          console.error("[Radar Lote Email] Erro no lote:", batchError);
        }
      } catch (batchError) {
        console.error(
          "[Radar Lote Email] Falha no lote:",
          batchError.message,
        );
      }

      if (index + BATCH_SIZE < uniqueAdvogados.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS),
        );
      }
    }

    const opportunityIds = oportunidades.map((opportunity) => opportunity.id);
    const { error: updateError } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({ email_enviado: true })
      .in("id", opportunityIds);

    if (updateError) {
      console.error(
        "[Radar Lote Email] Erro ao marcar oportunidades como enviadas:",
        updateError.message,
      );
    }

    return NextResponse.json({
      success: true,
      totalOportunidades: oportunidades.length,
      totalAdvogados: uniqueAdvogados.length,
    });
  } catch (error) {
    console.error("Erro geral na API POST /api/admin/radar/enviar-emails:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
