require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupAvatars() {
  console.log("Criando bucket 'avatars'...");
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 5242880 // 5MB
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log("Bucket avatars já existe.");
    } else {
      console.error("Erro criar bucket:", error.message);
    }
  } else {
    console.log("Bucket avatars criado com sucesso.");
  }
}

setupAvatars();
