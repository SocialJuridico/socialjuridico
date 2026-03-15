require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createDocsTable() {
  console.log("Executando criação da tabela crm_documents...");
  
  // Como não posso rodar SQL puro sem RPC, vou sugerir o SQL caso dê erro persistente
  // Mas vou tentar um insert "cego" pra ver se o erro muda
  const { error } = await supabase.from('crm_documents').insert({ name: 'test' });
  
  if (error && error.code === 'PGRST205') {
    console.log("ERRO: Tabela não encontrada no PostgREST.");
    console.log("Por favor, execute este SQL no painel SQL do Supabase:");
    console.log(`
      CREATE TABLE IF NOT EXISTS public.crm_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_id UUID REFERENCES crm_clients(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE public.crm_documents ENABLE ROW LEVEL SECURITY;

      -- Políticas para crm_documents (Simplificado para testes)
      CREATE POLICY "Permitir tudo para autenticados" ON public.crm_documents
        FOR ALL USING (auth.role() = 'authenticated');
        
      -- NOTA: Após criar a tabela, se o erro persistir, clique em 
      -- 'API Settings' -> 'PostgREST' -> 'Reload Schema' no Supabase.
    `);
  }
}

createDocsTable();
