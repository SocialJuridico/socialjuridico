
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log('Checking Auth Users...');
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing users:', authError);
    return;
  }

  console.log(`Found ${users.length} users.`);
  for (const user of users) {
    console.log(`- Email: ${user.email}, ID: ${user.id}, Role: ${user.user_metadata?.role}`);
  }

  console.log('\nChecking "advogados" table...');
  const { data: advogados, error: advError } = await supabaseAdmin.from('advogados').select('*');
  if (advError) {
    console.error('Error fetching advogados:', advError);
  } else {
    console.log(`Found ${advogados.length} advogados.`);
    for (const adv of advogados) {
      console.log(`- Name: ${adv.name}, Email: ${adv.email}, ID: ${adv.id}`);
    }
  }

  console.log('\nChecking "clientes" table...');
  const { data: clientes, error: cliError } = await supabaseAdmin.from('clientes').select('*');
  if (cliError) {
    console.error('Error fetching clientes:', cliError);
  } else {
    console.log(`Found ${clientes.length} clientes.`);
    for (const cli of clientes) {
      console.log(`- Name: ${cli.name}, Email: ${cli.email}, ID: ${cli.id}`);
    }
  }
}

checkUsers();
