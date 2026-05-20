import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Helper to authenticate the requester and return officeId + user profile (Admin or Secretary)
async function getSessionInfo() {
  const cookieStore = await cookies();
  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  
  // 1. Check if logged in as the Office Administrator
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        officeId: decoded.id,
        user: {
          id: decoded.id,
          name: `${decoded.nome} (Gestor)`,
          cargo: "admin",
          permissoes: {
            ver_gestao: true,
            ver_comunicacao: true,
            ver_metricas: true,
            ver_notificacoes: true,
            ver_financeiro: true
          }
        }
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Check if logged in as a normal staff member (Secretary / Lawyer)
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: adv, error: advError } = await db
        .from("advogados")
        .select("id, name, cargo, escritorio_id, permissoes")
        .eq("id", user.id)
        .single();
      
      if (adv && adv.escritorio_id && !advError) {
        return {
          officeId: adv.escritorio_id,
          user: {
            id: adv.id,
            name: adv.name,
            cargo: adv.cargo || "advogado",
            permissoes: adv.permissoes || {}
          }
        };
      }
    }
  } catch (e) {
    console.error("Erro ao obter usuario autenticado:", e);
  }

  return { officeId: null, user: null };
}

// Pre-populate default subcategories if none exist for this office (strictly using Supabase client)
async function ensureDefaultSubcategories(db, officeId) {
  if (!officeId) return;
  try {
    const { count, error } = await db
      .from("escritorio_subcategorias")
      .select("*", { count: "exact", head: true })
      .eq("escritorio_id", officeId);
    
    if (!error && count === 0) {
      console.log(`Pre-populando subcategorias padrao para o escritorio ${officeId} via Supabase...`);
      const defaults = [
        // DESPESA categories
        { tipo: "DESPESA", cat: "Copa & Limpeza", subs: ["Café e Açúcar", "Material de Limpeza", "Copa Geral"] },
        { tipo: "DESPESA", cat: "Pessoal & Encargos", subs: ["Salários CLT", "Bolsas de Estagiários", "Pró-Labore", "Vales e Benefícios"] },
        { tipo: "DESPESA", cat: "Repasses & Comissões", subs: ["Comissões Associados", "Comissão p/ Parceiros"] },
        { tipo: "DESPESA", cat: "Tecnologia & Softwares", subs: ["Assinatura SocialJurídico", "Outros Softwares", "Certificados e Tokens"] },
        { tipo: "DESPESA", cat: "Ocupação & Consumo", subs: ["Aluguel e Condomínio", "Energia e Água", "Internet e Telefone"] },
        { tipo: "DESPESA", cat: "Comercial & Marketing", subs: ["Anúncios Patrocinados", "Papelaria e Cartões", "Eventos"] },
        { tipo: "DESPESA", cat: "Tributos & OAB", subs: ["DAS Simples Nacional", "Anuidade OAB", "ISS e Taxas"] },
        { tipo: "DESPESA", cat: "Outros", subs: ["Outros"] },

        // RECEITA categories
        { tipo: "RECEITA", cat: "Honorários Contratuais", subs: ["Retainer / Assessoria Mensal", "Honorários Iniciais"] },
        { tipo: "RECEITA", cat: "Honorários de Êxito", subs: ["Porcentagem sobre Vitória"] },
        { tipo: "RECEITA", cat: "Honorários Sucumbenciais", subs: ["Sucumbência Fixada em Juízo"] },
        { tipo: "RECEITA", cat: "Consultoria", subs: ["Elaboração de Pareceres", "Consultas Jurídicas Avulsas"] },
        { tipo: "RECEITA", cat: "Reembolso de Custas", subs: ["Custas Judiciais Reembolsadas", "Despesas Viagem"] },
        { tipo: "RECEITA", cat: "Outros", subs: ["Outras Receitas"] }
      ];

      const rowsToInsert = [];
      for (const item of defaults) {
        for (const sub of item.subs) {
          rowsToInsert.push({
            escritorio_id: officeId,
            tipo: item.tipo,
            categoria: item.cat,
            nome: sub
          });
        }
      }

      await db.from("escritorio_subcategorias").insert(rowsToInsert);
    }
  } catch (e) {
    console.error("Erro ao pre-popular subcategorias via Supabase:", e);
  }
}

