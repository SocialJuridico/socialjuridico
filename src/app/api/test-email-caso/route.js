import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { novoCasoTemplate } from "@/lib/emailTemplates";
import { NextResponse } from "next/server";

/**
 * Endpoint de teste para disparar email de novo caso para advogados.
 * Uso: GET /api/test-email-caso?casoId=UUID
 * ⚠️ Remover após testes!
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const casoId = searchParams.get("casoId");

    if (!casoId) {
      return NextResponse.json({ success: false, message: "casoId é obrigatório" }, { status: 400 });
    }

    // 1. Buscar dados do caso
    const { data: caso, error: casoError } = await supabaseAdmin
      .from("casos")
      .select("titulo, area_atuacao, cidade, estado")
      .eq("id", casoId)
      .single();

    if (casoError || !caso) {
      return NextResponse.json({ success: false, message: "Caso não encontrado", error: casoError?.message }, { status: 404 });
    }

    console.log(`📋 Caso encontrado: "${caso.titulo}" - ${caso.area_atuacao} - ${caso.cidade}/${caso.estado}`);

    // 2. Buscar todos os advogados e deduplicar
    const { data: advogados, error: advError } = await supabaseAdmin
      .from("advogados")
      .select("name, email")
      .not("email", "is", null);

    if (advError || !advogados?.length) {
      return NextResponse.json({ success: false, message: "Nenhum advogado encontrado", error: advError?.message }, { status: 404 });
    }

    // Deduplicar emails
    const seenEmails = new Set();
    const uniqueAdvogados = advogados.filter(adv => {
      const email = adv.email?.trim().toLowerCase();
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    console.log(`📧 Enviando email de teste para ${uniqueAdvogados.length} advogado(s) (${advogados.length - uniqueAdvogados.length} duplicados removidos)...`);

    const startTime = Date.now();

    // 3. Enviar emails via Batch API (até 100 por chamada)
    const BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES_MS = 1500;
    const results = [];

    for (let i = 0; i < uniqueAdvogados.length; i += BATCH_SIZE) {
      const batch = uniqueAdvogados.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(uniqueAdvogados.length / BATCH_SIZE);

      const emailPayloads = batch.map((adv) => ({
        from: 'Social Jurídico <contato@socialjuridico.com.br>',
        to: [adv.email.trim()],
        subject: `📍 Nova Oportunidade: ${caso.area_atuacao} em ${caso.cidade}/${caso.estado}`,
        html: novoCasoTemplate({
          titulo: caso.titulo,
          area_atuacao: caso.area_atuacao,
          cidade: caso.cidade,
          estado: caso.estado,
          lawyerName: adv.name || 'Advogado(a)',
        }),
      }));

      try {
        const { data: batchResult, error: batchError } = await resend.batch.send(emailPayloads);

        if (batchError) {
          console.error(`⚠️ Erro no lote ${batchNumber}/${totalBatches}:`, batchError);
          results.push({ batch: batchNumber, count: batch.length, status: 'error', error: batchError });
        } else {
          console.log(`✅ Lote ${batchNumber}/${totalBatches}: ${batch.length} emails enviados`);
          results.push({
            batch: batchNumber,
            count: batch.length,
            status: 'success',
            ids: batchResult?.data?.map(r => r.id) || [],
          });
        }
      } catch (batchErr) {
        console.error(`❌ Falha no lote ${batchNumber}/${totalBatches}:`, batchErr.message);
        results.push({ batch: batchNumber, count: batch.length, status: 'error', error: batchErr.message });
      }

      // Delay entre lotes
      if (i + BATCH_SIZE < uniqueAdvogados.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    const elapsedMs = Date.now() - startTime;
    const totalEnviados = results.filter(r => r.status === 'success').reduce((sum, r) => sum + r.count, 0);

    console.log(`✅ Teste finalizado em ${(elapsedMs / 1000).toFixed(1)}s — ${totalEnviados} emails enviados`);

    return NextResponse.json({
      success: true,
      caso,
      totalAdvogados: advogados.length,
      emailsUnicos: uniqueAdvogados.length,
      duplicadosRemovidos: advogados.length - uniqueAdvogados.length,
      enviados: totalEnviados,
      tempoSegundos: (elapsedMs / 1000).toFixed(1),
      lotes: results,
    });

  } catch (error) {
    console.error("❌ Erro no teste de email:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
