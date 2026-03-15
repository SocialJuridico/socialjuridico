require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function forceAllPaginated() {
  let page = 1;
  let allUsers = [];
  
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 50
    });

    if (error) {
      console.error(error);
      break;
    }

    if (users.length === 0) break;

    allUsers = allUsers.concat(users);
    page++;
  }

  console.log(`Encontrados ${allUsers.length} usuários no total. Iniciando atualização em massa...`);

  for (const user of allUsers) {
    // Só aplica a flag se o usuário NÃO for um recém criado (que não tem full_name ou algo assim)
    // No seu caso, todos os antigos tem metadata. Vamos aplicar em todos para garantir.
    process.stdout.write(`Atualizando ${user.email}... `);
    const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, needs_password_update: true }
    });

    if (updError) console.log(`ERRO: ${updError.message}`);
    else console.log(`OK!`);
  }
}

forceAllPaginated();
