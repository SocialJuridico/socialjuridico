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
        await client.query('BEGIN');
        
        // Check if advogados table exists
        const advExists = await client.query("SELECT to_regclass('public.advogados');");
        if (advExists.rows[0].to_regclass === null) {
            console.log("1. Creating table 'advogados' with the same schema as 'profiles'...");
            await client.query('CREATE TABLE advogados (LIKE profiles INCLUDING ALL);');
        } else {
            console.log("1. Table 'advogados' already exists.");
        }

        console.log("2. Copying LAWYER records to 'advogados'...");
        const insertRes = await client.query("INSERT INTO advogados SELECT * FROM profiles WHERE role = 'LAWYER' ON CONFLICT DO NOTHING;");
        console.log(`Copied ${insertRes.rowCount} lawyers.`);

        console.log("3. Deleting LAWYER records from 'profiles'...");
        const deleteRes = await client.query("DELETE FROM profiles WHERE role = 'LAWYER';");
        console.log(`Deleted ${deleteRes.rowCount} lawyers from profiles.`);

        console.log("4. Renaming 'profiles' to 'clientes'...");
        // Check if 'profiles' exists before renaming
        const profExists = await client.query("SELECT to_regclass('public.profiles');");
        if (profExists.rows[0].to_regclass !== null) {
            await client.query('ALTER TABLE profiles RENAME TO clientes;');
            console.log("Renamed 'profiles' to 'clientes'.");
        } else {
            console.log("Table 'profiles' does not exist (might have been renamed already).");
        }

        await client.query('COMMIT');
        console.log("Migration completed successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", err.stack);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
