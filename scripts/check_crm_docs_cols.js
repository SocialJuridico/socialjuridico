require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkCols() {
  const { data, error } = await supabase.from('crm_documents').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Colunas:", Object.keys(data[0]));
  } else {
    console.log("Vazia.");
  }
}

checkCols();
