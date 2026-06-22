const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log("Attempting mock insert with client_id: null...");
  const mockId = '00000000-0000-0000-0000-000000000000';
  
  // We need a valid lawyer_id. Let's fetch one from advogados
  const { data: adv } = await supabase.from('advogados').select('id').limit(1);
  if (!adv || !adv.length) {
    console.error("No lawyers found in database to use as lawyer_id.");
    return;
  }
  const lawyerId = adv[0].id;
  console.log("Using lawyerId:", lawyerId);

  const { data: insertData, error: insertError } = await supabase
    .from('lawyer_processes')
    .insert([{
      id: mockId,
      numero_cnj: '00000000000000000000',
      lawyer_id: lawyerId,
      client_id: null, // test if null is allowed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select('*');
    
  if (insertError) {
    console.log("Insert failed. Error code/msg:", insertError.code, insertError.message);
  } else {
    console.log("Insert succeeded! client_id is nullable in lawyer_processes.");
    // Clean up
    await supabase.from('lawyer_processes').delete().eq('id', mockId);
  }
}

inspect();
