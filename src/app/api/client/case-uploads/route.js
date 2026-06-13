import {
  clientJson,
  requireClientUser,
  safeClientError,
  validateClientMutationOrigin,
} from "@/lib/clientDashboard/clientServer";
import {
  issueCaseUploadTicket,
  removeCaseUpload,
} from "@/lib/clientDashboard/caseUploadServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const ticket = await issueCaseUploadTicket(access.db, access.user.id, body);

    return clientJson(
      {
        success: true,
        data: ticket,
        message: "Autorização de upload emitida.",
      },
      201,
    );
  } catch (error) {
    return safeClientError(
      error,
      "Não foi possível preparar o envio do arquivo.",
    );
  }
}

export async function DELETE(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const uploadId = String(searchParams.get("id") || "").trim();

    if (!uploadId) {
      return clientJson(
        { success: false, message: "Identificador do upload ausente." },
        400,
      );
    }

    const result = await removeCaseUpload(
      access.db,
      access.user.id,
      uploadId,
    );

    return clientJson({
      success: true,
      data: result,
      message: result.removed ? "Arquivo removido." : "Arquivo já não existia.",
    });
  } catch (error) {
    return safeClientError(error, "Não foi possível remover o arquivo.");
  }
}
