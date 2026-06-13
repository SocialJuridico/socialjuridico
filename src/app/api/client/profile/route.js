import {
  clientJson,
  normalizeClientText,
  requireClientUser,
  safeClientError,
  validateClientMutationOrigin,
} from "@/lib/clientDashboard/clientServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const name = normalizeClientText(body?.name, 160);
    const phone = String(body?.phone || "")
      .replace(/\D/g, "")
      .slice(0, 15);

    if (name.length < 3) {
      return clientJson(
        { success: false, message: "Informe um nome válido." },
        400,
      );
    }

    if (phone && phone.length < 10) {
      return clientJson(
        { success: false, message: "Informe um telefone válido." },
        400,
      );
    }

    const { data, error } = await access.db
      .from("clientes")
      .update({ name, phone })
      .eq("id", access.user.id)
      .select("id, name, email, role, phone, avatar, bio, created_at")
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar perfil: ${error.message}`);
    }

    if (!data) {
      return clientJson(
        { success: false, message: "Perfil do cliente não encontrado." },
        404,
      );
    }

    return clientJson({
      success: true,
      data,
      message: "Perfil atualizado com sucesso.",
    });
  } catch (error) {
    return safeClientError(error, "Não foi possível atualizar o perfil.");
  }
}
