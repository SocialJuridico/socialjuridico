import crypto from "node:crypto";

import { forgotPasswordAction } from "@/app/actions/passwordActions";
import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_FIELDS = "id, name, email, role, phone, created_at";
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 10;

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  return name.length >= 2 && name.length <= 120 ? name : null;
}

function normalizePhone(value) {
  const phone = String(value || "").trim();
  return phone ? phone.slice(0, 40) : null;
}

async function requireAdmin() {
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

async function getAdminOrNull(db, adminId) {
  const { data, error } = await db
    .from("admins")
    .select(ADMIN_FIELDS)
    .eq("id", adminId)
    .eq("role", "ADMIN")
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar o administrador: ${error.message}`);
  }

  return data || null;
}

async function listAllAuthUsers() {
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

export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const [adminsResult, authUsers] = await Promise.all([
      access.db
        .from("admins")
        .select(ADMIN_FIELDS)
        .eq("role", "ADMIN")
        .order("created_at", { ascending: false }),
      listAllAuthUsers(),
    ]);

    if (adminsResult.error) {
      throw new Error(
        `Falha ao consultar administradores: ${adminsResult.error.message}`,
      );
    }

    const authById = new Map(authUsers.map((user) => [user.id, user]));
    const data = (adminsResult.data || []).map((admin) => ({
      ...admin,
      last_sign_in_at: authById.get(admin.id)?.last_sign_in_at || null,
      email_confirmed_at: authById.get(admin.id)?.email_confirmed_at || null,
    }));

    return json({
      success: true,
      data,
      currentAdminId: access.auth.user.id,
    });
  } catch (error) {
    console.error("[Admin/Administradores][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar os administradores.",
      },
      500,
    );
  }
}

export async function POST(request) {
  let createdUserId = null;

  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);

    if (!name || !email) {
      return json(
        { success: false, message: "Informe um nome e um e-mail válidos." },
        400,
      );
    }

    const temporaryPassword = crypto.randomBytes(32).toString("base64url");
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "ADMIN",
          needs_password_update: true,
        },
      });

    if (createAuthError || !authData?.user) {
      const message = createAuthError?.message?.toLowerCase() || "";
      return json(
        {
          success: false,
          message: message.includes("registered")
            ? "Este e-mail já está cadastrado."
            : "Não foi possível criar o acesso administrativo.",
        },
        409,
      );
    }

    createdUserId = authData.user.id;

    const payload = {
      id: createdUserId,
      name,
      email,
      role: "ADMIN",
      phone,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await access.db
      .from("admins")
      .insert([payload])
      .select(ADMIN_FIELDS)
      .single();

    if (error) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      throw new Error(`Falha ao criar perfil administrativo: ${error.message}`);
    }

    const resetResult = await forgotPasswordAction(email);

    return json(
      {
        success: true,
        data: {
          ...data,
          last_sign_in_at: null,
          email_confirmed_at: authData.user.email_confirmed_at || null,
        },
        message: resetResult?.success
          ? "Administrador criado. O link para criação da senha foi enviado por e-mail."
          : "Administrador criado, mas o link de senha precisa ser reenviado.",
      },
      201,
    );
  } catch (error) {
    if (createdUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => null);
    }

    console.error("[Admin/Administradores][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível criar o administrador.",
      },
      500,
    );
  }
}

export async function PUT(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("id");

    if (!isValidUuid(adminId)) {
      return json({ success: false, message: "ID do administrador inválido." }, 400);
    }

    const currentAdmin = await getAdminOrNull(access.db, adminId);
    if (!currentAdmin) {
      return json(
        { success: false, message: "Administrador não encontrado." },
        404,
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);

    if (!name || !email) {
      return json(
        { success: false, message: "Informe um nome e um e-mail válidos." },
        400,
      );
    }

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(adminId, {
        email,
        user_metadata: {
          full_name: name,
          role: "ADMIN",
        },
      });

    if (authUpdateError) {
      return json(
        {
          success: false,
          message: authUpdateError.message?.toLowerCase().includes("registered")
            ? "Este e-mail já está cadastrado."
            : "Não foi possível atualizar o acesso no serviço de autenticação.",
        },
        409,
      );
    }

    const { data, error: updateError } = await access.db
      .from("admins")
      .update({ name, email, phone })
      .eq("id", adminId)
      .select(ADMIN_FIELDS)
      .single();

    if (updateError) {
      await supabaseAdmin.auth.admin
        .updateUserById(adminId, {
          email: currentAdmin.email,
          user_metadata: {
            full_name: currentAdmin.name,
            role: "ADMIN",
          },
        })
        .catch(() => null);

      throw new Error(`Falha ao atualizar perfil: ${updateError.message}`);
    }

    return json({
      success: true,
      data,
      message: "Administrador atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Administradores][PUT] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível atualizar o administrador.",
      },
      500,
    );
  }
}

export async function PATCH(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("id");

    if (!isValidUuid(adminId)) {
      return json({ success: false, message: "ID do administrador inválido." }, 400);
    }

    const admin = await getAdminOrNull(access.db, adminId);
    if (!admin) {
      return json(
        { success: false, message: "Administrador não encontrado." },
        404,
      );
    }

    const result = await forgotPasswordAction(admin.email);

    if (!result?.success) {
      return json(
        {
          success: false,
          message: result?.message || "Não foi possível enviar o link.",
        },
        500,
      );
    }

    return json({
      success: true,
      message: "Link de redefinição enviado ao administrador.",
    });
  } catch (error) {
    console.error("[Admin/Administradores][PATCH] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível enviar o link de redefinição.",
      },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("id");

    if (!isValidUuid(adminId)) {
      return json({ success: false, message: "ID do administrador inválido." }, 400);
    }

    if (adminId === access.auth.user.id) {
      return json(
        {
          success: false,
          message: "Você não pode excluir o próprio acesso administrativo.",
        },
        400,
      );
    }

    const admin = await getAdminOrNull(access.db, adminId);
    if (!admin) {
      return json(
        { success: false, message: "Administrador não encontrado." },
        404,
      );
    }

    const { count, error: countError } = await access.db
      .from("admins")
      .select("id", { count: "exact", head: true })
      .eq("role", "ADMIN");

    if (countError) {
      throw new Error(`Falha ao verificar administradores: ${countError.message}`);
    }

    if (Number(count || 0) <= 1) {
      return json(
        {
          success: false,
          message: "O último administrador da plataforma não pode ser excluído.",
        },
        409,
      );
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(adminId);

    if (authDeleteError) {
      throw new Error(`Falha ao revogar acesso no Auth: ${authDeleteError.message}`);
    }

    const { error: profileDeleteError } = await access.db
      .from("admins")
      .delete()
      .eq("id", adminId);

    if (profileDeleteError) {
      throw new Error(`Falha ao excluir perfil: ${profileDeleteError.message}`);
    }

    return json({
      success: true,
      message: "Administrador removido com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Administradores][DELETE] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível excluir o administrador.",
      },
      500,
    );
  }
}
