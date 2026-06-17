import {
  deleteAdminLawyer,
  sendAdminLawyerPasswordReset,
  updateAdminLawyer,
} from "./adminLawyersWrite";
import { getAdminLawyers } from "./adminLawyersRead";
import { isValidUuid, json, requireAdmin } from "./adminLawyersUtils";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingAuthUser(error) {
  if (!error) return false;

  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  const status = Number(error?.status || error?.statusCode || 0);

  return (
    status === 404 ||
    code === "user_not_found" ||
    code === "not_found" ||
    message.includes("user not found") ||
    message.includes("usuario nao encontrado") ||
    message.includes("usuário não encontrado")
  );
}

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

    const financialLedgerEntriesPreserved = ledgerError
      ? 0
      : Number(count || 0);

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
        oab_verification_status: "ERROR",
        is_premium: false,
        premium_expires_at: null,
        plan_type: "FREE",
        google_refresh_token: null,
        google_sync_enabled: false,
      })
      .eq("id", lawyerId)
      .select("id")
      .maybeSingle();

    if (!error && !data) {
      const { data: remainingLawyer, error: lookupError } = await access.db
        .from("advogados")
        .select("id")
        .eq("id", lawyerId)
        .maybeSingle();

      if (!lookupError && !remainingLawyer) {
        return json({
          success: true,
          message: "Advogado removido com sucesso.",
          data: {
            lawyerId,
            alreadyRemoved: true,
          },
        });
      }
    }

    if (error || !data) {
      console.error(
        "[Admin/Advogados][DELETE] Falha no fallback de anonimização:",
        error,
      );
      return primaryResponse;
    }

    const { error: authDeleteError } =
      await supabaseAdmin.auth.admin.deleteUser(lawyerId);

    const authUserAlreadyMissing = isMissingAuthUser(authDeleteError);

    if (authDeleteError && !authUserAlreadyMissing) {
      console.error(
        "[Admin/Advogados][DELETE] Perfil anonimizado, mas falha ao remover acesso no Auth:",
        authDeleteError,
      );
    }

    console.info(
      "[Admin/Advogados][DELETE] Perfil anonimizado com ledger preservado",
      {
        lawyerId,
        adminId: access.auth.admin.id,
        authUserAlreadyMissing,
        financialLedgerEntriesPreserved,
      },
    );

    return json({
      success: true,
      message:
        "Conta removida da operação e dados pessoais anonimizados. O histórico financeiro obrigatório foi preservado.",
      data: {
        lawyerId,
        anonymized: true,
        authUserAlreadyMissing,
        financialLedgerEntriesPreserved,
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
