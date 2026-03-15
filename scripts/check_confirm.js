
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkConfirmation() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('User Confirmation Status:');
  users.forEach(u => {
    console.log(`- ${u.email}: Confirmed=${!!u.email_confirmed_at}, Role=${u.user_metadata?.role}`);
  });
}

checkConfirmation();
