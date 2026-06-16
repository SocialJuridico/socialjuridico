# Change History Log — Historico de Mudancas e Deploys

**Controle ISO 27001:2022:** A.8.32 — Gerenciamento de mudancas | A.5.37 — Procedimentos operacionais  
**Frequencia:** Continuo — atualizado a cada mudanca relevante  
**Proprietario:** Carlos Henrique

---

## Criterio de registro

Toda mudanca que afete:
- Funcionalidades criticas de autenticacao ou autorizacao;
- Dados de usuarios, advogados ou clientes;
- Integracao com fornecedores criticos (Supabase, Stripe, Resend, OpenAI);
- Configuracoes de seguranca ou variaveis de ambiente;
- Politicas ou documentos do SGSI.

---

## Registro de mudancas

| ID | Data | Tipo | Descricao | Solicitante | Aprovador | Impacto | Rollback possivel | Status |
|---|---|---|---|---|---|---|---|---|
| CHG-001 | 2026-06-16 | Migracao de banco | Criacao da tabela `security_audit_events` com triggers de imutabilidade para trilha de auditoria ISO 27001 | Carlos Henrique | Carlos Henrique | Criacao de nova tabela — sem impacto em tabelas existentes | Sim (DROP TABLE) | Concluida |
| CHG-002 | 2026-06-16 | Documentacao | Expansao do SGSI: Risk Register (10 campos), SoA completa (93 controles), 11 evidencias operacionais | Carlos Henrique / Engenharia | Carlos Henrique | Sem impacto em producao — documentacao somente | N/A | Concluida |
| CHG-003 | 2026-06-04 | Funcionalidade | Integracao Google Contacts OAuth — endpoints `/api/auth/google-contacts` e `/api/admin/google-contacts/sync` | Carlos Henrique | Carlos Henrique | Novos endpoints admin; sem impacto em usuarios finais | Sim (remover rotas) | Concluida |
| CHG-004 | 2026-06-04 | Configuracao | Atualizacao do numero de suporte WhatsApp de 5515992653066 para 5515981657317 em 6 arquivos da aplicacao | Carlos Henrique | Carlos Henrique | Apenas links de contato — sem impacto em dados | N/A | Concluida |
| CHG-005 | 2026-05-31 | Funcionalidade | Exportacao CSV e PDF de advogados e clientes no painel administrativo | Carlos Henrique | Carlos Henrique | Nova funcionalidade restrita ao ADMIN | Sim | Concluida |

---

## Procedimento para registro de nova mudanca

1. Identificar o tipo de mudanca (funcionalidade, configuracao, migracao, documentacao, emergencia).
2. Registrar antes do deploy: solicitante, descricao, impacto esperado e aprovador.
3. Executar a mudanca.
4. Atualizar o status apos conclusao.
5. Para mudancas emergenciais: registrar retroativamente em ate 24 horas.

**Documento de procedimento:** `CHANGE_MANAGEMENT.md`
