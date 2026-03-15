-- ============================================================
-- MIGRAÇÃO: Regras de Negócio SocialJurídico
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar coluna status na tabela case_interests
--    PENDING  = aguardando resposta do cliente
--    ACCEPTED = cliente aceitou o interesse
--    DECLINED = cliente recusou o interesse
ALTER TABLE case_interests
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS lawyer_name TEXT;

-- 2. Adicionar coluna chat_started em casos
--    TRUE = os 4 Juris já foram cobrados para este caso
ALTER TABLE casos
  ADD COLUMN IF NOT EXISTS chat_started BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Garantir colunas is_premium e balance em advogados (caso não existam)
ALTER TABLE advogados
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;

-- 4. Adicionar colunas tipo e meta em notificacoes (usadas pelos novos fluxos de interesse)
ALTER TABLE notificacoes
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'GERAL',
  ADD COLUMN IF NOT EXISTS meta TEXT;

-- 5. Atualizar interesses já existentes (sem status) para PENDING
UPDATE case_interests SET status = 'PENDING' WHERE status IS NULL;
