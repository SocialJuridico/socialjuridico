require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUser(email) {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error(error);
    return;
  }

  const user = users.find(u => u.email === email);
  if (user) {
    console.log(`User: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Metadata:`, JSON.stringify(user.user_metadata, null, 2));
  } else {
    console.log("User not found in Auth.");
  }
}

const target = process.argv[2] || 'mxsgamejps@gmail.com';
checkUser(target);
