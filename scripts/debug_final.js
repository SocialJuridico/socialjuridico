require('dotenv').config();
const pg = require('pg');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugAll() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const resClientes = await client.query("SELECT id, email, name FROM clientes WHERE email ILIKE '%mxs%';");
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const resCasos = await client.query("SELECT id, titulo, cliente_id FROM casos;");

    console.log("CLIENTES_DB:", JSON.stringify(resClientes.rows, null, 2));
    console.log("\nAUTH_USERS:", JSON.stringify(users.filter(u => u.email.includes('mxs')).map(u => ({ id: u.id, email: u.email })), null, 2));
    console.log("\nCASOS (Last 5):", JSON.stringify(resCasos.rows.slice(-5).map(r => ({ ...r, owner_email: (resClientes.rows.find(c => c.id === r.cliente_id)?.email || 'Other') })), null, 2));

    await client.end();
}

debugAll().catch(console.error);