export async function GET() {
  try {
    const { officeId, user } = await getSessionInfo();

    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    // Check permissions if secretary
    if (user.cargo === "secretaria" && !user.permissoes.ver_financeiro) {
      return NextResponse.json({ success: false, message: "Acesso financeiro restrito pelo Administrador." }, { status: 403 });
    }

    // Ensure the defaults exist
    await ensureDefaultSubcategories(db, officeId);

    // 1. Query transactions
    const { data: trans, error: transError } = await db
      .from("escritorio_financeiro")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("data_competencia", { ascending: false });

    if (transError) throw transError;

    // 2. Query custom subcategories
    const { data: subcategories, error: subError } = await db
      .from("escritorio_subcategorias")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });

    if (subError) throw subError;

    // Compile financial summaries
    let totalReceitas = 0;
    let totalDespesas = 0;
    const categoryDistribution = {};

    (trans || []).forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo === "RECEITA") {
        totalReceitas += val;
      } else {
        totalDespesas += val;
        // Group despesas by category
        categoryDistribution[t.categoria] = (categoryDistribution[t.categoria] || 0) + val;
      }
    });

    const saldoAtual = totalReceitas - totalDespesas;

    return NextResponse.json({
      success: true,
      trans: trans || [],
      subcategories: subcategories || [],
      summary: {
        totalReceitas: Math.round(totalReceitas * 100) / 100,
        totalDespesas: Math.round(totalDespesas * 100) / 100,
        saldoAtual: Math.round(saldoAtual * 100) / 100,
        categoryDistribution
      }
    });
  } catch (error) {
    console.error("Erro na API GET /api/escritorio/financeiro:", error);
    return NextResponse.json({ success: false, message: "Erro interno", error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { officeId, user } = await getSessionInfo();

    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    // Check permissions if secretary
    if (user.cargo === "secretaria" && !user.permissoes.ver_financeiro) {
      return NextResponse.json({ success: false, message: "Acesso financeiro restrito." }, { status: 403 });
    }

    // Ensure defaults exist
    await ensureDefaultSubcategories(db, officeId);

    const body = await req.json();
    const { action } = body;

    // Ação: Lançar Movimentação Financeira
    if (action === "ADD_ENTRY") {
      const { tipo, categoria, subcategoria, descricao, valor, data_competencia, status } = body;
      
      if (!tipo || !categoria || !subcategoria || !valor) {
        return NextResponse.json({ success: false, message: "Preencha todos os campos obrigatórios." }, { status: 400 });
      }

      const { data, error } = await db
        .from("escritorio_financeiro")
        .insert({
          escritorio_id: officeId,
          tipo,
          categoria,
          subcategoria,
          descricao: descricao || "",
          valor: Number(valor),
          data_competencia: data_competencia || new Date().toISOString().split("T")[0],
          status: status || "PAGO"
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Lançamento adicionado com sucesso!", data });
    }

    // Ação: Excluir Movimentação Financeira
    if (action === "DELETE_ENTRY") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: "ID inválido." }, { status: 400 });
      }

      const { error } = await db
        .from("escritorio_financeiro")
        .delete()
        .eq("id", id)
        .eq("escritorio_id", officeId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Lançamento excluído com sucesso!" });
    }

    // Ação: Adicionar Subcategoria Customizada
    if (action === "ADD_SUBCATEGORY") {
      const { tipo, categoria, nome } = body;
      if (!tipo || !categoria || !nome) {
        return NextResponse.json({ success: false, message: "Dados incompletos para subcategoria." }, { status: 400 });
      }

      const trimmedName = nome.trim();
      if (!trimmedName) {
        return NextResponse.json({ success: false, message: "O nome não pode estar em branco." }, { status: 400 });
      }

      const { data, error } = await db
        .from("escritorio_subcategorias")
        .insert({
          escritorio_id: officeId,
          tipo,
          categoria,
          nome: trimmedName
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") { // Unique constraint violation
          return NextResponse.json({ success: false, message: "Esta subcategoria já existe nesta categoria." }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({ success: true, message: "Subcategoria criada com sucesso!", data });
    }

    // Ação: Excluir Subcategoria Customizada
    if (action === "DELETE_SUBCATEGORY") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: "ID de subcategoria inválido." }, { status: 400 });
      }

      const { error } = await db
        .from("escritorio_subcategorias")
        .delete()
        .eq("id", id)
        .eq("escritorio_id", officeId);

      if (error) throw error;

      return NextResponse.json({ success: true, message: "Subcategoria excluída com sucesso!" });
    }

    return NextResponse.json({ success: false, message: "Ação não suportada." }, { status: 400 });
  } catch (error) {
    console.error("Erro na API POST /api/escritorio/financeiro:", error);
    return NextResponse.json({ success: false, message: "Erro interno", error: error.message }, { status: 500 });
  }
}
