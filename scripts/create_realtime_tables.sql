-- 1. Tabela de Casos (Processos/Solicitações)
CREATE TABLE IF NOT EXISTS casos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    advogado_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    status TEXT DEFAULT 'ABERTO', -- ABERTO, EM_ANDAMENTO, CONCLUIDO, CANCELADO
    area_atuacao TEXT,
    valor_proposto DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Chat (Mensagens)
CREATE TABLE IF NOT EXISTS mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- Pode ser do clinte ou advogado
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Destinatário
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    link TEXT, -- Para onde redirecionar ao clicar
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Avaliações (Reviews)
CREATE TABLE IF NOT EXISTS avaliacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL, -- Quem avalia
    alvo_id UUID NOT NULL, -- Quem é avaliado
    nota INTEGER CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(caso_id, autor_id) -- Uma avaliação por caso por autor
);

-- Habilitar Realtime para estas tabelas no Supabase (Rodar no SQL Editor do Supabase)
-- ALTER PUBLICATION supabase_realtime ADD TABLE casos;
-- ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
