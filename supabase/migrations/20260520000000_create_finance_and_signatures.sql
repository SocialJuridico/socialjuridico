-- 1. Criação das tabelas de Finanças do Escritório
CREATE TABLE IF NOT EXISTS escritorio_subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (escritorio_id, tipo, categoria, nome)
);

CREATE TABLE IF NOT EXISTS escritorio_financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escritorio_id UUID NOT NULL REFERENCES escritorios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC(12, 2) NOT NULL,
  data_competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'PAGO',
  comprovante_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criação da tabela de Assinaturas Digitais
CREATE TABLE IF NOT EXISTS assinaturas_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
  client_id UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_url TEXT,
  original_hash TEXT,
  signed_hash TEXT,
  verification_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  document_type TEXT DEFAULT 'contrato',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_code ON assinaturas_digitais(verification_code);

-- 3. Habilitar Supabase Realtime para as tabelas de comunicação e mensagens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'escritorio_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escritorio_mensagens;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'escritorio_canais'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escritorio_canais;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'escritorio_voz_participantes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escritorio_voz_participantes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_publication p ON p.oid = pr.prpubid 
    JOIN pg_class c ON c.oid = pr.prrelid 
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
  END IF;
END $$;
