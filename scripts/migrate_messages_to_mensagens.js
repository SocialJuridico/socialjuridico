require('dotenv').config();
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("✅ Conectado ao banco de dados.\n");

    try {
        // 1. Mostrar colunas de messages
        const colMessages = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
            ORDER BY ordinal_position;
        `);
        console.log("=== COLUNAS DA TABELA messages ===");
        colMessages.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

        // 2. Mostrar colunas de mensagens
        const colMensagens = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'mensagens'
            ORDER BY ordinal_position;
        `);
        console.log("\n=== COLUNAS DA TABELA mensagens ===");
        colMensagens.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

        // 3. Contar registros
        const countSrc = await client.query("SELECT COUNT(*) FROM messages;");
        const countDst = await client.query("SELECT COUNT(*) FROM mensagens;");
        console.log(`\n📊 messages:  ${countSrc.rows[0].count} registros`);
        console.log(`📊 mensagens: ${countDst.rows[0].count} registros`);

        // 4. Amostra de dados de messages
        const sample = await client.query("SELECT * FROM messages LIMIT 2;");
        console.log("\n=== AMOSTRA DE messages ===");
        console.log(JSON.stringify(sample.rows, null, 2));

        // 5. Amostra de dados de mensagens
        const sampleDst = await client.query("SELECT * FROM mensagens LIMIT 2;");
        console.log("\n=== AMOSTRA DE mensagens ===");
        console.log(JSON.stringify(sampleDst.rows, null, 2));

        if (sample.rows.length === 0) {
            console.log("\n⚠️  Tabela messages está vazia. Nada para migrar.");
            return;
        }

        // 6. Perguntar se quer migrar (auto-confirmar em scripts)
        const msgCols = colMessages.rows.map(r => r.column_name);
        const mensCols = colMensagens.rows.map(r => r.column_name);

        console.log("\n=== COLUNAS EM COMUM ===");
        const commonCols = msgCols.filter(c => mensCols.includes(c));
        console.log(commonCols.join(', '));

        console.log("\n=== COLUNAS APENAS EM messages (precisam de mapeamento) ===");
        const onlyInMessages = msgCols.filter(c => !mensCols.includes(c));
        console.log(onlyInMessages.length > 0 ? onlyInMessages.join(', ') : "(nenhuma)");

        console.log("\n=== COLUNAS APENAS EM mensagens ===");
        const onlyInMensagens = mensCols.filter(c => !msgCols.includes(c));
        console.log(onlyInMensagens.length > 0 ? onlyInMensagens.join(', ') : "(nenhuma)");

        console.log("\n⏳ Iniciando migração...");

        // 7. Buscar todos os registros de messages
        const allMessages = await client.query("SELECT * FROM messages ORDER BY id;");
        console.log(`\n📥 Lendo ${allMessages.rows.length} registros de messages...`);

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const msg of allMessages.rows) {
            try {
                // Mapear campos de 'messages' para 'mensagens'
                // Ajuste este mapeamento conforme as colunas reais das tabelas
                const mapped = {};

                // Colunas em comum - copia direto
                for (const col of commonCols) {
                    mapped[col] = msg[col];
                }

                // Mapeamentos especiais (ajuste conforme necessário)
                // 'timestamp' de messages -> 'created_at' em mensagens (se existir)
                if (!mapped.created_at && msg.timestamp && mensCols.includes('created_at')) {
                    mapped.created_at = msg.timestamp;
                }
                // 'case_id' de messages -> 'caso_id' em mensagens (se existir)
                if (!mapped.caso_id && msg.case_id && mensCols.includes('caso_id')) {
                    mapped.caso_id = msg.case_id;
                }
                // 'recipient_id' -> 'destinatario_id' (se existir)
                if (!mapped.destinatario_id && msg.recipient_id && mensCols.includes('destinatario_id')) {
                    mapped.destinatario_id = msg.recipient_id;
                }
                // 'file_url' -> 'arquivo_url' (se existir)
                if (!mapped.arquivo_url && msg.file_url && mensCols.includes('arquivo_url')) {
                    mapped.arquivo_url = msg.file_url;
                }

                const cols = Object.keys(mapped).filter(k => mapped[k] !== undefined);
                const vals = cols.map(k => mapped[k]);
                const placeholders = cols.map((_, i) => `$${i + 1}`);

                await client.query(`
                    INSERT INTO mensagens (${cols.join(', ')})
                    VALUES (${placeholders.join(', ')})
                    ON CONFLICT (id) DO UPDATE SET
                    ${cols.filter(c => c !== 'id').map((c, i) => `${c} = $${i + 2}`).join(', ')}
                `, vals);

                migrated++;
            } catch (err) {
                console.error(`  ❌ Erro ao migrar registro ${msg.id}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✅ Migração concluída!`);
        console.log(`  ✔  Migrados: ${migrated}`);
        console.log(`  ⏭  Ignorados: ${skipped}`);
        console.log(`  ❌ Erros: ${errors}`);

        const finalCount = await client.query("SELECT COUNT(*) FROM mensagens;");
        console.log(`\n📊 Total em mensagens agora: ${finalCount.rows[0].count}`);

    } catch (err) {
        console.error("❌ Erro fatal:", err.message);
    } finally {
        await client.end();
        console.log("\n🔌 Conexão encerrada.");
    }
}

main().catch(console.error);
