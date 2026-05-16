import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFinanceLawyers() {
  const { data, error } = await supabase
    .from('crm_finance')
    .select('description, amount, lawyer_id');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('--- DB RECORDS LAWYER CHECK ---');
  data.forEach(r => {
    console.log(`Desc: ${r.description} | LawID: ${r.lawyer_id}`);
  });
}

checkFinanceLawyers();
