import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFinance() {
  const { data, error } = await supabase
    .from('crm_finance')
    .select('*');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total records:', data.length);
  data.forEach(r => {
    console.log(`- ${r.description}: ${r.amount} (${r.status}) Due: ${r.due_date}`);
  });
}

checkFinance();
