const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Erro: Variáveis de ambiente do Supabase não encontradas no arquivo .env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanTestData(email) {
  if (!email) {
    console.error("Erro: Por favor, forneça o e-mail do advogado de teste.");
    console.log("Uso: node scratch_clean_oab.js seu_email_de_teste@provedor.com");
    return;
  }

  console.log(`Buscando advogado com o e-mail: ${email}...`);
  const { data: lawyer, error: findError } = await supabase
    .from('advogados')
    .select('id, oab, estado')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error("Erro ao consultar tabela 'advogados':", findError.message);
    return;
  }

  if (!lawyer) {
    console.error(`Erro: Nenhum advogado localizado com o e-mail "${email}".`);
    return;
  }

  console.log(`Advogado localizado! ID: ${lawyer.id} | OAB Atual: ${lawyer.oab || 'Nenhuma'}-${lawyer.estado || 'Nenhum'}`);

  // 1. Deletar todos os processos baixados na tabela lawyer_oab_processes
  console.log("Deletando processos baixados da tabela 'lawyer_oab_processes'...");
  const { error: deleteProcError } = await supabase
    .from('lawyer_oab_processes')
    .delete()
    .eq('lawyer_id', lawyer.id);

  if (deleteProcError) {
    console.error("Erro ao deletar processos da tabela:", deleteProcError.message);
  } else {
    console.log("Sucesso: Todos os processos baixados da OAB foram removidos.");
  }

  // 2. Desvincular OAB e resetar flags na tabela advogados
  console.log("Desvinculando OAB e resetando flags no perfil do advogado...");
  const { error: updateError } = await supabase
    .from('advogados')
    .update({
      oab: null,
      estado: null,
      oab_processos_baixados: false,
      oab_monitoramento_citacoes: false
    })
    .eq('id', lawyer.id);

  if (updateError) {
    console.error("Erro ao atualizar o perfil do advogado:", updateError.message);
  } else {
    console.log("Sucesso: OAB, Estado (UF) e flags de monitoramento foram limpos.");
  }

  console.log("\nLimpeza concluída! Os dados de teste foram removidos e a OAB foi desvinculada.");
}

// Execução
const email = process.argv[2];
cleanTestData(email);
