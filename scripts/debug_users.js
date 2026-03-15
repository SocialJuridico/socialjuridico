require('dotenv').config();
const pg = require('pg');

async function debugUser() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- TABELAS ---");
        const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        console.log(tables.rows.map(r => r.table_name));

        console.log("\n--- ÚLTIMOS CLIENTES ---");
        const clientes = await client.query("SELECT id, email, name, role FROM clientes ORDER BY created_at DESC LIMIT 5;");
        console.log(JSON.stringify(clientes.rows, null, 2));

        console.log("\n--- ÚLTIMOS ADVOGADOS ---");
        const advogados = await client.query("SELECT id, email, name, role FROM advogados ORDER BY created_at DESC LIMIT 5;");
        console.log(JSON.stringify(advogados.rows, null, 2));

        console.log("\n--- ÚLTIMOS ADMINS ---");
        const admins = await client.query("SELECT id, email, name, role FROM admins ORDER BY created_at DESC LIMIT 5;");
        console.log(JSON.stringify(admins.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

debugUser();
