import { supabaseAdmin } from "@/lib/supabase";
import { loadPublicSignatureContext } from "@/lib/signatureSigningServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(value) {
  return String(value || "documento.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function GET(request, { params }) {
  try {
    if (!supabaseAdmin) return new Response("Serviço indisponível.", { status: 503 });
    const { token } = await params;
    const context = await loadPublicSignatureContext(supabaseAdmin, token);
    if (!context) return new Response("Convite inválido ou substituído.", { status: 404 });

    const wantsFinal = new URL(request.url).searchParams.get("final") === "1";
    const kind = wantsFinal ? "FINAL" : "ORIGINAL";
    const document = context.documents.find((item) => item.document_kind === kind);
    if (!document) return new Response("Documento não disponível.", { status: 404 });

    const { data, error } = await supabaseAdmin.storage
      .from("signature-documents")
      .download(document.storage_path);
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${safeFileName(document.original_name)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Public signature document]", error);
    return new Response("Não foi possível carregar o documento.", { status: 500 });
  }
}
