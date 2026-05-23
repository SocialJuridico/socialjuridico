const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function clearSchemaCache() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log("Enviando comando para recarregar o schema do PostgREST...");
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Cache recarregado com sucesso!");
  } catch (err) {
    console.error("Erro ao recarregar cache:", err);
  } finally {
    await client.end();
  }
}

clearSchemaCache();
