require('dotenv').config();
const pg = require('pg');

async function migrateData() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        
        console.log("Verificando colunas de 'cases'...");
        const resCases = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'cases';");
        const columnsCases = resCases.rows.map(r => r.column_name);
        console.log("Colunas CASES:", columnsCases);

        console.log("\nVerificando colunas de 'casos'...");
        const resCasos = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'casos';");
        const columnsCasos = resCasos.rows.map(r => r.column_name);
        console.log("Colunas CASOS:", columnsCasos);

        // Mapeamento provável:
        // id -> id
        // title -> titulo
        // description -> descricao
        // area -> area_atuacao (ou similar)
        // client_id -> cliente_id
        // status -> status
        // created_at -> created_at

        console.log("\nMigrando dados...");
        const migrationQuery = `
            INSERT INTO casos (id, titulo, descricao, area_atuacao, cliente_id, status, created_at, anexos, valor_proposto)
            SELECT 
                id, 
                COALESCE(title, 'Sem título'), 
                COALESCE(description, ''), 
                COALESCE(area, 'Civil'), 
                client_id, 
                COALESCE(status, 'ABERTO'), 
                COALESCE(created_at, NOW()),
                images,
                price
            FROM cases
            ON CONFLICT (id) DO UPDATE SET
                titulo = EXCLUDED.titulo,
                descricao = EXCLUDED.descricao,
                area_atuacao = EXCLUDED.area_atuacao,
                status = EXCLUDED.status,
                anexos = EXCLUDED.anexos,
                valor_proposto = EXCLUDED.valor_proposto;
        `;

        const resMigrate = await client.query(migrationQuery);
        console.log(`Sucesso! ${resMigrate.rowCount} registros migrados.`);

    } catch (err) {
        console.error("Erro na migração:", err);
    } finally {
        await client.end();
    }
}

migrateData();
