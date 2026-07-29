/**
 * Resolvedor de links curtos de compartilhamento da Central de Notícias.
 * Ex.: /n/AB12cd34 -> 302 -> /noticias/{slug-da-materia}
 *
 * Registra o clique (via resolveShareLink) e redireciona para a matéria
 * publicada. Se o link/matéria não existir mais, cai na listagem.
 */

import { NextResponse } from "next/server";

import { resolveShareLink } from "@/lib/news/newsService";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Origem para o redirect. Prioriza o domínio público (SITE_URL) e só usa a
 * origem do request quando ela não for localhost — assim o Location nunca
 * aponta para localhost em produção.
 */
function resolveOrigin(request) {
  const requestOrigin = new URL(request.url).origin;
  if (/localhost|127\.0\.0\.1|::1/i.test(requestOrigin)) {
    return SITE_URL.replace(/\/$/, "");
  }
  return requestOrigin;
}

export async function GET(request, { params }) {
  const { code } = await params;
  const origin = resolveOrigin(request);

  try {
    const link = await resolveShareLink(code);
    const slug = link?.article?.slug;
    const status = link?.article?.status;

    if (slug && status === "PUBLICADO") {
      return NextResponse.redirect(`${origin}/noticias/${slug}`, 302);
    }
  } catch (error) {
    console.error("[News ShortLink] Falha ao resolver:", error.message);
  }

  return NextResponse.redirect(`${origin}/noticias`, 302);
}
