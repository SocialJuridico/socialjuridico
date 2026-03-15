require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCrmColumns() {
  const { data, error } = await supabase.from('crm_clients').select('*').limit(1);
  if (error) {
    console.error("Erro ao acessar crm_clients:", error.message);
  } else {
    console.log("Colunas encontradas:", data.length > 0 ? Object.keys(data[0]) : "Tabela vazia, não foi possível detectar colunas via select.");
    
    // Fallback: try to insert a dummy record and rollback or just assume based on common patterns
    // Better: use rpc if available or just assume standard fields based on the user screenshot
  }
}

checkCrmColumns();
