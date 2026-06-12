import {
  deleteAdminLawyer,
  sendAdminLawyerPasswordReset,
  updateAdminLawyer,
} from "./adminLawyersWrite";
import { getAdminLawyers } from "./adminLawyersRead";
import { isValidUuid, json, requireAdmin } from "./adminLawyersUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return getAdminLawyers();
}

export async function DELETE(request) {
  const primaryResponse = await deleteAdminLawyer(request);

  if (primaryResponse.status !== 500) {
    return primaryResponse;
  }

  try {
    const access = await requireAdmin();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const lawyerId = searchParams.get("id");

    if (!isValidUuid(lawyerId)) {
      return primaryResponse;
    }

    const { count, error: ledgerError } = await access.db
      .from("transacoes")
      .select("id", { count: "exact", head: true })
      .eq("advogado_id", lawyerId);

    if (ledgerError || Number(count || 0) === 0) {
      return primaryResponse;
    }

    const normalizedId = lawyerId.replace(/-/g, "");
    const { data, error } = await access.db
      .from("advogados")
      .update({
        email: `deleted+${normalizedId}@socialjuridico.invalid`,
        name: "Usuário excluído",
        avatar: null,
        phone: null,
        bio: null,
        oab: `EXCLUIDO-${normalizedId.slice(0, 12).toUpperCase()}`,
        specialties: null,
        verified: false,
        is_premium: false,
        premium_expires_at: null,
        plan_type: "FREE",
        google_refresh_token: null,
        google_sync_enabled: false,
      })
      .eq("id", lawyerId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      console.error(
        "[Admin/Advogados][DELETE] Falha no fallback de anonimização:",
        error,
      );
      return primaryResponse;
    }

    console.info(
      "[Admin/Advogados][DELETE] Perfil anonimizado com ledger preservado",
      {
        lawyerId,
        adminId: access.auth.admin.id,
        financialLedgerEntriesPreserved: Number(count || 0),
      },
    );

    return json({
      success: true,
      message:
        "Conta removida da operação e dados pessoais anonimizados. O histórico financeiro obrigatório foi preservado.",
      data: {
        lawyerId,
        anonymized: true,
        financialLedgerEntriesPreserved: Number(count || 0),
      },
    });
  } catch (fallbackError) {
    console.error(
      "[Admin/Advogados][DELETE] Erro no fallback de anonimização:",
      fallbackError,
    );
    return primaryResponse;
  }
}

export async function PATCH(request) {
  return sendAdminLawyerPasswordReset(request);
}

export async function PUT(request) {
  return updateAdminLawyer(request);
}
