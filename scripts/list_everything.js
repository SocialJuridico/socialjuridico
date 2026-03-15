require('dotenv').config();
const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();

    try {
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        for (const row of res.rows) {
            const tableName = row.table_name;
            const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}';`);
            console.log(`=== ${tableName} ===`);
            console.log(colsRes.rows.map(r => r.column_name).join(', '));
        }

    } catch (err) {
        console.error("Failed:", err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
