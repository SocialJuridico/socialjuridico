import { requireSignatureProductAccess } from "@/lib/signatureProductServer";
import { generateCertificatePdf } from "@/lib/signatureSigningServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFileName(value) {
  return String(value || "certificado.pdf").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function GET(request, { params }) {
  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) {
      return new Response("Envelope inválido.", { status: 400 });
    }

    const { data: envelope, error: envelopeError } = await access.db
      .from("signature_envelopes")
      .select("id, title")
      .eq("id", id)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (envelopeError) throw envelopeError;
    if (!envelope) return new Response("Envelope não encontrado.", { status: 404 });

    const buffer = await generateCertificatePdf(access.db, envelope.id);
    const fileName = `certificado-${safeFileName(envelope.title)}.pdf`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Signature owner certificate]", error);
    return new Response("Não foi possível carregar o certificado.", { status: 500 });
  }
}
