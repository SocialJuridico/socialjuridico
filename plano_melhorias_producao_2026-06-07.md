# Plano seguro de melhorias tecnicas - SocialJuridico

**Data:** 07/06/2026  
**Objetivo:** corrigir riscos tecnicos e elevar a nota tecnica do projeto sem quebrar a plataforma que ja esta em producao.  
**Principio central:** nenhuma mudanca critica deve ir direto para producao sem backup, branch separada, teste local, homologacao e plano de rollback.

## 1. Nota tecnica atual e meta

**Nota atual estimada:** 6/10.

O projeto tem boa base funcional e arquitetura ampla, mas perde nota por riscos de operacao, seguranca, logs, rotas temporarias, ambiente de build/teste instavel e governanca de segredos.

**Meta realista em 30 a 45 dias:** 8/10.

**Meta de maturidade em 60 a 90 dias:** 8,5 a 9/10, com CI/CD, testes de autorizacao, observabilidade e LGPD mais formalizados.

## 2. Ajuste de entendimento sobre login legado

O fluxo de senha padrao ainda existe por uma razao operacional: permitir migracao assistida de contas antigas para o banco atual.

Portanto, a recomendacao nao e remover esse fluxo imediatamente. A recomendacao correta e transformar esse mecanismo em um **fluxo controlado de recuperacao/migracao**, com trilha de auditoria e prazo de validade.

### Como manter o fluxo sem abrir risco desnecessario

1. Manter a possibilidade de migracao de conta antiga, mas apenas quando houver indicio real de conta legada.
2. Nao deixar a senha padrao funcionar como caminho generico e permanente de login.
3. Registrar auditoria quando a migracao for acionada: usuario, email mascarado, IP, horario, admin responsavel quando houver.
4. Exigir troca de senha imediatamente apos o primeiro acesso.
5. Bloquear repeticao do fluxo depois que o usuario atualizou a senha.
6. Adicionar limite de tentativas mais forte para login com senha padrao.
7. Criar uma flag no banco, por exemplo `legacy_migration_pending`, `legacy_migrated_at` e `password_reset_required`.
8. Substituir gradualmente a senha padrao por link/token de redefinicao de senha com expiracao.

### Meta para esse ponto

Nao quebrar usuarios antigos, mas reduzir a superficie de ataque. O fluxo continua existindo, porem com controle, auditoria, prazo e escopo menor.

## 3. Como corrigir o NPM/Yarn com seguranca

### Diagnostico observado

O Node esta instalado em:

- `C:\Program Files\nodejs\node.exe`

Mas o `npm` falhou tentando carregar:

- `C:\Users\marys\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`

Tambem houve erro de permissao no Corepack/Yarn em:

- `C:\Users\marys\AppData\Local\node\corepack\v1\yarn`

Isso indica problema na instalacao global do Node/npm/Corepack no Windows, nao necessariamente no codigo do projeto.

### Atualizacao apos validacao

O ambiente local passou a responder corretamente:

- `node --version`: `v22.16.0`
- `npm --version`: `11.1.0`
- `corepack --version`: `0.32.0`

Tambem foi validado:

- `npm ci`: executou com sucesso e instalou as dependencias.
- `npm test`: passou com 3 suites e 14 testes.
- `npm run build`: compilou com sucesso em producao.
- `npm run lint`: falhou com 89 problemas, sendo 39 erros e 50 avisos.

Conclusao: o problema principal de ambiente foi resolvido. A prioridade agora e sanear lint e auditoria de dependencias sem alterar comportamento de producao.

### Caminho recomendado

1. Fazer backup do projeto antes de qualquer alteracao.
2. Fechar terminais abertos.
3. Reinstalar o Node.js LTS oficialmente.
4. Abrir novo terminal.
5. Validar:

```powershell
node --version
npm --version
corepack --version
```

6. Como o projeto tem `package-lock.json`, usar inicialmente npm para nao mudar o lockfile agora:

```powershell
npm ci
npm run lint
npm test
npm run build
```

7. Depois, decidir se o projeto ficara em npm ou Yarn. Hoje ha conflito: `package.json` declara Yarn 4, mas o repositorio tem `package-lock.json`.

### Decisao recomendada para producao

**Curto prazo:** manter npm, porque ja existe `package-lock.json`.  
**Depois:** remover a declaracao `packageManager` de Yarn ou migrar formalmente para Yarn com `yarn.lock`, mas nao misturar os dois.

## 4. Plano por fases

## Fase 0 - Preparacao e seguranca de mudanca

**Objetivo:** garantir que nenhuma correcao quebre producao.

1. Criar branch separada para as melhorias.
2. Fazer backup do banco Supabase.
3. Confirmar variaveis de ambiente de producao e homologacao.
4. Criar ambiente de homologacao ou usar um projeto Supabase separado para testes.
5. Documentar rollback para cada alteracao.
6. Corrigir Node/npm local para permitir testes.

**Criterio de aceite:** ambiente local consegue rodar install, lint, test e build.

## Fase 1 - Higiene sem alterar regra de negocio

**Objetivo:** reduzir risco sem mudar fluxos principais.

1. Corrigir README com stack real e instrucoes atuais.
2. Criar `.env.example` sem valores reais.
3. Remover arquivos residuais se confirmados como inutilizados: `$file`, `schema_snapshot.ts` vazio.
4. Mover laudos antigos para `docs/` ou manter organizados.
5. Padronizar gerenciador de pacotes.

