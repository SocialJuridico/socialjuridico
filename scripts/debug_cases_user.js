require('dotenv').config();
const pg = require('pg');

async function debugCases() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("--- TODOS OS MXS EM CLIENTES ---");
        const resUser = await client.query("SELECT id, email FROM clientes WHERE email ILIKE 'mxsgamejps%';");
        resUser.rows.forEach(u => console.log(`USER: ${u.email} ID: ${u.id}`));

        console.log("\n--- USUÁRIOS QUE POSSUEM CASOS ---");
        const resOwners = await client.query(`
            SELECT c.cliente_id, u.email, u.name, COUNT(*) as count
            FROM casos c
            LEFT JOIN (
                SELECT id, email, name FROM clientes
                UNION ALL
                SELECT id, email, name FROM advogados
                UNION ALL
                SELECT id, email, name FROM admins
            ) u ON c.cliente_id = u.id
            GROUP BY c.cliente_id, u.email, u.name;
        `);
        for (const r of resOwners.rows) {
            console.log(`EMAIL: ${r.email || 'N/A'} | ID: ${r.cliente_id} | COUNT: ${r.count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

debugCases();
