# Statement of Applicability (SoA)

**Versao:** 2026-06-16 (revisao expandida)
**Norma-alvo:** ISO/IEC 27001:2022
**Proprietario:** Carlos Henrique — CEO e responsavel pela seguranca da informacao
**Observacao:** Esta SoA e um documento de readiness interno. A SoA final deve ser validada por auditor certificado antes da certificacao por terceira parte.

---

## 1. Criterio de decisao

Um controle e marcado como **Aplicavel** quando:
- Reduz risco relevante mapeado no `RISK_REGISTER.md`;
- Atende requisito legal (LGPD), contratual ou regulatorio;
- Apoia continuidade e disponibilidade do SaaS;
- Protege dados pessoais ou juridicos processados pela plataforma.

Um controle e marcado como **Nao aplicavel** quando:
- A ameaca correspondente nao existe no escopo do SGSI (ex: controles fisicos de datacenter proprio);
- A organizacao transfere integralmente o risco para fornecedor certificado.

---
## 2. Resumo por dominio

| Dominio ISO 27001:2022 | Controles | Aplicavel | Nao aplicavel |
|---|---:|---:|---:|
| A.5 Controles organizacionais | 37 | 32 | 5 |
| A.6 Controles de pessoas | 8 | 7 | 1 |
| A.7 Controles fisicos | 14 | 13 | 1 |
| A.8 Controles tecnologicos | 34 | 28 | 6 |
| **Total** | **93** | **80** | **13** |

---

## 3. Tabela completa de controles

### Dominio A.5 — Controles organizacionais

