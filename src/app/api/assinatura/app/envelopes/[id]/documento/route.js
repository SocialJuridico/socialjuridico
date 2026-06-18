import { requireSignatureProductAccess } from "@/lib/signatureProductServer";
import { ensureFinalSignatureDocument } from "@/lib/signatureSigningServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(value) {
  return String(value || "documento.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function GET(request, { params }) {
  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) {
      return new Response("Envelope inválido.", { status: 400 });
    }

    const wantsFinal = new URL(request.url).searchParams.get("final") === "1";
    const { data: envelope, error: envelopeError } = await access.db
      .from("signature_envelopes")
      .select("id, status")
      .eq("id", id)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (envelopeError) throw envelopeError;
    if (!envelope) return new Response("Envelope não encontrado.", { status: 404 });

    let document = null;
    if (wantsFinal && envelope.status === "COMPLETED") {
      document = await ensureFinalSignatureDocument(access.db, envelope.id);
    } else {
      const { data, error } = await access.db
        .from("signature_documents")
        .select("storage_bucket, storage_path, original_name")
        .eq("envelope_id", envelope.id)
        .eq("document_kind", wantsFinal ? "FINAL" : "ORIGINAL")
        .maybeSingle();
      if (error) throw error;
      document = data;
    }

    if (!document) return new Response("Documento não disponível.", { status: 404 });
    const { data: file, error: fileError } = await access.db.storage
      .from(document.storage_bucket || "signature-documents")
      .download(document.storage_path);
    if (fileError) throw fileError;
    const buffer = Buffer.from(await file.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${safeFileName(document.original_name)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Signature owner document]", error);
    return new Response("Não foi possível carregar o documento.", { status: 500 });
  }
}
