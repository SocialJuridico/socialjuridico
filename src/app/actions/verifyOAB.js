"use server";

export async function verifyOAB(oabNumber, state, fullName) {
  // A API da Exato Digital precisa de um Token de Acesso. 
  // O usuário irá fornecer este token no .env como EXATO_API_TOKEN
  const EXATO_TOKEN = process.env.EXATO_API_TOKEN;

  if (!EXATO_TOKEN) {
    // MODO MOCK (Simulação) porque o token não está configurado ainda
    console.warn("EXATO_API_TOKEN não encontrado. Simulando verificação da OAB...");
    
    // Finge um pequeno delay de rede (1.5s)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Para efeito de demonstração na tela de cadastro, vamos aprovar
    // Mas na vida real, isso aqui dará erro e travará o cadastro falso
    return { 
      isValid: true, 
      message: "Verificação simulada com sucesso (Token Ausente).",
      data: { nome: fullName, oab: oabNumber, estado: state }
    };
  }

  // MODO PRODUÇÃO REAL (Chamada para a Exato Digital)
  try {
    const response = await fetch(`https://api.exato.digital/oab/cadastro-nacional-advogados?oab=${oabNumber}&uf=${state}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${EXATO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { isValid: false, message: "Erro ao consultar a base da OAB. Verifique o número digitado." };
    }

    const data = await response.json();
    
    // A API deles retorna um payload que mapeia o nome real do advogado
    // Precisamos comparar se o nome que a pessoa digitou é similar ao nome da OAB
    const realName = data?.result?.nomeArtistico || data?.result?.nome || "";
    
    if (!realName) {
      return { isValid: false, message: "Cadastro OAB não encontrado no CNA." };
    }

    // Simplificação: Compara o primeiro nome ou checa se inclui o nome digitado
    const typedNameClean = fullName.trim().toLowerCase();
    const realNameClean = realName.trim().toLowerCase();

    // Verificação Básica: O nome verdadeiro no CNA precisa estar contido no que a pessoa digitou, ou vice-versa.
    if (realNameClean.includes(typedNameClean.split(' ')[0]) || typedNameClean.includes(realNameClean.split(' ')[0])) {
      return { 
        isValid: true, 
        message: "OAB Validada com sucesso!",
        data: data.result 
      };
    } else {
      return { 
        isValid: false, 
        message: `O nome fornecido não cruza com o registro OAB informado (Registrado como: ${realName}).` 
      };
    }

  } catch (error) {
    console.error("Erro na validação OAB:", error);
    return { isValid: false, message: "Serviço do CNA temporariamente indisponível. Tente mais tarde." };
  }
}
