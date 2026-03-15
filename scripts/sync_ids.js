
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncIds() {
  console.log('Fetching users...');
  const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) return console.error(authError);

  const emailToAuthId = new Map();
  users.forEach(u => emailToAuthId.set(u.email.toLowerCase(), u.id));

  const tables = ['advogados', 'clientes'];

  for (const table of tables) {
    console.log(`\nProcessing table: ${table}`);
    const { data: rows, error: fetchError } = await supabaseAdmin.from(table).select('*');
    if (fetchError) {
      console.error(`Error fetching ${table}:`, fetchError);
      continue;
    }

    for (const row of rows) {
      const authId = emailToAuthId.get(row.email.toLowerCase());
      if (authId && authId !== row.id) {
        console.log(`Mismatch found for ${row.email}: DB ID=${row.id}, Auth ID=${authId}. Repairing...`);
        
        // We cannot simply update the primary key if there are foreign keys.
        // But let's try to update it or delete and re-insert.
        // For now, let's try to update the ID.
        
        const { error: updateError } = await supabaseAdmin
          .from(table)
          .update({ id: authId })
          .eq('email', row.email);

        if (updateError) {
          console.error(`Failed to update ID for ${row.email}:`, updateError.message);
          // If update fails (e.g. because of PK constraints), we might need to delete and re-insert
          if (updateError.message.includes('primary key')) {
             console.log('Attempting delete and re-insert for', row.email);
             const { error: delError } = await supabaseAdmin.from(table).delete().eq('id', row.id);
             if (!delError) {
                const newRow = { ...row, id: authId };
                const { error: insError } = await supabaseAdmin.from(table).insert([newRow]);
                if (insError) console.error('Re-insert failed:', insError.message);
                else console.log('Successfully repaired via delete/insert');
             } else {
                console.error('Delete failed:', delError.message);
             }
          }
        } else {
          console.log(`Successfully updated ID for ${row.email}`);
        }
      }
    }
  }
}

syncIds();
