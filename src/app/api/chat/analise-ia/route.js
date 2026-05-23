import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    let user = null;
    let authError = null;

    // Verificar se há token de autenticação via header (Mobile App)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      user = data?.user;
      authError = error;
    } else {
      // Fallback para os cookies do Next.js (Web App)
      const supabase = createClient();
      const result = await supabase.auth.getUser();
      user = result.data?.user;
      authError = result.error;
    }

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { caso_id, interest_id, mensagem_id } = await request.json();

    if (!caso_id) {
      return NextResponse.json({ success: false, message: "caso_id é obrigatório" }, { status: 400 });
    }

    const isGlobal = !mensagem_id || mensagem_id === "global";

    // 1. Determinar a role do usuário no contexto deste caso/negociação
    let role = null;

    // Verificar se é o cliente ou o advogado do caso
    const { data: caso } = await supabaseAdmin
      .from("casos")
      .select("cliente_id, advogado_id")
      .eq("id", caso_id)
      .single();

    if (caso) {
      if (caso.cliente_id === user.id) {
        role = "CLIENT";
      } else if (caso.advogado_id === user.id) {
        role = "LAWYER";
      }
    }

    // Se ainda não achou a role e tem interest_id, verificar se é o advogado da negociação
    if (!role && interest_id) {
      const { data: interest } = await supabaseAdmin
        .from("case_interests")
        .select("lawyer_id")
        .eq("id", interest_id)
        .single();

      if (interest && interest.lawyer_id === user.id) {
        role = "LAWYER";
      }
    }

    if (!role) {
      return NextResponse.json({ success: false, message: "Você não é participante deste caso" }, { status: 403 });
    }

    // 2. Verificar se já existe uma análise para esta mensagem e role (Cache no Banco de Dados)
    let queryCache = supabaseAdmin
      .from("mensagens_analise_ia")
      .select("*")
      .eq("destinatario_role", role);

    if (isGlobal) {
      queryCache = queryCache.is("mensagem_id", null).eq("caso_id", caso_id);
      if (interest_id) {
        queryCache = queryCache.eq("interest_id", interest_id);
      } else {
        queryCache = queryCache.is("interest_id", null);
      }
    } else {
      queryCache = queryCache.eq("mensagem_id", mensagem_id);
    }

    const { data: analiseExistente } = await queryCache.maybeSingle();

    if (analiseExistente) {
      // Para análise global, expiramos o cache se tiver mais de 10 minutos (para refletir novas mensagens)
      const cacheTime = new Date(analiseExistente.created_at).getTime();
      const now = Date.now();
      const diffMinutes = (now - cacheTime) / (1000 * 60);

      if (!isGlobal || diffMinutes < 10) {
        return NextResponse.json({ success: true, data: analiseExistente });
      } else {
        // Excluir a análise global expirada do cache para gerar uma nova
        await supabaseAdmin
          .from("mensagens_analise_ia")
          .delete()
          .eq("id", analiseExistente.id);
      }
    }

    // 3. Buscar mensagens para dar contexto
    let query = supabaseAdmin
      .from("mensagens")
      .select("*")
      .eq("caso_id", caso_id)
      .order("created_at", { ascending: true });

    if (interest_id) {
      query = query.eq("interest_id", interest_id);
    } else {
      query = query.is("interest_id", null);
    }

    const { data: mensagens, error: msgError } = await query;
    if (msgError || !mensagens) {
      return NextResponse.json({ success: false, message: "Mensagens não encontradas" }, { status: 404 });
    }

    let contextMsgs = [];
    let targetMsg = null;

    if (isGlobal) {
      // Análise Global: Pegar as últimas 35 mensagens da conversa inteira
      const startIdx = Math.max(0, mensagens.length - 35);
      contextMsgs = mensagens.slice(startIdx);
    } else {
      const targetIndex = mensagens.findIndex(m => m.id === mensagem_id);
      if (targetIndex === -1) {
        return NextResponse.json({ success: false, message: "Mensagem alvo não encontrada no histórico" }, { status: 404 });
      }

      targetMsg = mensagens[targetIndex];

      // Se o remetente for o próprio usuário, não faz sentido analisar a própria mensagem
      if (targetMsg.sender_id === user.id) {
        return NextResponse.json({ success: false, message: "Não analisamos as suas próprias mensagens" }, { status: 400 });
      }

      // Análise Específica: Pegar o contexto amplo das últimas 30 mensagens até a alvo
      const contextStart = Math.max(0, targetIndex - 29);
      contextMsgs = mensagens.slice(contextStart, targetIndex + 1);
    }

    // Formatar o histórico de forma descritiva
    const formattedHistory = contextMsgs.map(m => {
      let text = m.content;
      try {
        if (text.startsWith("{") && text.endsWith("}")) {
          const media = JSON.parse(text);
          if (media.isMedia) {
            if (media.fileType === "audio") {
              text = `[Áudio de voz. Transcrição: "${media.transcript || "Transcrição indisponível"}" ]`;
            } else if (media.fileType === "image") {
              text = `[Imagem enviada: "${media.fileName}"]`;
            } else if (media.fileType === "pdf") {
              text = `[Documento PDF enviado: "${media.fileName}"]`;
            } else {
              text = `[Arquivo enviado: "${media.fileName}"]`;
            }
          }
        }
      } catch (e) {
        // Ignorar
      }

      const senderType = m.sender_id === user.id ? "Eu" : "Oponente";
      return `${senderType}: ${text}`;
    }).join("\n");

    // 4. Preparar Prompt da OpenAI dependendo da Role e Tipo (Global vs Específica)
    let systemPrompt = "";
    if (role === "CLIENT") {
      if (isGlobal) {
        systemPrompt = `Você é o "Anjo Jurídico" do cliente. Sua missão é dar um panorama geral do andamento do chat e da negociação com o advogado, atuando como um protetor que assegura que o cliente não seja lesado e que tudo esteja conforme a justiça e a lei.
Analise o histórico recente da conversa fornecido.
Escreva uma análise curta, clara e direta (máximo de 4 parágrafos) em português focando em:
1. **Resumo da Situação**: O que foi acordado até o momento e em que pé está o caso/negociação.
2. **Postura do Advogado**: O advogado está agindo de forma transparente, ética e correta?
3. **Próximos Passos e Cuidados**: Aponte quais são os próximos passos recomendados para o cliente e se há riscos ou pontos que ele precise questionar.
Use um tom protetor, sábio, imparcial e prestativo (como um guardião da integridade jurídica). IMPORTANTE: Fale DIRETAMENTE com o cliente.`;
      } else {
        systemPrompt = `Você é o "Anjo Jurídico" do cliente. Sua missão é dar total segurança jurídica, ética e prática para o cliente no chat com o advogado, agindo como um protetor que ajuda o cliente a ver se tudo está dentro da lei e das boas práticas corretamente.
Analise a última mensagem enviada pelo advogado (marcada como "Oponente" no histórico abaixo) considerando o histórico amplo da conversa (que fornece o contexto).
Escreva uma análise curta, clara e direta (máximo de 3 a 4 parágrafos) em português focando em:
1. **Correção Jurídica:** O que o advogado disse faz sentido perante a lei brasileira?
2. **Ética:** O advogado está agindo com ética profissional e respeito às diretrizes da OAB?
3. **Efetividade:** Esta proposta realmente resolve seu problema ou há riscos ocultos ou alternativas melhores?
Use um tom protetor, sábio e prestativo (com a sabedoria e retidão de um guardião da justiça). IMPORTANTE: Não revele dados confidenciais e fale DIRETAMENTE com o cliente (ex: "O advogado sugeriu X. Como seu Anjo Jurídico, analiso que isso faz sentido juridicamente porque...").`;
      }
    } else { // LAWYER
      if (isGlobal) {
        systemPrompt = `Você é o "Assessor Comercial/Negociação de IA do Advogado". Sua missão é dar uma análise comercial geral do andamento da negociação e do perfil do cliente.
Analise o histórico recente da conversa.
Escreva uma análise estruturada em português focando em:
1. **Temperatura da Negociação**: O cliente está quente (interessado), com dúvidas ou frio (resistente)?
2. **Principais Objeções do Cliente**: Resuma os principais impedimentos relatados pelo cliente (preço, prazo, medo, etc.).
3. **Estratégia Comercial**: Quais os próximos passos argumentativos ou táticas comerciais que o advogado deve adotar para converter o lead.
Use um tom de assessoria comercial jurídica, focado em fechamento de contrato e persuasão ética.`;
      } else {
        systemPrompt = `Você é o "Assessor Comercial/Negociação de IA do Advogado". Sua missão é orientar o advogado a fechar o contrato, contornar objeções de clientes e entender os pontos críticos de forma privada.
Analise a última mensagem enviada pelo cliente (marcada como "Oponente" no histórico abaixo) considerando o histórico amplo da conversa (que fornece o contexto).
Escreva uma análise estruturada e curta em português com:
1. **Dores/Reclamações:** Quais as principais dores do cliente na última mensagem?
2. **Estratégia de Negociação:** Como o advogado deve contornar as dúvidas ou objeções de preço/prazo?
3. **Sugestão de Resposta Rápida:** Forneça duas opções de mensagens curtas e profissionais para o advogado copiar e colar.
Use um tom executivo, focado em vendas jurídicas e soluções.`;
      }
    }

    // 5. Chamar a OpenAI (gpt-4o-mini)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Aqui está o histórico de mensagens recente para contextualização. ${isGlobal ? 'Esta é uma análise global.' : 'A última mensagem ("Oponente") é o foco principal:'}\n\n${formattedHistory}` }
      ],
      temperature: 0.7,
    });

    const analiseTexto = completion.choices[0].message.content;

    // 6. Salvar análise no banco de dados
    const insertData = {
      caso_id,
      interest_id: interest_id || null,
      destinatario_role: role,
      analise_texto: analiseTexto,
      created_at: new Date().toISOString()
    };

    if (!isGlobal) {
      insertData.mensagem_id = mensagem_id;
    }

    const { data: novaAnalise, error: insertError } = await supabaseAdmin
      .from("mensagens_analise_ia")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, data: novaAnalise });
  } catch (error) {
    console.error("Erro na API de Análise de IA:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
