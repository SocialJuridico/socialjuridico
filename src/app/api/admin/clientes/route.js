import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 20;
const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.socialjuridico.com.br";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json(
        { success: false, message: auth.message },
        auth.status,
      ),
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

  return {
    ok: true,
    auth,
    db: supabaseAdmin,
  };
}

async function getClientOrNull(db, clientId) {
  const { data, error } = await db
    .from("clientes")
    .select("id, name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`Não foi possível localizar o cliente: ${error.message}`);
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

async function executeDelete(db, table, configureQuery, label) {
  const query = configureQuery(db.from(table).delete());
  const { error } = await query;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function sendRecoveryEmail(client) {
  const normalizedEmail = client.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("O cliente não possui um e-mail válido cadastrado.");
  }

  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
    });

  if (linkError) {
    throw new Error(`Não foi possível gerar o link: ${linkError.message}`);
  }

  const hashedToken = linkData?.properties?.hashed_token;

  if (!hashedToken) {
    throw new Error("O serviço de autenticação não retornou o token de recuperação.");
  }

  const recoveryUrl = new URL("/api/auth/recover-password", SITE_URL);
  recoveryUrl.searchParams.set("token_hash", hashedToken);
  recoveryUrl.searchParams.set("type", "recovery");

  const { error: resendError } = await resend.emails.send({
    from: RESEND_FROM,
    to: normalizedEmail,
    subject: "Redefinição de senha — Social Jurídico",
    html: `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width" />
          <title>Redefinição de senha</title>
        </head>
        <body style="margin:0;padding:24px;background:#111;color:#fff;font-family:Arial,sans-serif;">
          <div style="max-width:620px;margin:0 auto;border:1px solid rgba(212,175,55,.35);border-radius:14px;background:#0d0f12;overflow:hidden;">
            <div style="padding:34px 36px;">
              <p style="margin:0 0 10px;color:#d4af37;font-size:12px;font-weight:700;letter-spacing:.08em;text-align:center;text-transform:uppercase;">Social Jurídico</p>
              <h1 style="margin:0;color:#fff;font-size:27px;line-height:1.25;text-align:center;">Redefinição de senha</h1>
              <p style="margin:25px 0 0;color:#d7d7d7;font-size:16px;line-height:1.65;">Olá${client.name ? `, ${client.name}` : ""}. Um administrador solicitou a redefinição da senha da sua conta.</p>
              <div style="margin:32px 0;text-align:center;">
                <a href="${recoveryUrl.toString()}" style="display:inline-block;padding:14px 27px;border-radius:8px;color:#111;background:#d4af37;font-size:16px;font-weight:700;text-decoration:none;">Criar uma nova senha</a>
              </div>
              <p style="margin:0;color:#a8a8a8;font-size:13px;line-height:1.6;">O link possui validade limitada. Caso não reconheça a solicitação, entre em contato com o suporte da plataforma.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (resendError) {
    throw new Error("Não foi possível enviar o e-mail de redefinição.");
  }
}

// GET /api/admin/clientes -> lista clientes cadastrados
export async function GET() {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;

    const [clientsResult, authUsers] = await Promise.all([
      db
        .from("clientes")
        .select("id, name, email, phone, created_at")
        .order("created_at", { ascending: false }),
      listAllAuthUsers(),
    ]);

    if (clientsResult.error) {
      throw new Error(`Falha ao consultar clientes: ${clientsResult.error.message}`);
    }

    const authUsersById = new Map(
      authUsers.map((user) => [user.id, user]),
    );

    const formattedData = (clientsResult.data || []).map((client) => ({
      ...client,
      last_sign_in_at:
        authUsersById.get(client.id)?.last_sign_in_at || null,
    }));

    return json({ success: true, data: formattedData });
  } catch (error) {
    console.error("[Admin/Clientes][GET] Erro:", error);

    return json(
      {
        success: false,
        message: "Não foi possível carregar os clientes.",
      },
      500,
    );
  }
}

// DELETE /api/admin/clientes?id=... -> exclui cliente
export async function DELETE(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("id");

    if (!isValidUuid(clientId)) {
      return json(
        { success: false, message: "ID do cliente inválido." },
        400,
      );
    }

    const client = await getClientOrNull(db, clientId);

    if (!client) {
      return json(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const { data: cases, error: casesError } = await db
      .from("casos")
      .select("id")
      .eq("cliente_id", clientId);

    if (casesError) {
      throw new Error(`Falha ao consultar casos do cliente: ${casesError.message}`);
    }

    const caseIds = (cases || []).map((item) => item.id);

    if (caseIds.length > 0) {
      await executeDelete(
        db,
        "mensagens",
        (query) => query.in("caso_id", caseIds),
        "Falha ao excluir mensagens",
      );
      await executeDelete(
        db,
        "case_interests",
        (query) => query.in("case_id", caseIds),
        "Falha ao excluir interesses",
      );
      await executeDelete(
        db,
        "casos",
        (query) => query.in("id", caseIds),
        "Falha ao excluir casos",
      );
    }

    await executeDelete(
      db,
      "notificacoes",
      (query) => query.eq("user_id", clientId),
      "Falha ao excluir notificações",
    );

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(clientId);

    if (authDeleteError) {
      throw new Error(`Falha ao excluir usuário do Auth: ${authDeleteError.message}`);
    }

    await executeDelete(
      db,
      "clientes",
      (query) => query.eq("id", clientId),
      "Falha ao excluir perfil do cliente",
    );

    return json({
      success: true,
      message: "Cliente excluído com sucesso.",
    });
  } catch (error) {
    console.error("[Admin/Clientes][DELETE] Erro:", error);

    return json(
      {
        success: false,
        message:
          "Não foi possível concluir a exclusão. Nenhuma nova tentativa deve ser feita antes de verificar os logs do servidor.",
      },
      500,
    );
  }
}

// PATCH /api/admin/clientes?id=... -> envia link de redefinição
export async function PATCH(request) {
  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { db } = access;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("id");

    if (!isValidUuid(clientId)) {
      return json(
        { success: false, message: "ID do cliente inválido." },
        400,
      );
    }

    const client = await getClientOrNull(db, clientId);

    if (!client) {
      return json(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    await sendRecoveryEmail(client);

    return json({
      success: true,
      message: "Link de redefinição enviado ao e-mail do cliente.",
    });
  } catch (error) {
    console.error("[Admin/Clientes][PATCH] Erro:", error);

    return json(
      {
        success: false,
        message: "Não foi possível enviar o link de redefinição.",
      },
      500,
    );
  }
}
