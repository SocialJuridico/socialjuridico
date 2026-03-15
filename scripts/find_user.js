require('dotenv').config();
const pg = require('pg');

async function findUser() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT * FROM clientes WHERE email ILIKE '%mxsgamejps%';");
        console.log("CLIENTES:", JSON.stringify(res.rows, null, 2));

        const res2 = await client.query("SELECT * FROM advogados WHERE email ILIKE '%mxsgamejps%';");
        console.log("ADVOGADOS:", JSON.stringify(res2.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

findUser();
