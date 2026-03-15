require('dotenv').config();
const pg = require('pg');

async function checkSchema() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuarios';");
        console.log('--- USUARIOS ---');
        console.log(JSON.stringify(res.rows, null, 2));
        
        const res2 = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clientes';");
        console.log('--- CLIENTES ---');
        console.log(JSON.stringify(res2.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSchema();
