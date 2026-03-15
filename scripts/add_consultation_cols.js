require('dotenv').config();
const { Client } = require('pg');
const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    try {
        console.log("Adding consultation columns to 'advogados'...");
        
        // Add consulta
        const checkConsulta = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='advogados' AND column_name='consulta';");
        if (checkConsulta.rows.length === 0) {
            await client.query("ALTER TABLE advogados ADD COLUMN consulta TEXT DEFAULT 'Gratuita';");
            console.log("Column 'consulta' added.");
        }

        // Add tempo
        const checkTempo = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='advogados' AND column_name='tempo';");
        if (checkTempo.rows.length === 0) {
            await client.query("ALTER TABLE advogados ADD COLUMN tempo TEXT;");
            console.log("Column 'tempo' added.");
        }

        // Add valor
        const checkValor = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='advogados' AND column_name='valor';");
        if (checkValor.rows.length === 0) {
            await client.query("ALTER TABLE advogados ADD COLUMN valor NUMERIC(10,2) DEFAULT 0;");
            console.log("Column 'valor' added.");
        }

        console.log("All columns verified/added successfully.");

    } catch (err) {
        console.error("Failed to alter table:", err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
