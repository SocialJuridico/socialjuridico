import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getSignatureProductRequestEvidence,
  signatureProductJson,
} from "@/lib/signatureProductServer";
import {
  loadPublicSignatureContext,
  markPublicSignatureViewed,
  serializePublicSignatureContext,
} from "@/lib/signatureSigningServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    if (!supabaseAdmin) return signatureProductJson({ success: false, message: "Serviço indisponível." }, 503);
    const { token } = await params;
    const context = await loadPublicSignatureContext(supabaseAdmin, token);
    if (!context) return signatureProductJson({ success: false, message: "Convite inválido ou substituído." }, 404);
    return signatureProductJson({ success: true, data: serializePublicSignatureContext(context) });
  } catch (error) {
    console.error("[Public signature context][GET]", error);
    return signatureProductJson({ success: false, message: "Não foi possível abrir o convite." }, 500);
  }
}

export async function POST(request, { params }) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    if (!supabaseAdmin) return signatureProductJson({ success: false, message: "Serviço indisponível." }, 503);
    const { token } = await params;
    const context = await loadPublicSignatureContext(supabaseAdmin, token);
    if (!context) return signatureProductJson({ success: false, message: "Convite inválido ou substituído." }, 404);
    await markPublicSignatureViewed(
      supabaseAdmin,
      context,
      getSignatureProductRequestEvidence(request),
    );
    const refreshed = await loadPublicSignatureContext(supabaseAdmin, token);
    return signatureProductJson({ success: true, data: serializePublicSignatureContext(refreshed) });
  } catch (error) {
    console.error("[Public signature context][POST]", error);
    return signatureProductJson({ success: false, message: "Não foi possível registrar a visualização." }, 500);
  }
}
