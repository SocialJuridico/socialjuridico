require('dotenv').config();
const pg = require('pg');

async function updateTable() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        const sql = "ALTER TABLE casos ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]';";
        await client.query(sql);
        console.log('✅ Coluna [anexos] adicionada com sucesso à tabela casos.');
    } catch (err) {
        console.error('❌ Erro ao atualizar tabela:', err.message);
    } finally {
        await client.end();
    }
}

updateTable();
