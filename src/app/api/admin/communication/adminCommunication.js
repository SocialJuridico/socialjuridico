import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const PUSH_TARGET_MODES = new Set([
  "TODOS",
  "TODOS_ADVOGADOS",
  "TODOS_CLIENTES",
  "ADVOGADO_ESPECIFICO",
  "CLIENTE_ESPECIFICO",
]);

export const EMAIL_TARGET_MODES = new Set([
  "EMAIL_TODOS_ADVOGADOS",
  "EMAIL_TODOS_CLIENTES",
  "EMAIL_TODOS_ANUNCIANTES",
  "EMAIL_ADVOGADO_ESPECIFICO",
  "EMAIL_CLIENTE_ESPECIFICO",
  "EMAIL_ANUNCIANTE_ESPECIFICO",
]);

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdminCommunicationAccess() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function deduplicateRecipients(recipients) {
  const seen = new Set();

  return (recipients || []).flatMap((recipient) => {
    const email = String(recipient?.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) return [];
    seen.add(email);

    return [{
      name: String(recipient?.name || "Usuário").trim() || "Usuário",
      email,
    }];
  });
}
