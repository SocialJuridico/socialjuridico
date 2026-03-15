require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTables() {
  const { data, error } = await supabase.from('crm_documents').select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log("Tabela crm_documents não existe.");
  } else {
    console.log("Tabela crm_documents já existe.");
  }
}

checkTables();
