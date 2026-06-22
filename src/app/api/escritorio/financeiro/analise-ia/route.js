import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getSessionInfo() {
  const cookieStore = await cookies();
  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  
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

export async function GET(request) {
  try {
    const { officeId, user } = await getSessionInfo();

    if (!officeId) {
      return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });
    }

    if (user.cargo === "secretaria" && !user.permissoes.ver_financeiro) {
      return NextResponse.json({ success: false, message: "Acesso restrito pelo Administrador." }, { status: 403 });
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || new Date().getMonth() + 1, 10);
    const year = parseInt(searchParams.get("year") || new Date().getFullYear(), 10);

    // 1. Fetch office data for tax info
    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("nome, cnpj, nome_responsavel")
      .eq("id", officeId)
      .single();

    if (officeError || !office) {
      return NextResponse.json({ success: false, message: "Escritório não encontrado." }, { status: 404 });
    }

    // 2. Fetch all transactions for the targeted month and year
    // Since data_competencia is stored as date, we can fetch all and filter by UTC/local month & year
    const { data: trans, error: transError } = await db
      .from("escritorio_financeiro")
      .select("*")
      .eq("escritorio_id", officeId)
      .order("data_competencia", { ascending: true });

    if (transError) {
      return NextResponse.json({ success: false, message: "Erro ao buscar transações." }, { status: 500 });
    }

    // Filter to selected month & year
    const filteredTrans = (trans || []).filter(t => {
      const d = new Date(t.data_competencia);
      return (d.getUTCMonth() + 1) === month && d.getUTCFullYear() === year;
    });

    if (filteredTrans.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: `### 📊 Parecer de Fechamento Contábil Inteligente com IA
        
**Período:** ${String(month).padStart(2, "0")}/${year}
**Escritório:** ${office.nome}
**CNPJ:** ${office.cnpj}

---

**Nenhum lançamento registrado no período.**
Para que a Inteligência Artificial faça a análise fiscal do mês e redija as diretrizes contábeis legais, por favor, realize o lançamento das receitas e despesas do escritório para este mês.
`
      });
    }

    // 3. Compile financial summaries
    let totalReceitas = 0;
    let totalDespesas = 0;
    const catSummary = {};
    const transactionsList = [];

    filteredTrans.forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo === "RECEITA") {
        totalReceitas += val;
      } else {
        totalDespesas += val;
      }

      if (!catSummary[t.categoria]) {
        catSummary[t.categoria] = { total: 0, subcategories: {} };
      }
      catSummary[t.categoria].total += val;

      if (!catSummary[t.categoria].subcategories[t.subcategoria]) {
        catSummary[t.categoria].subcategories[t.subcategoria] = 0;
      }
      catSummary[t.categoria].subcategories[t.subcategoria] += val;

      transactionsList.push({
        data: t.data_competencia,
        tipo: t.tipo,
        categoria: t.categoria,
        subcategoria: t.subcategoria,
        valor: val,
        descricao: t.descricao || ""
      });
    });

    const saldo = totalReceitas - totalDespesas;

    // 4. Construct AI System & User Prompt
    const systemPrompt = `Você é um Contador Tributarista e Consultor Financeiro de Elite, especializado na legislação contábil e fiscal de Sociedades de Advogados no Brasil.
Sua missão é gerar um Parecer de Fechamento Contábil Mensal de altíssima qualidade técnica para ser enviado ao contador do escritório e arquivado como relatório de conformidade corporativa.

O documento gerado deve seguir estritamente as melhores práticas fiscais e a legislação brasileira.
Sua análise deve obrigatoriamente abranger os seguintes tópicos de conformidade:
1. Simples Nacional (Anexo IV): Lembre o escritório de que sociedades de advogados enquadradas no Simples Nacional recolhem a contribuição patronal previdenciária (CPP) à parte (não inclusa na guia DAS unificada), e por isso a folha de pagamento de pessoal e estagiários tem impactos diretos de 20% de INSS patronal, exceto estagiários (Lei 11.788/08).
2. Segregação de Reembolso de Custas Judiciais (Solução de Consulta COSIT nº 387 de 2017 da Receita Federal): Destaque a importância de segregar receitas de 'Reembolso de Custas' para que NÃO entrem na base de cálculo tributária da guia DAS, desde que comprovadas por recibos em nome do cliente.
3. Distribuição Isenta de Lucros: Explique que o escritório pode distribuir dividendos acima da presunção de 32% (do Lucro Presumido) com 100% de isenção de Imposto de Renda, desde que mantenha escrituração regular do Livro Caixa (Lei nº 9.249/95).
4. Documentação Idônea: Oriente sobre quais despesas exigem nota fiscal (NF-e) (ex: softwares, aluguel corporativo com recibo idôneo, serviços de terceiros) vs. despesas de copa e consumo diário simples.

Gere o relatório em formato MARKDOWN perfeitamente formatado, elegante, com tom altamente profissional, técnico e com recomendações práticas focadas no crescimento sustentável do escritório.`;

    const userPrompt = `Abaixo estão os dados financeiros do escritório de advocacia para o mês de referência:

**DADOS DO ESCRITÓRIO:**
- Nome: ${office.nome}
- CNPJ: ${office.cnpj}
- Responsável: ${office.nome_responsavel}
- Mês de Referência: ${String(month).padStart(2, "0")}/${year}

**MÉTRICAS DO MÊS:**
- Total de Receitas: R$ ${totalReceitas.toFixed(2)}
- Total de Despesas: R$ ${totalDespesas.toFixed(2)}
- Saldo Líquido do Mês: R$ ${saldo.toFixed(2)}

**DISTRIBUIÇÃO POR CATEGORIA E SUBCATEGORIA:**
${JSON.stringify(catSummary, null, 2)}

**LISTA DE TRANSAÇÕES DO MÊS:**
${JSON.stringify(transactionsList, null, 2)}

Por favor, elabore o **Parecer de Fechamento Contábil e Inteligência Fiscal**.
O parecer deve conter as seguintes seções estruturadas:
1. 📊 **Sumário do Fechamento & Desempenho** (Análise dos números do mês, margem de lucro e eficiência do caixa).
2. ⚖️ **Auditoria Tributária & Legislação Aplicável** (Comentários personalizados com base nos lançamentos reais: mencione o Simples Nacional Anexo IV se houver folha de pagamento, comissão ou estágio; mencione a Solução de Consulta Cosit 387/2017 se houver reembolso de custas; mencione retenções na fonte se aplicável).
3. 📋 **Diretrizes para envio ao Escritório de Contabilidade** (Orientações exatas de quais documentos comprobatórios - notas, contratos, recibos - o escritório precisa encaminhar para o contador validar este mês).
4. 💡 **Recomendações Estratégicas da IA** (Mínimo 3 conselhos contábeis ou de otimização de custos customizados para a realidade dos lançamentos deste mês).`;

    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
    });

    const analysis = completion.choices[0].message.content;

    return NextResponse.json({ success: true, analysis });

  } catch (error) {
    console.error("Erro no Gerador de Fechamento Contábil IA:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Erro interno ao gerar parecer com IA."
    }, { status: 500 });
  }
}
