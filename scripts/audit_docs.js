require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listDocs() {
  const { data: dbDocs, error: dbError } = await supabase.from('crm_documents').select('*');
  console.log("Docs no Banco:", dbDocs ? dbDocs.length : 0, dbDocs);
  
  const { data: files, error: storageError } = await supabase.storage.from('crm_documents').list('', { recursive: true });
  console.log("Files no Storage:", files ? files.length : 0, files);
}

listDocs();
