import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = supabaseAdmin;
    const email = "valdiralves@adv.oabsp.org.br";

    // 1. Buscar o advogado pelo email
    const { data: lawyer, error: lError } = await db
      .from("advogados")
      .select("id, name, email, balance, is_premium, created_at")
      .eq("email", email)
      .single();

    if (lError || !lawyer) {
      return NextResponse.json({ success: false, message: "Advogado não encontrado no banco de dados." });
    }

    // 2. Buscar interesses (onde gastou Juri)
    const { data: interests, count: interestsCount, error: iError } = await db
      .from("case_interests")
      .select("id, case_id, status, created_at", { count: "exact" })
      .eq("lawyer_id", lawyer.id)
      .order("created_at", { ascending: false });

    // 3. Buscar casos onde ele é o advogado (gastou juris em chats)
    const { data: casesAsLawyer, count: casesCount, error: cError } = await db
      .from("casos")
      .select("id, titulo, status, chat_started_at")
      .eq("advogado_id", lawyer.id);

    // 4. Buscar se ele usou algum cupom (que pode ter vindo com juris)
    const { data: cupons } = await db
      .from("cupom_usos")
      .select("*")
      .eq("advogado_id", lawyer.id);

    return NextResponse.json({
      success: true,
      investigation: {
        perfil: lawyer,
        financeiro: {
          saldo_atual: lawyer.balance,
          interesses_totais: interestsCount || 0,
          atendimentos_diretos: casesCount || 0,
          cupons_usados: cupons || []
        },
        historico_interesses: (interests || []).slice(0, 10),
        detalhe_atendimentos: casesAsLawyer || []
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
