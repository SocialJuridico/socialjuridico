const { Client } = require('pg');
const DATABASE_URL = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    try {
        console.log("Checking if 'estado' column exists in advogados...");
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='advogados' AND column_name='estado';
        `);
        
        if (res.rows.length === 0) {
            console.log("Adding 'estado' column...");
            await client.query("ALTER TABLE advogados ADD COLUMN estado VARCHAR(2);");
            console.log("Column 'estado' added successfully.");
        } else {
            console.log("Column 'estado' already exists.");
        }

    } catch (err) {
        console.error("Failed to alter table:", err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
