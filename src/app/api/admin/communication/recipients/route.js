import {
  json,
  requireAdminCommunicationAccess,
} from "../adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECIPIENT_TYPES = new Set(["lawyers", "clients", "advertisers"]);

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function normalizeRecipient(item, type) {
  if (type === "advertisers") {
    const email = isEmail(item.email)
      ? item.email
      : isEmail(item.username)
        ? item.username
        : "";

    return {
      id: item.id,
      name: item.nome_empresa || item.username || "Anunciante",
      email,
    };
  }

  return {
    id: item.id,
    name: item.name || "Usuário",
    email: item.email || "",
  };
}

async function listAdvertisers(db) {
  const withEmail = await db
    .from("anunciantes")
    .select("id, username, nome_empresa, email")
    .order("nome_empresa", { ascending: true });

  if (!withEmail.error) return withEmail;

  const fallback = await db
    .from("anunciantes")
    .select("id, username, nome_empresa")
    .order("nome_empresa", { ascending: true });

  return fallback;
}

export async function GET(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const type = String(searchParams.get("type") || "").trim();

    if (!RECIPIENT_TYPES.has(type)) {
      return json(
        { success: false, message: "Tipo de destinatário inválido." },
        400,
      );
    }

    let result;

    if (type === "lawyers") {
      result = await access.db
        .from("advogados")
        .select("id, name, email")
        .order("name", { ascending: true });
    } else if (type === "clients") {
      result = await access.db
        .from("clientes")
        .select("id, name, email")
        .order("name", { ascending: true });
    } else {
      result = await listAdvertisers(access.db);
    }

    if (result.error) {
      throw new Error(`Falha ao consultar destinatários: ${result.error.message}`);
    }

    return json({
      success: true,
      data: (result.data || []).map((item) => normalizeRecipient(item, type)),
    });
  } catch (error) {
    console.error("[Admin/Comunicação/Destinatários][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar os destinatários.",
      },
      500,
    );
  }
}
