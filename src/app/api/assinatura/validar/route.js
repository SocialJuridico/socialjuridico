import { supabaseAdmin } from "@/lib/supabase";
import { signatureProductJson } from "@/lib/signatureProductServer";

export const dynamic = "force-dynamic";

function maskEmail(value) {
  const [local = "", domain = ""] = String(value || "").split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "***";
}

export async function GET(request) {
  try {
    const code = String(new URL(request.url).searchParams.get("code") || "").trim().toUpperCase();
    if (!/^SJA-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) {
      return signatureProductJson({ success: false, message: "Código de validação inválido." }, 400);
    }
    if (!supabaseAdmin) return signatureProductJson({ success: false, message: "Serviço indisponível." }, 503);

    const { data: envelope, error } = await supabaseAdmin
      .from("signature_envelopes")
      .select(
        "id, title, document_type, status, verification_code, created_at, completed_at, signature_recipients(name, email, role, status, completed_at, signature_method), signature_documents(document_kind, sha256)",
      )
      .eq("verification_code", code)
      .maybeSingle();
    if (error) throw error;
    if (!envelope) return signatureProductJson({ success: false, message: "Documento não encontrado." }, 404);

    const original = (envelope.signature_documents || []).find((item) => item.document_kind === "ORIGINAL");
    const final = (envelope.signature_documents || []).find((item) => item.document_kind === "FINAL");
    const required = (envelope.signature_recipients || []).filter((item) => item.role !== "COPY");
    const completed = required.filter((item) => item.status === "COMPLETED");
    const publicStatus = envelope.status === "COMPLETED"
      ? "signed"
      : completed.length > 0
        ? "partially_signed"
        : "pending";

    return signatureProductJson({
      success: true,
      data: {
        id: envelope.id,
        document_name: envelope.title,
        document_type: envelope.document_type,
        verification_code: envelope.verification_code,
        status: publicStatus,
        original_hash: original?.sha256 || null,
        signed_hash: final?.sha256 || null,
        created_at: envelope.created_at,
        document_url: null,
        metadata: {
          signature_product: true,
          completed_at: envelope.completed_at,
          participants: (envelope.signature_recipients || []).map((recipient) => ({
            name: recipient.name,
            email: maskEmail(recipient.email),
            role: recipient.role,
            signed: recipient.role === "COPY" ? recipient.status !== "PENDING" : recipient.status === "COMPLETED",
            signed_at: recipient.completed_at,
            method: recipient.signature_method || (recipient.role === "COPY" ? "Consulta" : "E-mail OTP"),
          })),
        },
      },
    });
  } catch (error) {
    console.error("[Signature public validation]", error);
    return signatureProductJson({ success: false, message: "Não foi possível validar o documento." }, 500);
  }
}
