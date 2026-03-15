require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUserPaginated(email) {
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 50
    });
    if (error) break;
    if (users.length === 0) break;
    
    const user = users.find(u => u.email === email);
    if (user) {
      console.log(`FOUND ${email} on page ${page}`);
      console.log(JSON.stringify(user, null, 2));
      return;
    }
    page++;
  }
  console.log(`User ${email} NOT FOUND in Auth.`);
}

checkUserPaginated(process.argv[2] || 'admin@socialjuris.com');
