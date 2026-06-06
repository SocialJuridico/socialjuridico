import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { radarCasoTemplate } from "@/lib/emailTemplates";

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

// POST /api/admin/radar/:id/aprovar
// Aprova a oportunidade pública, mudando status para 'aprovado' e definindo publicado_em = now()
export async function POST(request, { params }) {
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

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .update({
        status: "aprovado",
        publicado_em: new Date().toISOString(),
        aprovado_por: adminCheck.user.id,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Erro ao aprovar oportunidade ${id}:`, error.message);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    console.log(`[Radar Admin] Oportunidade APROVADA: ${id} por ${adminCheck.user.id}`);

    // 📧 DISPARAR EMAILS PARA TODOS OS ADVOGADOS VIA RESEND (BATCH API)
    try {
      const { data: advogados, error: advError } = await supabaseAdmin
        .from("advogados")
        .select("name, email, estado")
        .not("email", "is", null);

      if (!advError && advogados && advogados.length > 0) {
        // Deduplicar emails
        const seenEmails = new Set();
        const uniqueAdvogados = advogados.filter((adv) => {
          const email = adv.email?.trim().toLowerCase();
          if (!email || seenEmails.has(email)) return false;
          seenEmails.add(email);
          return true;
        });

        console.log(
          `[Radar Email] Enviando e-mail de novo caso do radar para ${uniqueAdvogados.length} advogados...`
        );

        // Usar Resend Batch API: até 100 emails por chamada, com delay de 1.5s entre lotes
        const BATCH_SIZE = 100;
        const DELAY_BETWEEN_BATCHES_MS = 1500;

        for (let i = 0; i < uniqueAdvogados.length; i += BATCH_SIZE) {
          const batch = uniqueAdvogados.slice(i, i + BATCH_SIZE);

          const emailPayloads = batch.map((adv) => ({
            from: "Social Jurídico <contato@socialjuridico.com.br>",
            to: [adv.email.trim()],
            subject: `📡 Novo Caso no Radar: Categoria ${data.categoria || 'Geral'} em ${data.cidade || 'Brasil'}/${data.estado || 'Nacional'}`,
            html: radarCasoTemplate({
              titulo: data.titulo,
              categoria: data.categoria,
              cidade: data.cidade,
              estado: data.estado,
              score_intencao: data.score_intencao || 0,
              lawyerName: adv.name || "Advogado(a)",
            }),
          }));

          try {
            const { error: batchError } = await resend.batch.send(emailPayloads);
            if (batchError) {
              console.error(`[Radar Email] Erro no lote:`, batchError);
            }
          } catch (batchErr) {
            console.error(`[Radar Email] Falha no lote:`, batchErr.message);
          }

          if (i + BATCH_SIZE < uniqueAdvogados.length) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
          }
        }
        console.log(`[Radar Email] Todos os emails do radar foram enviados.`);
      }
    } catch (emailErr) {
      console.error(
        "[Radar Email] Erro ao enviar emails do radar (não-fatal):",
        emailErr.message
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Erro geral na API POST /api/admin/radar/:id/aprovar:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
