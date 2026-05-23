const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkPolicies() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as withcheck 
      FROM pg_policy 
      WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = 'casos');
    `);
    console.log("Políticas na tabela 'casos':");
    res.rows.forEach(p => {
      console.log(`- ${p.polname}:`);
      console.log(`  USING: ${p.qual}`);
      if (p.withcheck) console.log(`  WITH CHECK: ${p.withcheck}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkPolicies();
