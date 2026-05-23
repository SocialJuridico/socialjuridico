const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkCases() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, titulo, status, advogado_id 
      FROM public.casos 
      WHERE status IN ('ABERTO', 'NEGOCIANDO')
      LIMIT 10;
    `);
    console.log("Casos no DB:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkCases();
