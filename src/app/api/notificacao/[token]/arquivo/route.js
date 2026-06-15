import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { extractLegacyStoragePath } from "@/lib/lawyerDocumentProtection/legacyDocumentProtection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function normalizeToken(value) {
  const token = String(value || "").trim();
  if (!token || token.length > 120 || /[^a-zA-Z0-9_-]/.test(token)) return "";
  return token;
}

export async function GET(request, context) {
  try {
    if (!supabaseAdmin) {
      return json({ success: false, message: "Servico indisponivel." }, 503);
    }

    const { token: rawToken } = await context.params;
    const token = normalizeToken(rawToken);
    if (!token) {
      return json({ success: false, message: "Notificacao invalida." }, 400);
    }

    const { data: notification, error } = await supabaseAdmin
      .from("blindagem_notificacoes")
      .select("id, file_name, file_url")
      .eq("access_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!notification) {
      return json({ success: false, message: "Notificacao nao encontrada." }, 404);
    }

    const storagePath = extractLegacyStoragePath(
      notification.file_url,
      "crm_documents",
    );

    if (!storagePath) {
      return json(
        {
          success: false,
          message: "Arquivo da notificacao indisponivel para acesso seguro.",
        },
        404,
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const preview = searchParams.get("preview") === "1";
    const download = searchParams.get("download") === "1";
    const options =
      preview && !download
        ? undefined
        : { download: notification.file_name || "notificacao-extrajudicial.pdf" };

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("crm_documents")
      .createSignedUrl(storagePath, 120, options);

    if (signedError || !signed?.signedUrl) {
      throw signedError || new Error("Nao foi possivel assinar o arquivo.");
    }

    return Response.redirect(signed.signedUrl, 302);
  } catch (error) {
    console.error("[Public/Notificacao/Arquivo][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Nao foi possivel abrir o documento da notificacao.",
      },
      500,
    );
  }
}
