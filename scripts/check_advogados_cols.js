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
        const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'advogados' ORDER BY ordinal_position;");
        console.log("=== ADVOGADOS COLUMNS ===");
        cols.rows.forEach(r => console.log(r.column_name, '->', r.data_type));
    } catch(e) {
        console.error("Erro:", e.message);
    } finally {
        await client.end();
    }
}
main().catch(console.error);
