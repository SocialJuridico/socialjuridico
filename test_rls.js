const { createClient } = require('@supabase/supabase-js');

async function testRLS() {
  const SUPABASE_URL = "https://uwkcdwlgobnhowumcdnp.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTEyNDIsImV4cCI6MjA4OTE4NzI0Mn0.Nz-2pITIzlzZW-sePHXAyW6Kz19p45vlMN22Z8VEYEk";

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("Tentando buscar casos sem advogado...");
  const { data, error } = await supabase
    .from('casos')
    .select('id, titulo')
    .is('advogado_id', null)
    .in('status', ['ABERTO', 'NEGOCIANDO'])
    .limit(5);

  if (error) {
     console.log("Erro de permissão (RLS):", error);
  } else {
     console.log("Casos encontrados com chave pública:", data);
  }
}

testRLS();
