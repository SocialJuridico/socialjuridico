const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const systemApiKey = process.env.API_SOCIAL_JURIDICO_KEY;
const externalBaseUrl = process.env.API_SOCIAL_JURIDICO_BASE_URL || 'https://n8n.socialjuridico.com.br';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Faltam variáveis de ambiente do Supabase (.env)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function callExternalApi(urlPath, body) {
  if (!systemApiKey) return { ok: false, message: "Sem API Key configurada." };
  try {
    const res = await fetch(`${externalBaseUrl.trim().replace(/\/+$/, '')}${urlPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': systemApiKey
      },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, payload };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function resetOabTests() {
  console.log("=== INICIANDO LIMPEZA DE DADOS DE TESTE DE OAB ===");

  // 1. Obter todos os advogados
  const { data: lawyers, error: lawyerErr } = await supabase
    .from('advogados')
    .select('id, name, email, oab, estado')
    .order('created_at', { ascending: false });

  if (lawyerErr || !lawyers || lawyers.length === 0) {
    console.error("Nenhum advogado localizado no banco de dados:", lawyerErr);
    process.exit(1);
  }

  // Verificar se o usuário passou um argumento de e-mail ou nome
  const arg = process.argv[2];
  let targetLawyer = null;

  if (arg) {
    targetLawyer = lawyers.find(l => 
      l.email.toLowerCase().includes(arg.toLowerCase()) || 
      l.name.toLowerCase().includes(arg.toLowerCase()) ||
      String(l.oab).includes(arg)
    );
  }

  // Se não passou argumento ou não encontrou, busca por "Saulo Silva" ou o email principal de teste
  if (!targetLawyer) {
    targetLawyer = lawyers.find(l => l.email === 'marysaujps@gmail.com' || l.name.includes("Saulo")) || lawyers.find(l => l.oab === '123456') || lawyers[0];
  }

  console.log(`\nAdvogado selecionado para reset:`);
  console.log(`- Nome: ${targetLawyer.name}`);
  console.log(`- E-mail: ${targetLawyer.email}`);
  console.log(`- OAB: ${targetLawyer.oab || 'Não configurada'}-${targetLawyer.estado || ''}`);
  console.log(`- ID: ${targetLawyer.id}`);

  const lawyerId = targetLawyer.id;

  // 2. Limpar os monitoramentos ativos na API Externa se houver OAB
  if (targetLawyer.oab && targetLawyer.estado) {
    console.log(`\n-> Desativando monitoramento de OAB (${targetLawyer.oab}) na API externa...`);
    const resOab = await callExternalApi('/api/plataformas/monitoramentos', {
      tipo: 'oab',
      type: 'oab',
      oab_numero: targetLawyer.oab,
      oab_uf: targetLawyer.estado,
      plataforma_ref: lawyerId,
      ativo: false
    });
    console.log(`Resposta API Externa (OAB):`, resOab.ok ? "Desativado com sucesso" : `Falhou ou não integrado: ${JSON.stringify(resOab.payload || resOab.message)}`);
  }

  // 3. Excluir processos locais baixados da OAB
  console.log(`\n-> Apagando processos baixados da tabela lawyer_oab_processes...`);
  const { count: procCount, error: deleteProcErr } = await supabase
    .from('lawyer_oab_processes')
    .delete()
    .eq('lawyer_id', lawyerId);

  if (deleteProcErr) {
    console.error("Erro ao apagar processos OAB:", deleteProcErr.message);
  } else {
    console.log(`Processos de OAB apagados com sucesso.`);
  }

  // 4. Apagar notificações de teste do webhook (tipo: processual_webhook)
  console.log(`\n-> Apagando notificações de teste do webhook (tipo: processual_webhook)...`);
  const { error: deleteNotifErr } = await supabase
    .from('notificacoes')
    .delete()
    .eq('user_id', lawyerId)
    .eq('tipo', 'processual_webhook');

  if (deleteNotifErr) {
    console.error("Erro ao apagar notificações processuais:", deleteNotifErr.message);
  } else {
    console.log(`Notificações de teste apagadas com sucesso.`);
  }

  // 5. Resetar configurações no perfil do advogado
  console.log(`\n-> Resetando switches de monitoramento no perfil do advogado (oab_processos_baixados e oab_monitoramento_citacoes)...`);
  const { error: updateLawyerErr } = await supabase
    .from('advogados')
    .update({
      oab_processos_baixados: false,
      oab_monitoramento_citacoes: false
    })
    .eq('id', lawyerId);

  if (updateLawyerErr) {
    console.error("Erro ao resetar preferências no perfil do advogado:", updateLawyerErr.message);
  } else {
    console.log(`Preferências de monitoramento resetadas com sucesso (definidas como false).`);
  }

  console.log(`\n=== LIMPEZA DE DADOS CONCLUÍDA PARA O ADVOGADO: ${targetLawyer.name} ===`);
  
  // Mostrar outros advogados cadastrados para conhecimento
  console.log("\nOutros advogados no banco:");
  lawyers.forEach(l => {
    if (l.id !== targetLawyer.id) {
      console.log(`- ${l.name} (${l.email}) | OAB: ${l.oab || 'sem OAB'}`);
    }
  });
  console.log("\nNota: Para rodar para outro advogado, digite: node reset_oab_tests.js <email_ou_nome>");
}

resetOabTests();
