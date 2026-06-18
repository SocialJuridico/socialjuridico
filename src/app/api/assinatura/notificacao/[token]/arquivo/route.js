import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request, context) {
  try {
    const { token } = await context.params;
    if (!token) {
      return json({ success: false, message: "Token inválido." }, 400);
    }

    const { data: notification, error } = await supabaseAdmin
      .from("signature_extrajudicial_notifications")
      .select("file_path, file_name, file_bucket")
      .eq("access_token", token)
      .maybeSingle();

    if (error) throw error;
    if (!notification) {
      return json({ success: false, message: "Notificação não encontrada." }, 404);
    }

    const searchParams = new URL(request.url).searchParams;
    const preview = searchParams.get("preview") === "1";
    const download = searchParams.get("download") === "1";
    const options =
      preview && !download
        ? undefined
        : { download: notification.file_name || "notificacao-extrajudicial.pdf" };

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(notification.file_bucket)
      .createSignedUrl(notification.file_path, 120, options);

    if (signedError || !signed?.signedUrl) {
      throw signedError || new Error("Não foi possível gerar a URL de download.");
    }

    return Response.redirect(signed.signedUrl, 302);
  } catch (error) {
    console.error("[Signature Public/Notificacao/Arquivo][GET] Erro:", error);
    return json({ success: false, message: "Não foi possível carregar o arquivo." }, 500);
  }
}
