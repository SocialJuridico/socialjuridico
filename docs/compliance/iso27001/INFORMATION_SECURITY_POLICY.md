# Information Security Policy

**Versao:** 2026-06-16  
**Dono:** Administracao do Social Juridico  
**Revisao:** anual ou apos mudanca relevante

## 1. Proposito

Proteger as informacoes processadas pelo Social Juridico contra acesso nao autorizado, alteracao indevida, perda, indisponibilidade, uso inadequado e exposicao de dados pessoais ou juridicos.

## 2. Principios

- Confidencialidade: dados devem ser acessados apenas por pessoas, sistemas e fornecedores autorizados.
- Integridade: informacoes devem permanecer corretas, completas e rastreaveis.
- Disponibilidade: sistemas essenciais devem estar disponiveis conforme necessidades operacionais.
- Minimizacao: coletar, expor e registrar apenas dados necessarios.
- Responsabilidade: acessos e mudancas devem ser atribuidos a responsaveis identificaveis.
- Melhoria continua: riscos e controles devem ser revisados periodicamente.

## 3. Diretrizes

### 3.1 Controle de acesso

- Acesso administrativo deve ser limitado a pessoas autorizadas.
- Perfis devem seguir necessidade de uso e menor privilegio.
- Credenciais devem ser individuais sempre que possivel.
- Acessos devem ser removidos quando deixarem de ser necessarios.

### 3.2 Desenvolvimento seguro

- Mudancas relevantes devem seguir processo de gestao de mudancas.
- Rotas publicas devem evitar exposicao de metadados internos.
- APIs privadas devem validar autenticacao e autorizacao no servidor.
- Segredos nao devem ser registrados em codigo-fonte.

### 3.3 Dados pessoais e juridicos

- Dados sensiveis devem ser tratados com finalidade clara.
- Logs devem evitar dados juridicos, documentos, tokens e segredos.
- Ferramentas de IA devem receber apenas os dados necessarios ao caso de uso.
- Solicitudes de exclusao ou privacidade devem seguir processo documentado.

### 3.4 Fornecedores

- Fornecedores criticos devem ser inventariados.
- Riscos de terceiros devem ser revistos periodicamente.
- Integracoes devem usar chaves e tokens com escopo minimo.

### 3.5 Incidentes

- Suspeitas de incidente devem ser registradas.
- Incidentes devem seguir plano de resposta.
- Evidencias relevantes devem ser preservadas.

## 4. Responsabilidades

- Administracao: aprovar politica, priorizar tratamento de riscos e manter evidencias.
- Desenvolvimento: implementar controles tecnicos e registrar mudancas.
- Operacao: monitorar disponibilidade, incidentes, fornecedores e backups.
- Usuarios internos: proteger credenciais e reportar eventos suspeitos.

## 5. Nao conformidade

Violacoes a esta politica devem ser registradas, analisadas e tratadas com acao corretiva proporcional ao risco.
