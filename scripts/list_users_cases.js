require('dotenv').config();
const pg = require('pg');

async function listUsers() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const tables = ['clientes', 'advogados', 'admins'];
    for (const table of tables) {
        const res = await client.query(`SELECT id, email FROM ${table} WHERE email ILIKE '%mxs%';`);
        console.log(`JSON_${table}:`, JSON.stringify(res.rows));
    }

    const casos = await client.query("SELECT id, titulo, cliente_id FROM casos;");
    console.log("\n--- CASOS ---");
    casos.rows.forEach(c => {
        if (c.cliente_id.startsWith('d346') || c.cliente_id.startsWith('beac')) {
            console.log(`ID: ${c.id} | TITULO: ${c.titulo} | CLIENTE_ID: ${c.cliente_id}`);
        }
    });

    await client.end();
}

listUsers();
