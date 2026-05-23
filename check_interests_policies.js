const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkInterestsPolicies() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy 
      WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'case_interests');
    `);
    console.log("Políticas na tabela 'case_interests':");
    res.rows.forEach(p => {
      console.log(`- ${p.polname}:`);
      console.log(`  USING: ${p.qual}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkInterestsPolicies();
