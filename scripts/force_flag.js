require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function forceUpdate() {
  console.log("Forçando flag em todos os usuários do Auth...");
  
  // Lista todos os usuários (limite de 1000 por padrão)
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Erro ao listar:", error.message);
    return;
  }

  console.log(`Encontrados ${users.length} usuários.`);

  for (const user of users) {
    console.log(`Aplicando flag em: ${user.email}`);
    const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { 
        ...user.user_metadata,
        needs_password_update: true 
      }
    });

    if (updError) {
      console.error(`Falha em ${user.email}:`, updError.message);
    } else {
      console.log(`Sucesso em ${user.email}`);
    }
  }
}

forceUpdate();
