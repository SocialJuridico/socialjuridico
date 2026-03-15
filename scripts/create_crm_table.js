require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createCrmClientsTable() {
  console.log("Criando tabela crm_clients...");
  
  // Note: Using RPC or raw SQL via fetch for migrations is better if possible, 
  // but here I'll check if table exists and log instructions or try to infer.
  // Actually, I can use the 'supabase' client to try a select, if it fails, I'll know it's missing.
  
  const { error } = await supabase.from('crm_clients').select('id').limit(1);
  
  if (error && error.code === '42P01') { // Table doesn't exist
    console.log("Tabela crm_clients não existe. Por favor, execute o seguinte SQL no console do Supabase:");
    console.log(`
      CREATE TABLE crm_clients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        advogado_id UUID REFERENCES advogados(id) ON DELETE CASCADE,
        nome_completo TEXT NOT NULL,
        tipo TEXT DEFAULT 'Pessoa Física',
        cpf_cnpj TEXT,
        rg_ie TEXT,
        estado_civil TEXT,
        profissao TEXT,
        telefone TEXT,
        endereco_completo TEXT,
        email TEXT,
        notas_internas TEXT,
        score_confianca INTEGER DEFAULT 0,
        segmentacao TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      -- Habilitar RLS
      ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

      -- Políticas simplificadas (Advogado vê apenas seus clientes)
      CREATE POLICY "Advogados podem ver seus próprios clientes" ON crm_clients
        FOR SELECT USING (auth.uid() = advogado_id);

      CREATE POLICY "Advogados podem inserir seus próprios clientes" ON crm_clients
        FOR INSERT WITH CHECK (auth.uid() = advogado_id);

      CREATE POLICY "Advogados podem atualizar seus próprios clientes" ON crm_clients
        FOR UPDATE USING (auth.uid() = advogado_id);
    `);
  } else if (error) {
    console.error("Erro ao verificar tabela:", error.message);
  } else {
    console.log("Tabela crm_clients já existe.");
  }
}

createCrmClientsTable();