| Controle | Aplicavel | Justificativa | Status | Evidencia | Responsavel | Risco relacionado |
|---|---|---|---|---|---|---|
| A.5.1 Politicas para seguranca da informacao | Sim | Necessaria para governanca e base legal do SGSI | Implementado | `INFORMATION_SECURITY_POLICY.md` | Carlos Henrique | R-003, R-007 |
| A.5.2 Funcoes e responsabilidades da SI | Sim | Equipe deve ter papeis definidos | Implementado | `ISMS_SCOPE.md`, papeis definidos | Carlos Henrique | Todos |
| A.5.3 Segregacao de funcoes | Sim parcial | Equipe enxuta; segregacao aplicada onde viavel | Parcial | Controle de acesso por perfil no dashboard | Carlos Henrique | R-003 |
| A.5.4 Responsabilidades da direcao | Sim | Direcao aprovou SGSI e politicas | Implementado | `MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` | Carlos Henrique | Todos |
| A.5.5 Contato com autoridades | Sim | Necessario para resposta a incidentes e conformidade LGPD | Parcial | `INCIDENT_RESPONSE.md` — contatos previstos | Carlos Henrique | R-010 |
| A.5.6 Contato com grupos de interesse especial | Sim parcial | Relevante para atualizacoes de ameacas e vuln. | Planejado | A incluir in INCIDENT_RESPONSE.md | Carlos Henrique | R-010 |
| A.5.7 Inteligencia de ameacas | Sim | Necessario para gestao proativa de vulnerabilidades | Parcial | Monitoramento Cloudflare e Supabase | Carlos Henrique | R-002, R-003 |
| A.5.8 SI no gerenciamento de projetos | Sim | Novos modulos devem passar por analise de seguranca | Parcial | Pratica atual; politica formal a documentar | Carlos Henrique | R-004, R-006 |
| A.5.9 Inventario de ativos de informacao | Sim | Ativos criticos mapeados | Implementado | Referenciado na SoA e no escopo do SGSI | Carlos Henrique | R-005 |
| A.5.10 Uso aceitavel de ativos | Sim | Necessario para governanca de uso de dados e IA | Parcial | `INFORMATION_SECURITY_POLICY.md` | Carlos Henrique | R-006 |
| A.5.11 Devolucao de ativos | Sim parcial | Aplicavel a colaboradores e fornecedores | Parcial | Processo informal; a formalizar | Carlos Henrique | R-007 |
| A.5.12 Classificacao da informacao | Sim | Dados juridicos e pessoais requerem classificacao | Parcial | Classificacao informal por contexto de API | Carlos Henrique | R-001, R-004 |
| A.5.13 Rotulagem da informacao | Sim parcial | Aplicavel internamente para documentos SGSI | Parcial | Documentos de compliance versionados | Carlos Henrique | R-001 |
| A.5.14 Transferencia de informacao | Sim | Dados transferidos para Supabase, OpenAI, Stripe, Resend | Implementado | `SUPPLIER_SECURITY_POLICY.md` | Carlos Henrique | R-005, R-006 |
| A.5.15 Controle de acesso | Sim | Acesso por perfil em toda a plataforma | Implementado | `ACCESS_CONTROL_POLICY.md`, `middleware.js` | Carlos Henrique | R-003 |
| A.5.16 Gerenciamento de identidade | Sim | Supabase Auth gerencia identidades | Implementado | Supabase Auth, confirmacao por e-mail | Carlos Henrique | R-003 |
| A.5.17 Informacoes de autenticacao | Sim | Senhas e tokens protegidos | Implementado | Supabase Auth, hashing de senhas | Carlos Henrique | R-003, R-007 |
| A.5.18 Direitos de acesso | Sim | Revisao periodica de acessos necessaria | Parcial | `ACCESS_CONTROL_POLICY.md`; revisao a agendar | Carlos Henrique | R-003 |
| A.5.19 SI nas relacoes com fornecedores | Sim | Fornecedores criticos identificados | Implementado | `SUPPLIER_SECURITY_POLICY.md` | Carlos Henrique | R-005 |
| A.5.20 Requisitos de SI em contratos com fornecedores | Sim | Contratos de servico com Supabase, Stripe, etc. | Parcial | Termos de servico aceitos; contratos formais a revisar | Carlos Henrique | R-005 |
| A.5.21 Gerenciamento de SI na cadeia de suprimentos de TIC | Sim parcial | Cadeia inclui Supabase, OpenAI, Vercel/infra | Parcial | Politica de fornecedores em vigor | Carlos Henrique | R-005 |
| A.5.22 Monitoramento, revisao e mudanca de servicos de fornecedores | Sim | SLAs e disponibilidade de fornecedores monitorados | Parcial | Monitoramento via dashboards de fornecedores | Carlos Henrique | R-005 |
| A.5.23 SI para uso de servicos em nuvem | Sim | Toda a infra e em nuvem | Implementado | Supabase (PostgreSQL), Cloudflare, Resend | Carlos Henrique | R-005 |
| A.5.24 Planejamento e preparacao para gestao de incidentes de SI | Sim | Necessario para resposta coordenada | Parcial | `INCIDENT_RESPONSE.md` | Carlos Henrique | R-010 |
| A.5.25 Avaliacao e decisao sobre eventos de SI | Sim | Classificacao de eventos e alertas | Parcial | Trilha `security_audit_events` no Supabase | Carlos Henrique | R-010 |
| A.5.26 Resposta a incidentes de SI | Sim | Processo de resposta documentado | Parcial | `INCIDENT_RESPONSE.md` | Carlos Henrique | R-010 |
| A.5.27 Aprendizado com incidentes de SI | Sim | Licoes aprendidas integram o SGSI | Planejado | `CORRECTIVE_ACTION_REGISTER.md` | Carlos Henrique | R-010 |
| A.5.28 Coleta de evidencias | Sim | Trilha de auditoria e logs de eventos | Implementado | `security_audit_events`, `SECURITY_AUDIT_MIGRATION_EVIDENCE.md` | Carlos Henrique | R-003, R-010 |
| A.5.29 SI durante disrupcao | Sim | Continuidade durante incidentes | Parcial | `BACKUP_AND_RECOVERY_POLICY.md` | Carlos Henrique | R-005, R-008 |
| A.5.30 Prontidao de TIC para continuidade dos negocios | Sim | Recuperacao de servico critico | Parcial | Backup Supabase; teste de restauracao planejado | Carlos Henrique | R-008 |
| A.5.31 Requisitos legais, estatutarios, regulatorios e contratuais | Sim | LGPD, Marco Civil, contratos com clientes | Implementado | Politica de privacidade; fluxo de confirmacao de conta | Carlos Henrique | R-004 |
| A.5.32 Direitos de propriedade intelectual | Sim parcial | Uso de bibliotecas open source sob licencas adequadas | Parcial | Package.json com dependencias licenciadas | Carlos Henrique | — |
| A.5.33 Protecao de registros | Sim | Registros de auditoria devem ser protegidos contra alteracao | Implementado | Triggers de imutabilidade em `security_audit_events` | Carlos Henrique | R-003, R-004 |
| A.5.34 Privacidade e protecao de dados pessoais | Sim | LGPD e dados de clientes/advogados | Implementado | Politica de privacidade; hashing de PII in logs | Carlos Henrique | R-004, R-006 |
| A.5.35 Revisao independente de SI | Sim | Auditoria interna e externa necessarias | Parcial | `INTERNAL_AUDIT_REPORT_2026_Q2.md`; auditoria externa planejada | Carlos Henrique | Todos |
| A.5.36 Conformidade com politicas e normas de SI | Sim | Verificacao periodica de conformidade | Parcial | Auditoria interna Q2 realizada | Carlos Henrique | Todos |
| A.5.37 Procedimentos de operacao documentados | Sim | POPs para operacoes criticas | Parcial | `ISMS_OPERATING_PROCEDURE.md` | Carlos Henrique | R-009 |

