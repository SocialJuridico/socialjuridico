import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";

export const AUTH_PAGE_SIZE = 1000;
export const MAX_AUTH_PAGES = 20;

export const ALLOWED_PLAN_TYPES = new Set(["START", "PRO"]);
export const ALLOWED_OAB_STATUSES = new Set(["PENDING", "VERIFIED", "ERROR"]);
export const ALLOWED_STATES = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizePositiveInteger(value, { min = 1, max = 100000 } = {}) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
}

export function normalizeOab(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, "");

  if (!normalized || normalized.length > 30) return null;
  if (!/^[0-9A-Za-z.-]+$/.test(normalized)) return null;

  return normalized.toUpperCase();
}

export async function requireAdmin() {
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
          message: "Serviço administrativo não configurado no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export async function getLawyerOrNull(db, lawyerId) {
  const { data, error } = await db
    .from("advogados")
    .select(
      "id, name, email, oab, estado, is_premium, premium_expires_at, balance, oab_verification_status, plan_type",
    )
    .eq("id", lawyerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar o advogado: ${error.message}`);
  }

  return data || null;
}

export async function listAllAuthUsers() {
  const users = [];

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: AUTH_PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Falha ao consultar usuários do Auth: ${error.message}`);
    }

    const pageUsers = data?.users || [];
    users.push(...pageUsers);

    if (pageUsers.length < AUTH_PAGE_SIZE) break;
  }

  return users;
}

export async function executeDelete(db, table, configureQuery, label) {
  const { error } = await configureQuery(db.from(table).delete());
  if (error) throw new Error(`${label}: ${error.message}`);
}

export async function executeUpdate(db, table, updates, configureQuery, label) {
  const { error } = await configureQuery(db.from(table).update(updates));
  if (error) throw new Error(`${label}: ${error.message}`);
}
