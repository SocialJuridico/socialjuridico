require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('crm_documents', {
    public: true,
    fileSizeLimit: 52428800 // 50MB
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log("Bucket crm_documents já existe.");
    } else {
      console.error("Erro criar bucket:", error.message);
    }
  } else {
    console.log("Bucket crm_documents criado.");
  }
}

setupStorage();
