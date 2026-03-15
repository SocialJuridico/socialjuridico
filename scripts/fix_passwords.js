require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const TARGET_PASSWORD = 'socialjuridico1!';

async function fixPasswords() {
  console.log("Iniciando correção de senhas padrão para usuários migrados...");
  
  let page = 1;
  let allUsers = [];
  
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 50
    });

    if (error) {
      console.error("Erro ao listar usuários:", error.message);
      break;
    }

    if (users.length === 0) break;
    allUsers = allUsers.concat(users);
    page++;
  }

  console.log(`Encontrados ${allUsers.length} usuários no Auth.`);

  for (const user of allUsers) {
    // Só atualizamos se o usuário tiver o marcador de troca de senha (indicando que é migrado)
    if (user.user_metadata?.needs_password_update === true) {
      process.stdout.write(`Atualizando senha de ${user.email}... `);
      
      const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
        password: TARGET_PASSWORD,
        user_metadata: { ...user.user_metadata, needs_password_update: true }
      });

      if (updError) console.log(`ERRO: ${updError.message}`);
      else console.log(`OK!`);
    } else {
      // console.log(`Pulando ${user.email} (não é conta migrada)`);
    }
  }

  console.log("\nProcesso concluído!");
  console.log(`Todos os usuários migrados agora podem usar: ${TARGET_PASSWORD}`);
}

fixPasswords().catch(console.error);
