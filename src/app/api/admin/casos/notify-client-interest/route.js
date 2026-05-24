import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { interesseCasoTemplate } from "@/lib/emailTemplates";
import { createClient } from "@/lib/supabaseServer";

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

export async function POST(request) {
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

    const isAdmin = await ensureAdmin(supabaseAdmin || supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { casoId } = await request.json();
    if (!casoId) {
      return NextResponse.json(
        { success: false, message: "ID do caso ausente" },
        { status: 400 },
      );
    }

    // Buscar o caso e o cliente associado
    const { data: caso, error: casoErr } = await supabaseAdmin
      .from("casos")
      .select("id, titulo, cliente_id")
      .eq("id", casoId)
      .single();

    if (casoErr || !caso) {
      return NextResponse.json(
        { success: false, message: "Caso não encontrado" },
        { status: 404 },
      );
    }

    const { data: cliente, error: cliErr } = await supabaseAdmin
      .from("clientes")
      .select("email, name")
      .eq("id", caso.cliente_id)
      .single();

    if (cliErr || !cliente || !cliente.email) {
      return NextResponse.json(
        { success: false, message: "Cliente não possui email cadastrado" },
        { status: 400 },
      );
    }

    // Buscar os interesses pendentes deste caso
    const { data: interests, error: intErr } = await supabaseAdmin
      .from("case_interests")
      .select("lawyer_id")
      .eq("case_id", casoId)
      .eq("status", "PENDING");

    if (intErr || !interests || interests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Este caso não possui interesses pendentes",
        },
        { status: 400 },
      );
    }

    // Buscar os nomes dos advogados usando join map
    const lawyerIds = interests.map((i) => i.lawyer_id);
    const { data: lawyers } = await supabaseAdmin
      .from("advogados")
      .select("name")
      .in("id", lawyerIds);

    const lawyerNamesArr = (lawyers || []).map((l) => l.name);

    if (lawyerNamesArr.length === 0) {
      return NextResponse.json(
        { success: false, message: "Nenhum advogado ativo encontrado." },
        { status: 400 },
      );
    }

    let namesStr = lawyerNamesArr[0];
    if (lawyerNamesArr.length > 1) {
      namesStr =
        lawyerNamesArr.slice(0, -1).join(", ") +
        " e " +
        lawyerNamesArr[lawyerNamesArr.length - 1];
    }

    const html = interesseCasoTemplate({
      clientName: cliente.name || "Cliente",
      titulo: caso.titulo || "Caso sem título",
      lawyerName: namesStr,
    });

    await resend.emails.send({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: cliente.email,
      subject:
        lawyerNamesArr.length > 1
          ? "⚖️ Advogados interessados no seu caso!"
          : "⚖️ Advogado interessado no seu caso!",
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Email enviado com sucesso!",
    });
  } catch (error) {
    console.error("Erro na API notify-client-interest:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno: " + error.message },
      { status: 500 },
    );
  }
}

if (cliente?.id) {
  await sendPushNotification({
    userIds: [cliente.id],
    title: "Novo interesse no seu caso",
    message: `Um advogado demonstrou interesse no caso "${caso.titulo}".`,
    url: "/dashboard/cliente",
  });
}
