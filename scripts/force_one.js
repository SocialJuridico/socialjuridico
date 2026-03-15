require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSpecific(email) {
  console.log(`Buscando usuário: ${email}`);
  const { data: { users }, error } = await supabase.auth.admin.listUsers({
    perPage: 1000
  });

  if (error) {
    console.error(error);
    return;
  }

  const user = users.find(u => u.email === email);
  if (user) {
    console.log("Usuário ENCONTRADO!");
    console.log("Metadados Atuais:", JSON.stringify(user.user_metadata, null, 2));
    
    console.log("Forçando atualização agora...");
    const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, needs_password_update: true }
    });

    if (updError) console.error("Erro ao atualizar:", updError.message);
    else console.log("Sucesso! Flag 'needs_password_update' aplicada.");
  } else {
    console.log("Usuário não encontrado mesmo com perPage: 1000.");
  }
}

checkSpecific('mxsgamejps@gmail.com');
