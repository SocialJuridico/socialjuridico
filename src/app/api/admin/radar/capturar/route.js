import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { classificarOportunidades } from "@/lib/radar/classificarOportunidades";
import { normalizeUrl, getRawFonteFromUrl } from "@/lib/radar/fetchRadarSources";

export const dynamic = "force-dynamic";

// Verifica admin
async function checkAdmin(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { errorStatus: 401, message: "Não autorizado" };
  const { data: admin } = await supabaseAdmin.from("admins").select("id").eq("id", user.id).eq("role", "ADMIN").maybeSingle();
  if (!admin) return { errorStatus: 403, message: "Acesso restrito" };
  return { user };
}

// Remove dados pessoais do texto
function sanitizar(texto) {
  return (texto || "")
    .replace(/(\+55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g, "[telefone omitido]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email omitido]")
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF omitido]")
    .substring(0, 2000);
}

function mapFonteTipo(url, fonte) {
  const u = (url || "").toLowerCase();
  if (u.includes("facebook.com")) return "Facebook";
  if (u.includes("instagram.com")) return "Instagram";
  if (u.includes("x.com") || u.includes("twitter.com")) return "X";
  if (u.includes("reddit.com")) return "Reddit";
  if (u.includes("jusbrasil.com")) return "JusBrasil";
  // fallback pela fonte selecionada
  const f = (fonte || "").toLowerCase();
  if (f.includes("facebook")) return "Facebook";
  if (f.includes("instagram")) return "Instagram";
  if (f.includes("twitter") || f === "x") return "X";
  if (f.includes("reddit")) return "Reddit";
  if (f.includes("jusbrasil")) return "JusBrasil";
  return "Outros";
}

/**
 * POST /api/admin/radar/capturar
 * Recebe { url, fonte, texto } e retorna um preview classificado pela IA.
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: adminCheck.errorStatus });
    }

    const body = await request.json();
    const { url, fonte, texto } = body;

    if (!url?.trim() || !texto?.trim()) {
      return NextResponse.json({ success: false, message: "URL e texto são obrigatórios." }, { status: 400 });
    }

    // Normalizar URL e verificar duplicata
    const urlNorm = normalizeUrl(url.trim());
    const { data: existing } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id")
      .eq("url_original", urlNorm)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, message: "Esta URL já existe no banco de dados." }, { status: 409 });
    }

    // Sanitizar texto
    const textoSanitizado = sanitizar(texto);

    // Classificar com IA
    const itemBruto = [{
      fonte: fonte || "Manual",
      raw_fonte: getRawFonteFromUrl(urlNorm) || "outros",
      url_original: urlNorm,
      texto_publico: textoSanitizado,
      titulo: `Publicação em ${fonte || "rede social"}`
    }];

    const classified = await classificarOportunidades(itemBruto);
    const result = classified[0];

    if (!result) {
      return NextResponse.json({ success: false, message: "IA não retornou resultado." }, { status: 500 });
    }

    // Montar preview (não salvar ainda)
    let score = typeof result.score_intencao === "number" ? result.score_intencao : 50;
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    const preview = {
      titulo: result.titulo?.trim() || `Oportunidade em ${fonte}`,
      categoria: result.categoria?.trim() || "Não classificada",
      fonte: fonte,
      raw_fonte: getRawFonteFromUrl(urlNorm) || "outros",
      url_original: urlNorm,
      trecho_publico: (result.trecho_publico || textoSanitizado).substring(0, 500),
      cidade: result.cidade || null,
      estado: result.estado || null,
      score_intencao: score,
      urgencia: ["baixa", "media", "alta"].includes(result.urgencia) ? result.urgencia : "media",
      resumo_ia: result.resumo_ia || "Oportunidade capturada manualmente.",
      status: "pendente",
      fonte_tipo: mapFonteTipo(urlNorm, fonte),
      origem_automatica: false,
      detectado_em: new Date().toISOString(),
      publicado_em: null
    };

    return NextResponse.json({ success: true, preview });
  } catch (error) {
    console.error("[Capturador] Erro no POST:", error);
    return NextResponse.json({ success: false, message: "Erro interno." }, { status: 500 });
  }
}

/**
 * PUT /api/admin/radar/capturar
 * Recebe o preview confirmado e salva como pendente.
 */
export async function PUT(request) {
  try {
    const supabase = createClient();
    const adminCheck = await checkAdmin(supabase);
    if (adminCheck.errorStatus) {
      return NextResponse.json({ success: false, message: adminCheck.message }, { status: adminCheck.errorStatus });
    }

    const preview = await request.json();

    if (!preview.url_original || !preview.titulo) {
      return NextResponse.json({ success: false, message: "Dados incompletos para salvar." }, { status: 400 });
    }

    // Verificar duplicata novamente (segurança)
    const { data: existing } = await supabaseAdmin
      .from("radar_oportunidades")
      .select("id")
      .eq("url_original", preview.url_original)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, message: "URL já existe no banco de dados." }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from("radar_oportunidades")
      .insert({
        titulo: preview.titulo,
        categoria: preview.categoria,
        fonte: preview.fonte,
        raw_fonte: preview.raw_fonte,
        url_original: preview.url_original,
        trecho_publico: (preview.trecho_publico || "").substring(0, 500),
        cidade: preview.cidade || null,
        estado: preview.estado || null,
        score_intencao: preview.score_intencao,
        urgencia: preview.urgencia,
        resumo_ia: preview.resumo_ia,
        status: "pendente",
        fonte_tipo: preview.fonte_tipo,
        origem_automatica: false,
        detectado_em: preview.detectado_em || new Date().toISOString(),
        publicado_em: null
      })
      .select()
      .single();

    if (error) {
      console.error("[Capturador] Erro ao salvar:", error.message);
      return NextResponse.json({ success: false, message: "Erro ao salvar no banco." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Capturador] Erro no PUT:", error);
    return NextResponse.json({ success: false, message: "Erro interno." }, { status: 500 });
  }
}
