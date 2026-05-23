const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres"
});

async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM pg_policies WHERE tablename = 'notificacoes'");
    console.log('Notificacoes Policies:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error running query:', err);
  } finally {
    await client.end();
  }
}

run();
