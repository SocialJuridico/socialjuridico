const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

function inferType(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
    }
    if (typeof value === 'string') {
        // Simple regex for UUID
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
            return 'UUID';
        }
        // Simple regex for ISO timestamp
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)) {
            return 'TIMESTAMP WITH TIME ZONE';
        }
        return 'TEXT';
    }
    if (typeof value === 'object') {
        return 'JSONB';
    }
    return 'TEXT';
}

function getTableSchema(data) {
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const schema = {};
    const columns = Object.keys(data[0]);

    for (const col of columns) {
        let colType = null;
        for (let i = 0; i < data.length; i++) {
            const inferred = inferType(data[i][col]);
            if (inferred) {
                colType = inferred;
                break;
            }
        }
        schema[col] = colType || 'TEXT'; // Default to TEXT if all nulls
    }

    // Usually `id` should be primary key
    if (schema['id']) {
        schema['id'] = schema['id'] + ' PRIMARY KEY';
    }

    return schema;
}

async function main() {
    const dir = path.join(__dirname, 'supabaseteste');
    const files = await fs.readdir(dir);

    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log("Connected to Supabase Postgres.");

    for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const tableName = file.replace('.json', '');
        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        let data;
        try {
            data = JSON.parse(content);
        } catch(e) {
            console.error(`Failed to parse ${file}`);
            continue;
        }

        if (!Array.isArray(data) || data.length === 0) {
            console.log(`Skipping ${tableName} because it has no data to infer schema.`);
            continue;
        }

        const schema = getTableSchema(data);
        if (!schema) continue;

        const colDefs = Object.entries(schema)
            .map(([col, type]) => `"${col}" ${type}`)
            .join(', ');

        const createQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs});`;
        console.log(`Creating table ${tableName}...`);
        
        try {
            await client.query(createQuery);
            console.log(`Table ${tableName} ensured.`);
            
            // Clear table to replace instead of duplicate
            await client.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);

            // Insert in chunks to avoid query param limits
            const columns = Object.keys(data[0]);
            const chunkSize = Math.floor(65535 / columns.length) - 1; 

            for(let i = 0; i < data.length; i += chunkSize) {
                const chunk = data.slice(i, i + chunkSize);
                let valuesStrArr = [];
                let params = [];
                let paramIndex = 1;

                for(const row of chunk) {
                    let rowVals = [];
                    for(const col of columns) {
                        let val = row[col];
                        if (typeof val === 'object' && val !== null) {
                            val = JSON.stringify(val);
                        }
                        params.push(val);
                        rowVals.push(`$${paramIndex++}`);
                    }
                    valuesStrArr.push(`(${rowVals.join(', ')})`);
                }

                const insertQuery = `INSERT INTO "${tableName}" ("${columns.join('", "')}") VALUES ${valuesStrArr.join(', ')};`;
                await client.query(insertQuery, params);
            }
            console.log(`Inserted ${data.length} records into ${tableName}.`);

        } catch(err) {
            console.error(`Failed to process table ${tableName}:`, err.message);
        }
    }

    await client.end();
    console.log("Done.");
}

main().catch(console.error);
