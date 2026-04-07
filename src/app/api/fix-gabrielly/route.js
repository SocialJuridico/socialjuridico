import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = supabaseAdmin;
    const email = "gabriellysm.adv@hotmail.com";

    // 1. Buscar o advogado pelo email
    const { data: lawyer, error: lError } = await db
      .from("advogados")
      .select("id, name, email, balance")
      .eq("email", email)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json({ success: false, message: "Advogado não encontrado." });
    }

    // 2. Atualizar o saldo (adicionar 20)
    const newBalance = (lawyer.balance || 0) + 20;
    
    const { error: updateError } = await db
      .from("advogados")
      .update({ balance: newBalance })
      .eq("id", lawyer.id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: `Sucesso! Saldo de ${lawyer.name} atualizado de ${lawyer.balance || 0} para ${newBalance}.`,
      new_balance: newBalance
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
