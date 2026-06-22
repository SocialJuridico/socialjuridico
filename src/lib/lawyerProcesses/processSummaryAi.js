import OpenAI from "openai";

export async function generateProcessSummary(processRow, movements = [], parties = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "Configure a chave da API do OpenAI/Gemini para gerar resumos de processos.";
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const prompt = `Você é um assistente jurídico de IA especializado em analisar e resumir processos judiciais no Brasil. Sua tarefa é fornecer um resumo estratégico e executivo do processo, destacando seu estado atual, decisões importantes e próximos passos recomendados.

Analise os dados do processo judicial abaixo e elabore um resumo profissional de 3 a 5 parágrafos (ou tópicos claros).
O resumo deve ser em português do Brasil e conter:
1. Uma visão geral do caso (classe processual, tribunal, órgão julgador, partes principais).
2. O andamento atual do processo (status atual com base nos últimos movimentos).
3. Resumo das movimentações ou decisões mais importantes identificadas na linha do tempo.
4. Próximos passos previstos ou recomendações estratégicas para o advogado.

Importante:
- Seja extremamente objetivo, claro e mantenha um tom profissional.
- Não invente informações. Se os dados não forem suficientes para determinar algum ponto, diga apenas o que for factual com base no histórico.
- Evite o uso de tags HTML ou comentários de código.

DADOS DO PROCESSO:
- Número CNJ: ${processRow.numero_cnj || processRow.numeroCnj || ""}
- Classe: ${processRow.classe || "Não informada"}
- Órgão Julgador: ${processRow.orgao_julgador || processRow.orgaoJulgador || "Não informado"}
- Tribunal: ${processRow.tribunal_nome || processRow.tribunalNome || "Não informado"}

PARTES:
${parties.map(p => `- ${p.name || p.nome} (${p.role || p.party_type || "Parte"})`).join("\n") || "Nenhuma parte listada."}

ÚLTIMAS MOVIMENTAÇÕES:
${movements.map(m => `- ${m.movement_date ? new Date(m.movement_date).toLocaleDateString("pt-BR") : "Data não disponível"}: ${m.description || m.nome || ""}`).join("\n") || "Nenhuma movimentação listada."}

RESPONDA APENAS O RESUMO ESTRUTURADO, sem introduções genéricas do tipo 'Aqui está o resumo' ou 'Claro, vou resumir'.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um assistente jurídico sênior experiente." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error("[generateProcessSummary] Erro ao gerar resumo:", error);
    throw error;
  }
}