---

### Dominio A.6 — Controles de pessoas

| Controle | Aplicavel | Justificativa | Status | Evidencia | Responsavel | Risco relacionado |
|---|---|---|---|---|---|---|
| A.6.1 Selecao | Sim | Verificacao de colaboradores e prestadores | Parcial | Processo informal; a formalizar para novos contratados | Carlos Henrique | R-003 |
| A.6.2 Termos e condicoes de emprego | Sim | Obrigacoes de SI devem constar em contratos | Parcial | Clausulas gerais; revisao para incluir SI especificamente | Carlos Henrique | R-003, R-007 |
| A.6.3 Conscientizacao, educacao e treinamento em SI | Sim | Equipe deve conhecer politicas e ameacas | Parcial | Treinamento informal; registro formal planejado | Carlos Henrique | Todos |
| A.6.4 Processo disciplinar | Sim | Violacoes de SI devem ter consequencias definidas | Planejado | A incluir na politica de RH | Carlos Henrique | R-003, R-007 |
| A.6.5 Responsabilidades apos encerramento ou mudanca de emprego | Sim | Offboarding deve revogar acessos | Parcial | Processo informal; a documentar | Carlos Henrique | R-003 |
| A.6.6 Acordos de confidencialidade e nao divulgacao | Sim | Dados de clientes e casos juridicos exigem confidencialidade | Parcial | Contratos gerais; NDAs formais a revisar | Carlos Henrique | R-004 |
| A.6.7 Trabalho remoto | Sim | Equipe opera em ambiente remoto | Implementado | Politica de acesso remoto via Supabase Auth e HTTPS | Carlos Henrique | R-003, R-007 |
| A.6.8 Relato de eventos de SI | Sim | Qualquer membro deve poder reportar evento de SI | Planejado | Canal de relato a definir in INCIDENT_RESPONSE.md | Carlos Henrique | R-010 |

---

### Dominio A.7 — Controles fisicos

