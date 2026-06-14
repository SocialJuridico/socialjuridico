import {
  platformJson,
  requireLawyerDocumentationAccess,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { normalizePlatformText } from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const access = await requireLawyerDocumentationAccess(request);
    if (!access.ok) return access.response;
    const params = await context.params;
    const slug = normalizePlatformText(params?.slug, 120).toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return platformJson({ success: false, message: "Documentação inválida." }, 400);
    }

    const { data, error } = await access.db
      .from("platform_documentation")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_schema, schema_version, content_version, published_at, updated_at",
      )
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .in("target_audience", ["LAWYER", "BOTH"])
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return platformJson({ success: false, message: "Documentação não encontrada." }, 404);
    }

    return platformJson({ success: true, data });
  } catch (error) {
    return safePlatformError(error, "Não foi possível abrir a documentação.");
  }
}
