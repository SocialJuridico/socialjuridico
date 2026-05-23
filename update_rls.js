const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    console.log("=== ADICIONANDO POLÍTICA RLS PARA MARKETPLACE ===");
    
    // Deleta se já existir
    await client.query(`DROP POLICY IF EXISTS "Advogados podem ver casos disponiveis no marketplace" ON public.casos;`);
    
    const sql = `
      CREATE POLICY "Advogados podem ver casos disponiveis no marketplace" 
      ON public.casos 
      FOR SELECT 
      USING (
        (status = 'ABERTO' OR status = 'NEGOCIANDO') AND advogado_id IS NULL
      );
    `;
    await client.query(sql);
    console.log("Política RLS criada com sucesso!");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
