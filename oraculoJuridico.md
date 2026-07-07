# Oráculo Jurídico — Cadastro, Supervisores e Aprovação

Documento de especificação e acompanhamento da implementação do perfil
"Oráculo Jurídico" (estagiários/bacharéis em Direito sem OAB de advogado).
Baseado na especificação completa do cliente (2026-07-06) e na correção de
arquitetura pedida em seguida ("o e-mail de confirmação de conta só deve
sair ao final de todas as etapas do cadastro").

## 1. Arquitetura (por quê mudou desde a primeira rodada)

Na primeira rodada, a conta era criada já na Etapa 1 (`signUpAction`), com
e-mail de confirmação disparado imediatamente — igual ao fluxo de
cliente/advogado. O cliente pediu explicitamente que o e-mail de
confirmação (com status + botão) só seja enviado **ao final das 5 etapas**.

Isso tornaria necessário ter uma conta Auth "pendurada" sem sessão válida
enquanto o usuário preenche as etapas 2-5 (o Supabase não permite login
antes de confirmar o e-mail). Em vez de inventar um mecanismo de sessão
temporária, a solução adotada foi: **o wizard inteiro roda no cliente,
sem nenhuma chamada ao servidor até o fim.** Só na Etapa 5 (aceite dos
termos) é que tudo — conta, documento, cadastro completo e supervisores —
é enviado em uma única requisição multipart para `/api/oraculo/cadastro`.

Vantagem extra: se o usuário abandonar o wizard no meio, nenhuma conta
"zumbi" fica no banco.

## 2. Fluxo completo implementado

1. `/cadastro` → aba **"Sou Estagiário/Bacharel"** → card de introdução →
   botão "Iniciar cadastro do Oráculo" → `/cadastro/oraculo`.
2. `/cadastro/oraculo` (`src/app/cadastro/oraculo/page.js`) — wizard de 5
   etapas, tudo em estado local do React:
   - **Etapa 1 — Criar conta**: nome, e-mail, WhatsApp, CPF, cidade,
     estado, senha, origem.
   - **Etapa 2 — Perfil jurídico/acadêmico**: seletor de perfil
     (Estudante/Bacharel/Estagiário OAB/**Já sou advogado com OAB** — esta
     última redireciona para `/cadastro?perfil=advogado`, saindo do
     wizard). Campos condicionais por tipo (instituição, período/ano,
     matrícula, exame da OAB etc.) + upload do documento obrigatório
     (comprovante de matrícula, diploma, ou comprovante de estagiário).
   - **Etapa 3 — Experiência e interesses**: áreas de interesse (chips),
     experiência prática, disponibilidade semanal, bio, motivo.
   - **Etapa 4 — Supervisores**: 1 a 3 advogados "padrinhos"
     (`SupervisorsStep.js`, campos repetíveis).
   - **Etapa 5 — Termos**: as 7 declarações obrigatórias
     (`TermsStep.js`), todas devem estar marcadas para concluir.
3. Ao concluir a Etapa 5, o wizard monta um `FormData` (campo `payload`
   com todo o JSON + o arquivo do documento) e faz `POST
   /api/oraculo/cadastro`.
4. `src/app/api/oraculo/cadastro/route.js` faz, em sequência:
   - Revalida tudo no servidor (nunca confia só na validação do cliente).
   - Cria o usuário no Supabase Auth (`email_confirm: false`).
   - Sobe o documento pro bucket privado `oraculo-documentos`
     (`${userId}/${campo}-${timestamp}.${ext}`).
   - Insere a linha completa em `oraculo_profissionais`
     (`status = 'PENDENTE_DOCUMENTOS'`, `termos_aceitos_em = now()`).
   - Insere as linhas em `oraculo_supervisores` (`status = 'CONVIDADO'`,
     cada uma com `token_convite` gerado pelo banco).
   - Envia e-mail de convite para cada supervisor (assunto: "Convite para
     ser supervisor"), link para `/oraculo/supervisor/{token_convite}`.
   - Envia o **e-mail de confirmação de conta com status e botão de
     confirmar** (`oraculoAccountConfirmationTemplate`) — este é o e-mail
     pedido para sair "ao final de todas as etapas".
   - Em qualquer falha após a criação do usuário, remove o usuário criado
     (best-effort) para não deixar conta órfã.

## 3. Supervisores (padrinhos)

- E-mails enviados para o **e-mail que o próprio Oráculo cadastrou** para
  cada padrinho (não para o e-mail de uma conta de advogado já existente
  na plataforma — são campos livres preenchidos na Etapa 4).
- Link do convite: `/oraculo/supervisor/[token]`
  (`src/app/oraculo/supervisor/[token]/page.js`, página pública, sem
  login) — busca o convite via `GET /api/oraculo/supervisor/[token]` e
  permite **Aceitar** ou **Recusar** via `POST` no mesmo endpoint
  (`src/app/api/oraculo/supervisor/[token]/route.js`).
- Ao responder, o status do cadastro é recomputado (ver seção 4). Se a
  aprovação do supervisor for o que faltava para `ATIVO`, o Oráculo recebe
  e-mail avisando que já pode acessar a conta.

## 4. Máquina de status (`src/lib/oraculo/oraculoStatus.js`)

`computeOraculoStatus({ adminDecision, supervisorApproved })` combina dois
sinais independentes:

- `adminDecision`: `'APROVADO' | 'REPROVADO' | 'SUSPENSO' | null` —
  derivado da própria linha (`REPROVADO`/`SUSPENSO` se já estava nesse
  status; `APROVADO` se `aprovado_em` estiver preenchido).
- `supervisorApproved`: `true` se pelo menos um `oraculo_supervisores` da
  linha estiver com `status = 'APROVADO'`.

| adminDecision | supervisorApproved | resultado |
|---|---|---|
| REPROVADO | qualquer | `REPROVADO` |
| SUSPENSO | qualquer | `SUSPENSO` |
| APROVADO | true | `ATIVO` |
| APROVADO | false | `PENDENTE_SUPERVISOR` |
| null | true | `PENDENTE_ADMIN` |
| null | false | `PENDENTE_DOCUMENTOS` |

`RESTRITO` fica reservado no schema para uso futuro — nenhuma ação hoje
produz esse status. Testado em `oraculoStatus.test.js` (5 casos).

## 5. Painel do Administrador (`/dashboard/admin/oraculos`)

- Nova rota **só dos cadastros do Oráculo** (card "Cadastros do Oráculo"
  em Usuários & Perfis no painel principal do admin).
- Lista com filtro por status, cada card mostra dados do cadastro,
  resumo dos supervisores (quantos aprovaram) e um botão **"Ver documento
  enviado"** que busca uma URL assinada (5 min) do bucket privado via
  `GET /api/admin/oraculos/[id]/documento?field=...`
  (`comprovante_matricula_url` | `diploma_url` |
  `comprovante_estagiario_url`, conforme o tipo do cadastro).
- Três ações: **Aprovar / Rejeitar / Suspender**
  (`PATCH /api/admin/oraculos/[id]`, body `{ decision, motivo }`) —
  rejeitar e suspender exigem motivo (textarea obrigatória na UI).
- Toda decisão recomputa o status (seção 4) e **envia e-mail ao Oráculo**
  avisando o novo status e o motivo, se houver
  (`oraculoAdminDecisionTemplate`), para que ele saiba que já pode tentar
  acessar a conta.

## 6. E-mails (`src/lib/oraculo/oraculoEmails.js`)

- `oraculoAccountConfirmationTemplate` — enviado ao final das 5 etapas,
  com selo de status (`PENDENTE_DOCUMENTOS` neste ponto) e botão
  "Confirmar minha conta" (mesmo mecanismo de link do Supabase usado para
  cliente/advogado, via `/confirmar-email/processar`).
- `oraculoSupervisorInviteTemplate` — convite ao padrinho.
- `oraculoAdminDecisionTemplate` — reaproveitado tanto para a notificação
  de decisão do admin quanto para o aviso de ativação disparado pela
  aprovação do supervisor.

## 7. Login, papel (role) e dashboard próprio

- `getRoleFromDatabase()` reconhece `ORACULO` via
  `oraculo_profissionais.auth_user_id` (seção já implementada na rodada
  anterior).
- Login (`/api/auth/login`) busca o perfil do Oráculo separadamente (FK é
  `auth_user_id`, não `id`) — sem isso, um Oráculo sem perfil nas outras
  tabelas viraria CLIENT por engano no fallback de "criar perfil padrão".
- `middleware.js` e `/login` redirecionam `role === "ORACULO"` para
  `/oraculoacademico/painel` (ver §11 — mudou de `/dashboard/oraculo`).
- `/oraculoacademico/painel` continua sendo **só uma tela de status
  mínima** (nome + selo do status atual) — **não é o dashboard
  definitivo**. O cliente vai enviar depois como deve ser o dashboard
  próprio do Oráculo; esta tela fica como placeholder até lá.

## 8. Arquivos novos/alterados nesta rodada

- `database/migrations/20260706_oraculo_groundwork.sql` — reescrita de
  novo: `motivo_suspensao`/`suspenso_em` em `oraculo_profissionais`, bucket
  de storage `oraculo-documentos` (privado, PDF/JPG/PNG/WEBP, 8 MB).
- `src/lib/oraculo/oraculoStatus.js` + teste.
- `src/lib/oraculo/oraculoEmails.js`.
- `src/lib/brStates.js` (lista de UFs compartilhada).
- `src/app/api/oraculo/cadastro/route.js` — endpoint único que cria conta
  + sobe documento + grava cadastro + supervisores + dispara e-mails.
- `src/app/cadastro/oraculo/page.js` + `components/SupervisorsStep.js` +
  `components/TermsStep.js` + `OraculoWizard.module.css` — wizard de 5
  etapas.
- `src/app/cadastro/page.js` — aba do Oráculo simplificada para um card de
  introdução + link (revertida a versão com campos inline da rodada
  anterior).
- `src/app/actions/authActions.js` — revertido o branch `ORACULO` de
  `signUpAction` (a criação de conta do Oráculo agora é só pelo endpoint
  dedicado).
- `src/app/api/oraculo/supervisor/[token]/route.js` +
  `src/app/oraculo/supervisor/[token]/page.js` +
  `SupervisorInvite.module.css` — aceite/recusa pública do convite.
- `src/app/api/admin/oraculos/route.js`,
  `src/app/api/admin/oraculos/[id]/route.js`,
  `src/app/api/admin/oraculos/[id]/documento/route.js` — painel do admin.
- `src/app/dashboard/admin/oraculos/page.js` +
  `OraculosAdmin.module.css` + card em `config/adminSections.js`.

## 9. Fora de escopo nesta rodada (aguardando o cliente)

- **Dashboard definitivo do Oráculo** — o cliente vai enviar a
  especificação; `/dashboard/oraculo` continua como placeholder de status.
- Qualquer lógica de atribuição/trabalho dos Oráculos nos casos da faixa
  `ORACULO` (`oraculo_case_interests` continua inerte, sem API/UI).

## 10. Migração pendente no Supabase

Rodar na ordem, manualmente, no SQL Editor:
1. `database/migrations/20260706_case_intent_score.sql`
2. `database/migrations/20260706_opportunities_intent_tiers.sql`
3. `database/migrations/20260706_oraculo_groundwork.sql` (versão final,
   com bucket de storage e colunas de suspensão)

## 11. Pivô de arquitetura — produto "Social Jurídico Oráculo Acadêmico"

Após reunião interna, o cadastro do Oráculo deixou de ser uma aba dentro
de `/cadastro` do Social Jurídico e virou um **produto próprio dentro do
mesmo app Next.js**: `/oraculoacademico`. Mesmo repositório, mesmo
deploy, mesmo processo na VPS — segue exatamente o padrão já usado por
`/assinatura` (Social Jurídico Assinatura) neste mesmo código-fonte.
Não é um app Next separado (isso exigiria multi-zones: dois repos, dois
builds, dois processos) — é só mais uma árvore de rotas isolada por
pasta, com identidade visual própria dentro do layout aninhado.

**Por quê:** o cliente quer validar o Oráculo Acadêmico como MVP antes de
decidir se ele vira um produto totalmente desvinculado (repo próprio,
deploy próprio) mais adiante. Nascer como rota isolada dentro de uma
pasta só (`src/app/oraculoacademico/`) facilita esse "corte do cordão"
no futuro, sem exigir nada agora.

**O que mudou de lugar:**
- `src/app/cadastro/oraculo/*` → `src/app/oraculoacademico/cadastro/*`
  (wizard de 5 etapas, mesmos componentes, mesmo endpoint
  `POST /api/oraculo/cadastro`, que continua no lugar).
- `src/app/oraculo/supervisor/[token]/*` →
  `src/app/oraculoacademico/supervisor/[token]/*` (página pública de
  aceite/recusa do convite de padrinho).
- `src/app/dashboard/oraculo/*` → `src/app/oraculoacademico/painel/*`
  (tela de status mínima pós-login, ainda placeholder).
- Aba "Sou Estagiário/Bacharel" removida de `/cadastro` — o produto
  agora se divulga por conta própria em `/oraculoacademico`.

**O que ficou onde estava (sem mudança):** `POST /api/oraculo/cadastro`,
`GET/POST /api/oraculo/supervisor/[token]`, todo o painel
`/dashboard/admin/oraculos` e suas 3 rotas de API, `oraculoStatus.js`,
`oraculoEmails.js` (textos atualizados para "Oráculo Acadêmico"),
migração SQL e bucket de storage.

**Login e redirecionamento:** `/oraculoacademico/login` é uma página
nova com formulário próprio, que chama o mesmo `POST /api/auth/login`
(sem mudança de backend) e redireciona para `/oraculoacademico/painel`.
`middleware.js` ganhou `/oraculoacademico/painel` em `PROTECTED_ROUTES` e
`/oraculoacademico/login` em `AUTH_ROUTES`; o redirect de
`role === "ORACULO"` (tanto no middleware quanto no `/login` principal)
agora aponta para `/oraculoacademico/painel`. O `Footer` global
(`src/components/Footer/index.jsx`) se esconde em qualquer rota que
comece com `/oraculoacademico`, já que o produto tem seu próprio
`OraculoFooter`.

**Estrutura de páginas criada** (identidade visual dark/gold idêntica ao
Social Jurídico, `layout.js` próprio com `OraculoHeader`/`OraculoFooter`
compartilhados por todas as rotas filhas):
`/oraculoacademico` (home), `/como-funciona`, `/estudantes`,
`/supervisores`, `/instituicoes`, `/instituicoes/parceria`,
`/pratica-juridica`, `/seguranca-auditoria`, `/impacto`, `/faq`,
`/regras`, `/termos`, `/privacidade`, `/login`, `/cadastro`.

**Fora de escopo ainda:** o dashboard definitivo do Oráculo (a
especificação virá do cliente em seguida) e qualquer lógica de
atribuição de casos aos Oráculos.
