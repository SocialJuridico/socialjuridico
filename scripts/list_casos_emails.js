require('dotenv').config();
const pg = require('pg');

async function listAllCasos() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT c.id, c.titulo, c.cliente_id, cl.email FROM casos c LEFT JOIN clientes cl ON c.cliente_id = cl.id;");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listAllCasos();
