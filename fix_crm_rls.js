const { Client } = require('pg');
const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log("=== RLS: crm_interactions ===\n");

    await client.query(`ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;`);
    console.log("✅ RLS habilitada em crm_interactions");

    await client.query(`DROP POLICY IF EXISTS "crm_interactions_select_own" ON public.crm_interactions;`);
    await client.query(`
      CREATE POLICY "crm_interactions_select_own"
      ON public.crm_interactions FOR SELECT TO authenticated
      USING (lawyer_id = auth.uid());
    `);
    console.log("✅ SELECT em crm_interactions");

    await client.query(`DROP POLICY IF EXISTS "crm_interactions_insert_own" ON public.crm_interactions;`);
    await client.query(`
      CREATE POLICY "crm_interactions_insert_own"
      ON public.crm_interactions FOR INSERT TO authenticated
      WITH CHECK (lawyer_id = auth.uid());
    `);
    console.log("✅ INSERT em crm_interactions");

    console.log("\n🎉 Políticas RLS de interações aplicadas!");
  } catch (err) {
    console.error("❌ Erro:", err.message);
  } finally {
    await client.end();
  }
}
main();
