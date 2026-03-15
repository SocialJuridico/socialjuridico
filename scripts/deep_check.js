
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepCheck() {
  console.log('--- Auth Users ---');
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) return console.error(authError);
  
  const authMap = new Map();
  users.forEach(u => authMap.set(u.id, u.email));

  console.log(`Total Auth Users: ${users.length}`);

  console.log('\n--- Advogados Table ---');
  const { data: advogados, error: advError } = await supabaseAdmin.from('advogados').select('id, email, name');
  if (advError) return console.error(advError);
  
  advogados.forEach(adv => {
    const hasAuth = authMap.has(adv.id);
    const authEmail = authMap.get(adv.id);
    console.log(`- ${adv.name} (${adv.email}): ID=${adv.id}, Has Auth=${hasAuth}, Auth Email=${authEmail}`);
  });
}

deepCheck();
