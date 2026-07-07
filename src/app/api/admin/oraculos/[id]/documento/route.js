import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_FIELDS = new Set([
  "comprovante_matricula_url",
  "comprovante_estagiario_url",
]);

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request, { params }) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  const { id } = await params;
  const field = new URL(request.url).searchParams.get("field");

  if (!ALLOWED_FIELDS.has(field)) {
    return json({ success: false, message: "Documento inválido." }, 400);
  }

  try {
    const { data: oraculo, error } = await supabaseAdmin
      .from("oraculo_profissionais")
      .select(field)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(`Falha ao consultar cadastro: ${error.message}`);
    if (!oraculo?.[field]) {
      return json({ success: false, message: "Documento não encontrado." }, 404);
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("oraculo-documentos")
      .createSignedUrl(oraculo[field], 300);

    if (signedError || !signed?.signedUrl) {
      throw new Error(
        `Falha ao gerar URL assinada: ${signedError?.message || "desconhecida"}`,
      );
    }

    return json({ success: true, data: { url: signed.signedUrl } });
  } catch (error) {
    console.error("[Admin/Oraculos/Documento][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível gerar o link do documento." },
      500,
    );
  }
}
