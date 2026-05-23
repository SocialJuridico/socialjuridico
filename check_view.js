const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkTableOrView() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name = 'casos';
    `);
    console.log("Tipo do objeto 'casos':");
    console.table(res.rows);
    
    // Se for VIEW, pegar a definição
    if (res.rows[0] && res.rows[0].table_type === 'VIEW') {
      const resView = await client.query(`
        SELECT definition 
        FROM pg_views 
        WHERE viewname = 'casos';
      `);
      console.log("Definição da VIEW:");
      console.log(resView.rows[0].definition);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTableOrView();
