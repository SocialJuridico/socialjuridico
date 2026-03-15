require('dotenv').config();
const pg = require('pg');

async function enableRealtime() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        // Ativando Realtime para as tabelas
        // Nota: O nome da publicação padrão do Supabase é 'supabase_realtime'
        const sql = "ALTER PUBLICATION supabase_realtime ADD TABLE casos, mensagens, notificacoes;";
        
        await client.query(sql);
        console.log('✅ Realtime ativado com sucesso para as tabelas: casos, mensagens e notificacoes.');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('ℹ️ Realtime já estava ativado para algumas ou todas as tabelas.');
        } else {
            console.error('❌ Erro ao ativar Realtime:', err.message);
        }
    } finally {
        await client.end();
    }
}

enableRealtime();