**Risco:** baixo.  
**Deploy:** pode ser feito com seguranca apos build passar.

## Fase 2 - Rotas temporarias e diagnosticas

**Objetivo:** impedir exposicao acidental de rotas internas.

Rotas a auditar:

- `src/app/api/admin/debug-buckets/route.js`
- `src/app/api/admin/debug-michele/route.js`
- `src/app/api/investigate-gabrielly/route.js`
- `src/app/api/investigate-juris/route.js`
- `src/app/api/fix-gabrielly/route.js`
- `src/app/api/test-email-caso/route.js`
- `src/app/api/crm/assinatura/init-db/route.js`

Acao segura:

1. Verificar se ainda sao usadas.
2. Se nao forem usadas, remover.
3. Se forem necessarias, proteger por ADMIN + segredo + ambiente.
4. Bloquear em producao qualquer rota que seja apenas diagnostica.

**Risco:** medio, porque pode haver rotina manual usando alguma rota.  
**Deploy:** somente depois de confirmar com quem opera o sistema.

## Fase 3 - Login legado sem quebrar usuarios antigos

**Objetivo:** manter migracao, mas com controle.

1. Criar campos de controle no banco:
   - `legacy_migration_pending`
   - `legacy_migrated_at`
   - `password_reset_required`
   - `last_legacy_login_attempt_at`
2. Alterar o fluxo atual para aceitar senha padrao apenas se a conta estiver marcada como legada.
3. Forcar troca de senha logo apos login.
4. Registrar auditoria da migracao.
5. Aplicar rate limit especifico para tentativa com senha padrao.
6. Criar tela/fluxo administrativo para disparar reset seguro quando o usuario antigo nao conseguir acessar.
7. Depois da estabilizacao, trocar a senha padrao por token temporario de redefinicao.

**Risco:** medio/alto.  
**Deploy:** fazer em etapas, com feature flag e monitoramento.

## Fase 4 - Segredos e mobile

**Objetivo:** eliminar risco de credenciais expostas.

1. Revisar `mobile/google-services.json`, `mobile/tmp_client.json`, `mobile/eas.json` e arquivos equivalentes.
2. Confirmar se algum segredo real foi versionado.
3. Revogar credenciais expostas.
4. Garantir `.gitignore` correto.
5. Avaliar limpeza de historico Git apenas com planejamento, pois exige `force push`.

**Risco:** medio.  
**Deploy:** nao afeta diretamente runtime web, mas afeta operacao da equipe.

## Fase 5 - Logs, LGPD e dados sensiveis

**Objetivo:** reduzir vazamento por logs.

1. Mapear logs com emails, IDs, payloads de pagamento, dados juridicos e metadados.
2. Criar logger central com mascaramento.
3. Trocar `console.log` sensiveis por logs estruturados.
4. Manter logs tecnicos uteis sem expor dados pessoais.
5. Definir retencao de logs.

**Risco:** baixo/medio.  
**Deploy:** gradual.

## Fase 6 - Rate limit e protecao de APIs

**Objetivo:** trocar rate limit em memoria por solucao propria para producao.

1. Escolher solucao: Upstash Redis, Vercel KV, Redis gerenciado ou Supabase com cuidado.
2. Aplicar primeiro em login, IA, checkout, upload e rotas admin.
3. Adicionar respostas 429 padronizadas.
4. Monitorar falsos positivos.

**Risco:** medio.  
**Deploy:** gradual por grupo de rota.

## Fase 7 - Testes e CI/CD

**Objetivo:** evitar regressao em producao.

1. Garantir que `npm ci`, `npm run lint`, `npm test` e `npm run build` funcionem localmente.
2. Criar pipeline GitHub Actions.
3. Adicionar testes de autorizacao:
   - CLIENT nao acessa admin.
   - LAWYER nao acessa dados de outro advogado.
   - ANUNCIANTE acessa apenas suas rotas.
   - ESCRITORIO acessa apenas sua equipe/dados.
   - ADMIN acessa rotas administrativas.
4. Adicionar testes para webhooks e checkout.

**Risco:** baixo para producao, alto valor preventivo.

## 5. Ordem recomendada de execucao

1. Corrigir ambiente Node/npm.
2. Rodar build/lint/test no estado atual.
3. Criar branch de melhorias.
4. Corrigir documentacao e gerenciador de pacotes.
5. Auditar/remover rotas temporarias.
6. Fortalecer login legado com flags e auditoria.
7. Sanear segredos mobile.
8. Reduzir logs sensiveis.
9. Implantar rate limit distribuido.
10. Criar CI/CD.

## 6. O que nao fazer

1. Nao remover o login legado sem alternativa para usuarios antigos.
2. Nao apagar rotas diagnosticas sem confirmar se alguem usa operacionalmente.
3. Nao reescrever historico Git sem coordenar com a equipe.
4. Nao trocar npm por Yarn ou Yarn por npm no mesmo commit de correcoes criticas.
5. Nao mexer em RLS, auth e pagamentos sem homologacao.
6. Nao fazer deploy de varias mudancas criticas juntas.

## 7. Resultado esperado

Ao concluir as fases principais, o projeto deve subir de aproximadamente **6/10** para **8/10 ou 8,5/10**, mantendo a plataforma em producao com menor risco de regressao.

Para chegar perto de **9/10**, sera necessario acrescentar observabilidade madura, CI/CD completo, testes de autorizacao fortes, governanca LGPD formal e revisao periodica de seguranca.
