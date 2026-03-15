require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkStructure() {
  const { data, error } = await supabase.from('interesses').select('*').limit(1);
  if (error) {
    console.error("Erro:", error.message);
  } else {
    console.log("Exemplo de dado em interesses:", data[0]);
  }
}

checkStructure();