| Controle | Aplicavel | Justificativa | Status | Evidencia | Responsavel | Risco relacionado |
|---|---|---|---|---|---|---|
| A.7.1 Perimetros de seguranca fisica | Sim (Herdado) | Segurança perimetral física delegada aos data centers dos fornecedores Supabase (AWS) e Napoleon. | Implementado | Certificações SOC 2 e ISO 27001 da AWS e do data center Napoleon | Provedores de nuvem | R-009 |
| A.7.2 Entrada fisica | Sim (Herdado) | Controle e catracas de acesso de segurança geridos pelas equipes físicas dos data centers terceirizados. | Implementado | Relatórios SOC 2 da AWS e provedores de nuvem | Provedores de nuvem | R-009 |
| A.7.3 Seguranca de escritorios, salas e instalacoes | Sim (Compartilhado) | Proteção dos racks e servidores sob responsabilidade do data center; dispositivos e home office geridos sob a política interna. | Parcial | `INFORMATION_SECURITY_POLICY.md` e bloqueios físicos locais | Carlos Henrique | R-007 |
| A.7.4 Monitoramento de seguranca fisica | Sim (Herdado) | Sistemas de CFTV e detecção gerenciados pelos data centers parceiros em suas instalações. | Implementado | Auditorias SOC 2 da AWS/Napoleon | Provedores de nuvem | R-009 |
| A.7.5 Protecao contra ameacas fisicas e ambientais | Sim (Herdado) | Climatização, redundância elétrica e prevenção de incêndios operados pelos data centers. | Implementado | SLA dos provedores de infraestrutura | Provedores de nuvem | R-009 |
| A.7.6 Trabalhando em areas seguras | Nao aplicavel | A SocialJurídico opera em modelo distribuído sem escritórios físicos locais ou salas seguras próprias. | — | — | — | — |
| A.7.7 Mesa limpa e tela limpa | Sim (Direto) | Notebooks da equipe remota devem ser travados automaticamente e mantidos sem papéis com PII expostos. | Parcial | Política de mesa limpa em `INFORMATION_SECURITY_POLICY.md` | Carlos Henrique | R-007 |
| A.7.8 Localizacao e protecao de equipamentos | Sim (Compartilhado) | Hardware hospedado em racks seguros no data center; notebooks dos colaboradores protegidos por chaves e trancas. | Parcial | Bloqueios de tela locais ativos | Carlos Henrique | R-007 |
| A.7.9 Seguranca de ativos fora das instalacoes | Sim (Direto) | Ativos utilizados em trânsito e home office seguem diretrizes de criptografia de disco e conexões HTTPS. | Parcial | HTTPS para conexões de rede | Carlos Henrique | R-007 |
| A.7.10 Midia de armazenamento | Sim (Compartilhado) | Descarte físico seguro efetuado pelo provedor; controle lógico e encriptação de disco/backups realizados pela empresa. | Implementado | Backups criptografados no Supabase | Carlos Henrique | R-007 |
| A.7.11 Utilitarios de suporte | Sim (Herdado) | Geradores, no-breaks e suporte de energia mantidos e auditados na infraestrutura dos parceiros de nuvem. | Implementado | SLAs e auditoria física do fornecedor | Provedores de nuvem | R-009 |
| A.7.12 Seguranca do cabeamento | Sim (Herdado) | Cabos de telecomunicações e energia protegidos fisicamente em canaletas sob gestão dos data centers. | Implementado | Relatórios SOC 2 da AWS | Provedores de nuvem | R-009 |
| A.7.13 Manutencao de equipamentos | Sim (Herdado) | Manutenção preventiva e corretiva de geradores e servidores delegada contratualmente à AWS e Napoleon. | Implementado | SLA de fornecedores de infraestrutura | Provedores de nuvem | R-009 |
| A.7.14 Descarte ou reutilizacao segura de equipamentos | Sim (Compartilhado) | Provedores destroem mídias físicas antigas; equipe local responsável por sanitização lógica/criptográfica dos notebooks locais. | Planejado | Procedimento de descarte a formalizar | Carlos Henrique | R-007 |lanejado | Procedimento de descarte a formalizar | Carlos Henrique | R-007 |

---

### Dominio A.8 — Controles tecnologicos

