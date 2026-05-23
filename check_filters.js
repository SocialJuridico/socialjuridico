const { Client } = require('pg');

const connectionString = "postgresql://postgres.uwkcdwlgobnhowumcdnp:Amoravida1@1@aws-1-sa-east-1.pooler.supabase.com:6543/postgres";

async function checkInterests() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    // Pegar o e-mail do Saulo (o usuário logado)
    const resUser = await client.query(`SELECT id FROM auth.users WHERE email LIKE '%saulo%' OR email LIKE '%carlos%' LIMIT 1;`);
    const userId = resUser.rows[0]?.id;

    if (!userId) {
      console.log("Usuário não encontrado.");
      return;
    }

    console.log("Advogado ID:", userId);

    const resInterests = await client.query(`
      SELECT case_id FROM public.case_interests WHERE lawyer_id = $1;
    `, [userId]);

    console.log("Interesses do Advogado:", resInterests.rows.map(r => r.case_id));

    const resCases = await client.query(`
      SELECT id, titulo, status 
      FROM public.casos 
      WHERE status IN ('ABERTO', 'NEGOCIANDO') AND advogado_id IS NULL;
    `);

    console.log("Casos abertos disponíveis:", resCases.rows.map(r => r.id));
    
    // Filtro simulado
    const openCases = resCases.rows.filter(c => !resInterests.rows.some(i => i.case_id === c.id));
    console.log("Casos que SOBRAM APÓS O FILTRO:", openCases.length);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkInterests();
