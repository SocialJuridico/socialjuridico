require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTable() {
  const { data, error } = await supabase.from('interesses').select('*', { count: 'exact', head: true });
  if (error) {
    if (error.code === '42P01') {
      console.log("Tabela 'interesses' não existe.");
    } else {
      console.error("Erro:", error.message);
    }
  } else {
    console.log("Tabela 'interesses' existe.");
  }
}

checkTable();
