require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const DATABASE_URL = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function syncMetadata() {
    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    await pgClient.connect();

    const tables = ['clientes', 'advogados', 'admins'];
    const roleMap = { 'clientes': 'CLIENT', 'advogados': 'LAWYER', 'admins': 'ADMIN' };

    for (const table of tables) {
        console.log(`Buscando ${table}...`);
        const { rows } = await pgClient.query(`SELECT id, email, name FROM ${table}`);
        
        for (const user of rows) {
            process.stdout.write(`Sincronizando ${user.email} (${roleMap[table]})... `);
            
            // Busca o usuário no Auth para pegar metadados existentes
            const { data: { user: authUser }, error: fetchError } = await supabase.auth.admin.getUserById(user.id);
            
            if (fetchError) {
                console.log(`ERRO: Usuário não está no Auth.`);
                continue;
            }

            const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
                user_metadata: { 
                    ...authUser.user_metadata,
                    full_name: user.name,
                    role: roleMap[table]
                }
            });

            if (updError) console.log(`ERRO: ${updError.message}`);
            else console.log(`OK!`);
        }
    }

    await pgClient.end();
}

syncMetadata();
