import {
  DOCUMENTATION_BUCKET,
  platformJson,
  requireLawyerDocumentationAccess,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { normalizePlatformText } from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireLawyerDocumentationAccess(request);
    if (!access.ok) return access.response;

    const slug = normalizePlatformText(
      new URL(request.url).searchParams.get("slug"),
      120,
    ).toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return platformJson({ success: false, message: "Documento inválido." }, 400);
    }

    const { data: document, error } = await access.db
      .from("platform_documentation")
      .select("source_pdf_path")
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .in("target_audience", ["LAWYER", "BOTH"])
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!document?.source_pdf_path) {
      return platformJson({ success: false, message: "PDF de origem não encontrado." }, 404);
    }

    const { data: pdf, error: downloadError } = await access.db.storage
      .from(DOCUMENTATION_BUCKET)
      .download(document.source_pdf_path);
    if (downloadError || !pdf) {
      return platformJson({ success: false, message: "Arquivo indisponível." }, 404);
    }

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return safePlatformError(error, "Não foi possível abrir o documento.");
  }
}
