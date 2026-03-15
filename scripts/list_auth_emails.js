require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listAll() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
     console.error(error);
     return;
  }
  console.log(`Total users in Auth: ${users.length}`);
  users.forEach(u => console.log(`- ${u.email}`));
}

listAll();
