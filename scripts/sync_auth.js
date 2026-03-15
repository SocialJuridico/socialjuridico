require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEFAULT_PASSWORD = "socialjuridico1!";

async function syncTable(tableName) {
  console.log(`\nSincronizando tabela: ${tableName}...`);
  
  const { data: users, error } = await supabase
    .from(tableName)
    .select('id, email, name');

  if (error) {
    console.error(`Erro ao buscar dados da tabela ${tableName}:`, error.message);
    return;
  }

  console.log(`Encontrados ${users.length} registros.`);

  for (const user of users) {
    console.log(`Processando: ${user.email} (${user.name})`);
    
    // Tenta criar o usuário no Auth mantendo o MESMO ID do banco
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { 
        full_name: user.name,
        needs_password_update: true // <--- Marcador para forçar troca de senha
      }
    });

    if (authError) {
      if (authError.message.includes("already has been registered")) {
        console.log(`  - Usuário já existe. Atualizando metadados...`);
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { needs_password_update: true }
        });
      } else {
        console.error(`  - Erro ao processar ${user.email}:`, authError.message);
      }
    } else {
      console.log(`  - Sucesso! Criado no Auth com marcador de atualização.`);
    }
  }
}

async function main() {
  await syncTable('clientes');
  await syncTable('advogados');
  console.log("\nSincronização finalizada!");
  console.log(`Senha padrão para todos: ${DEFAULT_PASSWORD}`);
}

main().catch(console.error);
