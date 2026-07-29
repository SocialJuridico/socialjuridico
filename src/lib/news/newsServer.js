/**
 * Guardas de autorização e helpers de resposta HTTP para as rotas da
 * Central de Notícias. Reutiliza o padrão de autenticação admin do projeto
 * (getAuthenticatedAdmin) e o segredo de cron (padrão radar-fetch).
 */

import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";

export function jsonResponse(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Exige um admin autenticado. Retorna { ok, actor, response? }.
 * Em falha, `response` é a resposta HTTP pronta para retornar.
 */
export async function requireNewsAdmin() {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return {
      ok: false,
      response: jsonResponse(
        { success: false, message: auth.message || "Não autorizado" },
        auth.status || 401,
      ),
    };
  }
  return {
    ok: true,
    actor: { id: auth.admin.id, name: auth.admin.name, email: auth.admin.email },
    auth,
  };
}

/**
 * Valida o segredo de cron (Bearer). Segue o padrão da rota radar-fetch.
 * Usa NEWS_CRON_SECRET.
 */
export function validateNewsCron(request) {
  // Aceita o segredo dedicado (NEWS_CRON_SECRET) ou o CRON_SECRET que a Vercel
  // injeta automaticamente no header Authorization dos Cron Jobs.
  const secrets = [process.env.NEWS_CRON_SECRET, process.env.CRON_SECRET].filter(
    (s) => typeof s === "string" && s.trim() !== "",
  );
  if (secrets.length === 0) {
    return {
      ok: false,
      response: jsonResponse(
        {
          success: false,
          message: "NEWS_CRON_SECRET/CRON_SECRET não configurado no servidor.",
        },
        500,
      ),
    };
  }
  const authHeader = request.headers.get("authorization");
  const isValid = secrets.some((secret) => authHeader === `Bearer ${secret}`);
  if (!authHeader || !isValid) {
    return {
      ok: false,
      response: jsonResponse({ success: false, message: "Não autorizado" }, 401),
    };
  }
  return { ok: true };
}
