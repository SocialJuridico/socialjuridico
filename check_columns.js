const { Client } = require('pg');
const DATABASE_URL = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();

    try {
        const clientesRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'clientes';");
        console.log("=== CLIENTES TABLE COLUMNS ===");
        clientesRes.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

        const advogadosRes = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'advogados';");
        console.log("\n=== ADVOGADOS TABLE COLUMNS ===");
        advogadosRes.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error("Failed to fetch columns:", err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
