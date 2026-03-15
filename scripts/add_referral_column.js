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
        console.log("Adicionando coluna 'origem_descoberta'...");
        
        await client.query("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS origem_descoberta TEXT;");
        console.log("✅ Coluna adicionada à tabela 'clientes'");

        await client.query("ALTER TABLE advogados ADD COLUMN IF NOT EXISTS origem_descoberta TEXT;");
        console.log("✅ Coluna adicionada à tabela 'advogados'");

    } catch(e) {
        console.error("Erro ao alterar tabelas:", e.message);
    } finally {
        await client.end();
    }
}
main().catch(console.error);
