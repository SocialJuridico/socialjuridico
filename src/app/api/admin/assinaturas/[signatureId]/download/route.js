import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { readAdminSignableDocument } from "@/lib/adminDocumentSignatures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(value) {
  return String(value || "documento-assinado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .toLowerCase();
}

function formatCertificate(signature) {
  const payload = signature.signature_payload || {};
  const evidence = payload.evidence || {};

  return [
    "",
    "---",
    "",
    "# Certificado de Assinatura Eletronica Social Juridico",
    "",
    `**Codigo de verificacao:** ${signature.verification_code}`,
    `**Status:** ${signature.status}`,
    `**Documento:** ${signature.document_title}`,
    `**Categoria:** ${signature.document_category}`,
    `**Caminho original:** ${signature.document_path}`,
    `**Hash SHA-256 do documento:** ${signature.document_hash}`,
    `**Hash SHA-256 da assinatura:** ${signature.signature_hash}`,
    `**Signatario:** ${signature.signer_name}`,
    `**Perfil:** ${signature.signer_role || "ADMIN"}`,
    `**Assinado em:** ${signature.signed_at}`,
    `**IP hash:** ${signature.request_ip_hash || evidence.request_ip_hash || "Registrado no banco"}`,
    `**User-Agent hash:** ${signature.user_agent_hash || evidence.user_agent_hash || "Registrado no banco"}`,
    "",
    "## Declaracao de vontade",
    "",
    signature.signature_statement,
    "",
    "## Base de integridade",
    "",
    "Este certificado registra autoria, integridade, data, hora, hash criptografico e trilha de auditoria da assinatura eletronica realizada no ambiente autenticado da plataforma Social Juridico.",
    "",
  ].join("\n");
}

export async function GET(request, context) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
      );
    }

    const params = await context?.params;
    const fallbackSignatureId = (() => {
      try {
        const parts = new URL(request.url).pathname.split("/").filter(Boolean);
        const index = parts.indexOf("assinaturas");
        return index >= 0 ? parts[index + 1] : "";
      } catch {
        return "";
      }
    })();
    const signatureId = String(params?.signatureId || fallbackSignatureId || "").trim();
    if (!signatureId) {
      return NextResponse.json(
        { success: false, message: "Assinatura nao informada." },
        { status: 400 },
      );
    }

    const { data: signature, error } = await auth.db
      .from("admin_document_signatures")
      .select("*")
      .eq("id", signatureId)
      .maybeSingle();

    if (error) throw error;
    if (!signature) {
      return NextResponse.json(
        { success: false, message: "Assinatura nao encontrada." },
        { status: 404 },
      );
    }

    const documentFile = await readAdminSignableDocument({
      id: signature.document_id,
      title: signature.document_title,
      category: signature.document_category,
      path: signature.document_path,
    });

    const content = `${documentFile.text}${formatCertificate(signature)}`;
    const fileName = `${sanitizeFileName(signature.document_title)}-${signature.verification_code}.md`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("[Admin/Assinaturas/Download]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Nao foi possivel baixar o documento assinado.",
      },
      { status: 500 },
    );
  }
}
