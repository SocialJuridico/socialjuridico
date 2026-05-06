import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

// GET /api/admin/advogados -> lista advogados cadastrados
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { data, error } = await db
      .from("advogados")
      .select("id, name, email, phone, oab, estado, is_premium, premium_expires_at, balance, created_at, oab_verification_status, plan_type")
      .order("created_at", { ascending: false });

    if (error) throw error;

    let authUsers = [];
    if (supabaseAdmin) {
      const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (!authError) authUsers = users || [];
    }

    const formattedData = (data || []).map(adv => {
      const authUser = authUsers.find(u => u.id === adv.id);
      return {
        ...adv,
        last_sign_in_at: authUser ? authUser.last_sign_in_at : null
      };
    });

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Erro na API GET /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/advogados?id=... -> exclui advogado
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const advogadoId = searchParams.get("id");

    if (!advogadoId) {
      return NextResponse.json(
        { success: false, message: "ID do advogado é obrigatório" },
        { status: 400 },
      );
    }

    await db.from("mensagens").delete().eq("sender_id", advogadoId);
    await db.from("case_interests").delete().eq("lawyer_id", advogadoId);
    await db.from("notificacoes").delete().eq("user_id", advogadoId);

    await db
      .from("casos")
      .update({
        advogado_id: null,
        status: "ABERTO",
        updated_at: new Date().toISOString(),
      })
      .eq("advogado_id", advogadoId);

    const { error: deleteError } = await db
      .from("advogados")
      .delete()
      .eq("id", advogadoId);

    if (deleteError) throw deleteError;

    if (supabaseAdmin) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(advogadoId);
      if (authDeleteError) {
        console.error("Falha ao remover advogado do Auth:", authDeleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Advogado excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro na API DELETE /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/advogados?id=... -> resetar senha do advogado
export async function PATCH(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const advogadoId = searchParams.get("id");

    if (!advogadoId) {
      return NextResponse.json(
        { success: false, message: "ID do advogado é obrigatório" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "Service Role não configurada no servidor" },
        { status: 500 },
      );
    }

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(advogadoId, {
        password: "socialjuridico1!",
        user_metadata: {
          needs_password_update: true,
        },
      });

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: "Senha resetada para o padrão com sucesso",
    });
  } catch (error) {
    console.error("Erro na API PATCH /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
// PUT /api/admin/advogados -> Gerenciar PRO e Balance
export async function PUT(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;
    const isAdmin = await ensureAdmin(db, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { lawyerId, action, value } = await request.json();

    if (!lawyerId || !action) {
      return NextResponse.json(
        { success: false, message: "Parâmetros inválidos" },
        { status: 400 },
      );
    }

    // 1. Buscar o advogado
    const { data: lawyer, error: lError } = await db
      .from("advogados")
      .select("id, is_premium, balance, name, email, oab_verification_status")
      .eq("id", lawyerId)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json(
        { success: false, message: "Advogado não encontrado" },
        { status: 404 },
      );
    }

    const updates = {};

    if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
      const planType = value?.planType || 'PRO';
      const days = Number(value?.days || 30);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      
      updates.is_premium = true;
      updates.plan_type = planType;
      updates.premium_expires_at = expiresAt.toISOString();
    } else if (action === "ADD_JURIS") {
      const amountToAdd = Number(value);
      if (isNaN(amountToAdd)) {
        return NextResponse.json(
          { success: false, message: "Valor de Juris inválido" },
          { status: 400 },
        );
      }
      updates.balance = (lawyer.balance || 0) + amountToAdd;
    } else if (action === "REMOVE_JURIS") {
      const amountToRemove = Number(value);
      if (isNaN(amountToRemove)) {
        return NextResponse.json(
          { success: false, message: "Valor de Juris inválido" },
          { status: 400 },
        );
      }
      // Garante que o saldo não fique negativo (opcional, dependendo da regra de negócio)
      updates.balance = Math.max(0, (lawyer.balance || 0) - amountToRemove);
    } else if (action === "REMOVE_PRO") {
      updates.is_premium = false;
      updates.plan_type = 'FREE';
      updates.premium_expires_at = null;
    } else if (action === "SET_OAB_STATUS") {
      if (!["PENDING", "VERIFIED", "ERROR"].includes(value)) {
        return NextResponse.json(
          { success: false, message: "Status de OAB inválido" },
          { status: 400 },
        );
      }
      updates.oab_verification_status = value;

      // Disparar e-mail de parabéns apenas se o status mudar para VERIFIED
      if (value === "VERIFIED" && lawyer.oab_verification_status !== "VERIFIED") {
        try {
          const { resend } = await import("@/lib/resend");
          await resend.emails.send({
            from: "SocialJurídico <contato@socialjuridico.com.br>",
            to: lawyer.email,
            subject: "🎉 Parabéns! Sua OAB foi verificada no SocialJurídico",
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #d4af37;">Parabéns, ${lawyer.name}! 🎓</h2>
                <p style="font-size: 16px;">Sua documentação foi aprovada com sucesso e sua OAB acaba de ser verificada em nossa plataforma.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                  <p style="margin-top: 0; font-weight: bold; font-size: 16px;">O que isso significa para você?</p>
                  <ul style="margin-bottom: 0; padding-left: 20px;">
                    <li style="margin-bottom: 8px;">Seu perfil e seus chats agora exibem o <strong style="color: #10b981;">Selo Verde de Confiança</strong> (OAB Verificada).</li>
                    <li>Você transmite muito mais segurança aos cidadãos, <strong>aumentando em até 3x</strong> suas chances de ser contratado.</li>
                  </ul>
                </div>
                <p style="font-size: 16px;">Acesse o seu painel agora mesmo para conferir o seu novo selo de destaque nas buscas e em seu perfil.</p>
                <br/>
                <a href="https://socialjuridico.com.br/login" style="display: inline-block; padding: 14px 28px; background-color: #d4af37; color: #000; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Acessar meu Painel</a>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("Erro ao disparar email de OAB Verificada:", emailErr);
        }
      }
    } else if (action === "UPDATE_OAB") {
      const { oab, estado } = value;
      if (!oab || !estado) {
        return NextResponse.json(
          { success: false, message: "OAB e Estado são obrigatórios" },
          { status: 400 },
        );
      }
      updates.oab = oab;
      updates.estado = estado;
    }

    const { error: updateError } = await db
      .from("advogados")
      .update(updates)
      .eq("id", lawyerId);

    if (updateError) throw updateError;

    // Se o saldo foi reduzido manualmente pelo Admin, também acionamos o alerta de estoque baixo se necessário
    if (action === "REMOVE_JURIS" && updates.balance !== undefined) {
      await checkAndNotifyLowBalance(lawyerId, lawyer.balance || 0, updates.balance);
    }

    return NextResponse.json({
      success: true,
      message: "Advogado atualizado com sucesso",
    });
  } catch (error) {
    console.error("Erro na API PUT /api/admin/advogados:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
