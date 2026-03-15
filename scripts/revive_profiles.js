
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_PASSWORD = 'Social@2026';

async function reviveAll() {
  console.log('Starting mass profile revival...');
  
  // 1. Get ALL Auth users using pagination
  let allAuthUsers = [];
  let page = 1;
  while (true) {
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });
    if (authError) return console.error(authError);
    if (!users || users.length === 0) break;
    allAuthUsers = allAuthUsers.concat(users);
    page++;
  }
  
  const authEmails = new Set(allAuthUsers.map(u => u.email.toLowerCase()));
  const authIdMap = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u.id]));

  console.log(`Found ${allAuthUsers.length} total Auth users.`);

  const tables = ['advogados', 'clientes'];

  for (const table of tables) {
    console.log(`\nChecking table: ${table}`);
    const { data: profiles, error: pError } = await supabaseAdmin.from(table).select('*');
    if (pError) continue;

    for (const profile of profiles) {
      const email = profile.email.toLowerCase();
      
      if (!authEmails.has(email)) {
        console.log(`- Creating Auth for orphan profile: ${email}...`);
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: profile.name,
            role: profile.role || (table === 'advogados' ? 'LAWYER' : 'CLIENT')
          }
        });

        if (createError) {
          console.error(`  FAILED to create ${email}:`, createError.message);
        } else {
          console.log(`  SUCCESS! Linking ID ${profile.id} -> ${newUser.user.id}`);
          // Update the database record with the new Auth ID
          const { error: updateError } = await supabaseAdmin
            .from(table)
            .update({ id: newUser.user.id })
            .eq('id', profile.id);
          
          if (updateError) console.error(`  FAILED to update DB ID for ${email}:`, updateError.message);
        }
      } else {
        // Auth exists, check if ID matches
        const authId = authIdMap.get(email);
        if (authId !== profile.id) {
          console.log(`- Sincronizing ID for existing Auth user: ${email}...`);
          const { error: syncError } = await supabaseAdmin
            .from(table)
            .update({ id: authId })
            .eq('id', profile.id);
          
          if (syncError) console.error(`  FAILED sync for ${email}:`, syncError.message);
          else console.log(`  Sync success for ${email}`);
        }
      }
    }
  }
  console.log('\nRevival process finished.');
}

reviveAll();
