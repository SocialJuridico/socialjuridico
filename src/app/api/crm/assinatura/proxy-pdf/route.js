import { supabaseAdmin } from "@/lib/supabase";
import {
  readSignatureStorageFile,
  signatureJson,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureUuid,
  parseSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storagePathFromPublicUrl(value) {
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/crm_documents/";
    const index = url.pathname.indexOf(marker);
    return index >= 0
      ? decodeURIComponent(url.pathname.slice(index + marker.length))
      : "";
  } catch {
    return "";
  }
}

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);
    let id = requestUrl.searchParams.get("id");
    if (!id) {
      const legacyUrl = requestUrl.searchParams.get("url");
      if (legacyUrl?.startsWith("/api/crm/assinatura/proxy-pdf?")) {
        id = new URL(legacyUrl, requestUrl.origin).searchParams.get("id");
      }
    }
    if (!isValidSignatureUuid(id)) {
      return signatureJson(
        { success: false, message: "Documento inválido." },
        400,
      );
    }

    const { data: signature, error } = await supabaseAdmin
      .from("assinaturas_digitais")
      .select(
        "id, document_url, original_storage_path, signed_storage_path, metadata",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!signature) {
      return signatureJson(
        { success: false, message: "Documento não encontrado." },
        404,
      );
    }

    const metadata = parseSignatureMetadata(signature.metadata);
    const storagePath =
      signature.signed_storage_path ||
      metadata.storage?.signed_path ||
      signature.original_storage_path ||
      metadata.storage?.original_path ||
      storagePathFromPublicUrl(signature.document_url);
    if (!storagePath || storagePath.includes("..")) {
      return signatureJson(
        { success: false, message: "Arquivo não localizado." },
        404,
      );
    }

    const buffer = await readSignatureStorageFile(storagePath);
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return signatureJson(
        { success: false, message: "Arquivo inválido." },
        422,
      );
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=assinatura.pdf",
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error("[CRM/Assinatura/ProxyPDF] Erro:", error);
    return signatureJson(
      { success: false, message: "Não foi possível carregar o PDF." },
      500,
    );
  }
}
