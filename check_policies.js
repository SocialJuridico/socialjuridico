const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkPolicies() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT polname, polpermissive, polroles, polcmd, polqual, polwithcheck 
      FROM pg_policy 
      WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'casos');
    `);
    console.log("Políticas na tabela 'casos':");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkPolicies();
