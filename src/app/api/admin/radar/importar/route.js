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
    return { isAuthorized: false };
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("id, role")
    .eq("id", user.id)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (adminError || !admin) {
    return { isAuthorized: false };
  }

  return { isAuthorized: true };
}

// POST /api/admin/radar/importar
// Importa um array de oportunidades estruturadas em formato JSON
export async function POST(request) {
  try {
    // 1. Verificação de autorização (Chave secreta ou Admin autenticado)
    const secretKey = process.env.RADAR_IMPORT_SECRET;
    const requestSecret = request.headers.get("x-radar-secret");
    
    let authorized = false;

    if (secretKey && requestSecret === secretKey) {
      authorized = true;
    } else {
      const supabase = createClient();
      const adminCheck = await checkAdmin(supabase);
      if (adminCheck.isAuthorized) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];

    let importadas = 0;
    let ignoradas = 0;
    let erros = 0;
    const validationErrorsDetails = [];

    console.log(`[Radar Import] Iniciando importação de ${items.length} itens...`);

    for (const item of items) {
      const {
        titulo,
        categoria,
        fonte,
        url_original,
        trecho_publico,
        cidade,
        estado,
        score_intencao,
        urgencia,
        resumo_ia,
      } = item || {};

      // 1. Validações básicas
      if (!titulo?.trim() || !categoria?.trim() || !fonte?.trim() || !url_original?.trim()) {
        erros++;
        validationErrorsDetails.push(`Item sem campos obrigatórios: ${titulo || 'Sem título'}`);
        continue;
      }

      // Validação da URL
      try {
        new URL(url_original);
      } catch {
        erros++;
        validationErrorsDetails.push(`URL inválida: ${url_original}`);
        continue;
      }

      // Validação de urgência
      const urgency = String(urgency || "media").toLowerCase().trim();
      if (!["baixa", "media", "alta"].includes(urgency)) {
        erros++;
        validationErrorsDetails.push(`Urgência inválida '${urgency}' para ${url_original}`);
        continue;
      }

      // Validação de score
      const score = score_intencao !== undefined ? parseInt(score_intencao) : 50;
      if (isNaN(score) || score < 0 || score > 100) {
        erros++;
        validationErrorsDetails.push(`Score inválido '${score}' para ${url_original}`);
        continue;
      }

      // Truncar o trecho público para 500 caracteres (segurança LGPD)
      const trechoTruncado = trecho_publico ? String(trecho_publico).substring(0, 500) : null;

      // 2. Verificar duplicidade no banco
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("radar_oportunidades")
        .select("id")
        .eq("url_original", url_original.trim())
        .maybeSingle();

      if (checkError) {
        erros++;
        validationErrorsDetails.push(`Erro ao consultar duplicidade: ${checkError.message}`);
        continue;
      }

      if (existing) {
        ignoradas++;
        continue; // Ignorar silenciosamente duplicada
      }

      // 3. Inserir oportunidade no banco de dados como pendente
      const fType = mapearFonteTipo(fonte);

      const { error: insertError } = await supabaseAdmin
        .from("radar_oportunidades")
        .insert([
          {
            titulo: titulo.trim(),
            categoria: categoria.trim(),
            fonte: fonte.trim(),
            url_original: url_original.trim(),
            trecho_publico: trechoTruncado,
            cidade: cidade?.trim() || null,
            estado: estado?.trim() || null,
            score_intencao: score,
            urgencia: urgency,
            resumo_ia: resumo_ia?.trim() || null,
            status: "pendente",
            fonte_tipo: fType,
            detectado_em: new Date().toISOString(),
            criado_em: new Date().toISOString(),
          },
        ]);

      if (insertError) {
        erros++;
        validationErrorsDetails.push(`Erro ao inserir no banco: ${insertError.message}`);
      } else {
        importadas++;
      }
    }

    // Logs no console admin
    console.log(`[Radar Import] Relatório final:`);
    console.log(`- Quantidade importada: ${importadas}`);
    console.log(`- Duplicadas ignoradas: ${ignoradas}`);
    console.log(`- Erros de validação/inserção: ${erros}`);
    if (validationErrorsDetails.length > 0) {
      console.log(`- Detalhes dos erros:`, validationErrorsDetails);
    }

    return NextResponse.json({
      success: true,
      stats: {
        importadas,
        ignoradas,
        erros,
      },
    });
  } catch (error) {
    console.error("Erro geral na API POST /api/admin/radar/importar:", error);
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