| Controle | Aplicavel | Justificativa | Status | Evidencia | Responsavel | Risco relacionado |
|---|---|---|---|---|---|---|
| A.8.1 Dispositivos de usuario final | Sim | Desenvolvimento e acesso em dispositivos pessoais | Parcial | Politica de senha e tela bloqueada | Carlos Henrique | R-007 |
| A.8.2 Direitos de acesso privilegiado | Sim | Acesso de administrador ao Supabase, Cloudflare, Stripe | Implementado | Acesso restrito ao CEO; MFA habilitado onde disponivel | Carlos Henrique | R-003 |
| A.8.3 Restricao de acesso a informacoes | Sim | Controle de acesso por perfil em toda a plataforma | Implementado | `middleware.js`, Supabase RLS | Carlos Henrique | R-003 |
| A.8.4 Acesso ao codigo-fonte | Sim | Repositorio privado com controle de acesso | Implementado | Repositorio privado; acesso por chave SSH / credencial | Carlos Henrique | R-007, R-009 |
| A.8.5 Autenticacao segura | Sim | MFA e tokens de sessao | Implementado | Supabase Auth com JWT; confirmacao por e-mail | Carlos Henrique | R-003 |
| A.8.6 Gerenciamento de capacidade | Sim parcial | Escalonamento automatico do Supabase e Cloudflare | Implementado | SLAs e planos de capacidade dos fornecedores | Carlos Henrique | R-005 |
| A.8.7 Protecao contra malware | Sim | Endpoints e repositorio protegidos | Parcial | Dispositivos com antivirus; dependencias verificadas via npm audit | Carlos Henrique | R-003 |
| A.8.8 Gerenciamento de vulnerabilidades tecnicas | Sim | Dependencias e configuracoes revisadas | Parcial | `npm audit`; Cloudflare WAF ativo | Carlos Henrique | R-002, R-003 |
| A.8.9 Gerenciamento de configuracao | Sim | Configuracoes de ambiente e segredos gerenciados | Parcial | `.env` controlado; revisao periodica planejada | Carlos Henrique | R-007, R-009 |
| A.8.10 Exclusao de informacoes | Sim | LGPD exige direito ao esquecimento | Implementado | Fluxo de exclusao de conta com registro de auditoria | Carlos Henrique | R-004 |
| A.8.11 Mascaramento de dados | Sim | PII em logs deve ser mascarada | Implementado | Hashing de emails e IPs em `security_audit_events` | Carlos Henrique | R-004 |
| A.8.12 Prevencao de vazamento de dados | Sim | APIs nao devem expor dados sensiveis | Implementado | DTOs por perfil; revisao de payload | Carlos Henrique | R-001, R-004 |
| A.8.13 Backup de informacoes | Sim | Dados criticos devem ter backup | Implementado | Backup automatico Supabase; politica documentada | Carlos Henrique | R-008 |
| A.8.14 Redundancia de instalacoes de processamento | Sim parcial | Alta disponibilidade via fornecedores | Implementado | Cloudflare HA; Supabase multi-AZ | Carlos Henrique | R-005 |
| A.8.15 Registro de eventos (logging) | Sim | Trilha de auditoria de eventos de seguranca | Implementado | `security_audit_events` com imutabilidade | Carlos Henrique | R-003, R-004 |
| A.8.16 Atividades de monitoramento | Sim | Monitoramento de acessos e anomalias | Parcial | Logs de acesso; alertas Cloudflare | Carlos Henrique | R-003 |
| A.8.17 Sincronizacao de relogio | Sim | Timestamps corretos em logs de auditoria | Implementado | Supabase usa UTC; `created_at` com timezone | Carlos Henrique | R-003 |
| A.8.18 Uso de programas utilitarios privilegiados | Sim parcial | Acesso privilegiado ao Supabase SQL Editor | Implementado | Restrito ao administrador | Carlos Henrique | R-003 |
| A.8.19 Instalacao de software em sistemas operacionais | Sim parcial | Controle de dependencias do projeto | Implementado | `package.json` versionado; `npm audit` | Carlos Henrique | R-007 |
| A.8.20 Seguranca de redes | Sim | Cloudflare protege camada de rede | Implementado | Cloudflare WAF, DDoS protection, TLS 1.2+ | Carlos Henrique | R-002 |
| A.8.21 Seguranca de servicos de rede | Sim | APIs expostas protegidas por autenticacao | Implementado | JWT, middleware de autenticacao, rate limiting Cloudflare | Carlos Henrique | R-001, R-003 |
| A.8.22 Segregacao de redes | Sim parcial | Ambientes de dev e prod separados | Parcial | Variaveis de ambiente distintas; staging planejado | Carlos Henrique | R-009 |
| A.8.23 Filtragem web | Nao aplicavel | Sem navegacao corporativa centralizada | — | — | — | — |
| A.8.24 Uso de criptografia | Sim | HTTPS em todas as comunicacoes | Implementado | TLS 1.2+ via Cloudflare; dados em repouso criptografados pelo Supabase | Carlos Henrique | R-002, R-007 |
| A.8.25 Ciclo de vida de desenvolvimento seguro | Sim | Seguranca integrada ao processo de desenvolvimento | Parcial | Code review; `npm audit`; politica de segredos | Carlos Henrique | R-001, R-004, R-009 |
| A.8.26 Requisitos de seguranca da aplicacao | Sim | APIs e endpoints devem ser seguros por design | Implementado | Validacao de entrada; autenticacao obrigatoria | Carlos Henrique | R-001, R-003 |
| A.8.27 Principios de engenharia de sistemas seguros | Sim | Seguranca por design no desenvolvimento | Parcial | Pratica atual; guia formal a documentar | Carlos Henrique | R-001 |
| A.8.28 Codificacao segura | Sim | Boas praticas de codificacao para prevenir vulnerabilidades | Parcial | Revisao de codigo; sanitizacao de inputs | Carlos Henrique | R-001, R-003 |
| A.8.29 Testes de seguranca no desenvolvimento e aceitacao | Sim | Testes de seguranca antes de releases | Parcial | Testes manuais; automatizacao planejada | Carlos Henrique | R-001, R-009 |
| A.8.30 Desenvolvimento terceirizado | Nao aplicavel | Desenvolvimento realizado internamente | — | — | — | — |
| A.8.31 Separacao de ambientes de dev, teste e producao | Sim | Evitar impacto de desenvolvimento em producao | Parcial | Variaveis separadas; ambiente de staging planejado | Carlos Henrique | R-009 |
| A.8.32 Gerenciamento de mudancas | Sim | Mudancas devem ser rastreadas e controladas | Implementado | `CHANGE_MANAGEMENT.md`; historico de commits | Carlos Henrique | R-009 |
| A.8.33 Informacoes de teste | Nao aplicavel | Dados de producao nao usados em testes | — | Dados sinteticos utilizados em testes | — | — |
| A.8.34 Protecao de sistemas de informacao durante testes de auditoria | Sim | Testes de auditoria nao devem impactar producao | Parcial | Coleta de evidencias via queries somente leitura | Carlos Henrique | R-010 |

---

## 4. Aceite formal

Eu, **Carlos Henrique**, CEO e responsavel pela seguranca da informacao do SocialJuridico, aprovo esta Declaracao de Aplicabilidade como documento operacional do SGSI, reconhecendo que os controles marcados como nao aplicaveis estao justificados pela natureza da operacao em nuvem da organizacao.

**Aprovado por:** Carlos Henrique (CEO / Security Owner)  
**Data:** 2026-06-16  
**Assinatura:** [Assinado digitalmente por Carlos Henrique — CEO e Responsável pelo SGSI]  
**Revisado por:** Saulo Pavanello (Software Engineer / Auditor)  
**Assinatura de revisão:** [Assinado digitalmente por Saulo Pavanello — Auditor]  
**Proxima revisao:** 2026-12-16 (semestral) ou apos mudanca relevante de escopo


---

## 5. Pendencias para SoA de certificacao

- Validacao por auditor certificado (terceira parte)
- Confirmacao de controles fisicos do ambiente administrativo
- Formalizacao de NDAs e contratos de fornecedores
- Evidencias de treinamento e conscientizacao registradas
- Associacao formal entre todos os riscos residuais aceitos e controles
