# Information Security Risk Register

**Versao:** 2026-06-16 (revisao expandida)
**Norma-alvo:** ISO/IEC 27001:2022
**Metodologia:** RISK_ASSESSMENT_METHOD.md
**Proprietario do registro:** Carlos Henrique — CEO e responsavel pela seguranca da informacao

---

## Escala de avaliacao

| Nivel | Probabilidade | Impacto |
|---|---|---|
| 1 | Muito baixa | Insignificante |
| 2 | Baixa | Menor |
| 3 | Media | Moderado |
| 4 | Alta | Grave |
| 5 | Muito alta | Critico |

**Nivel de risco inerente** = Probabilidade x Impacto

| Faixa | Classificacao |
|---|---|
| 1–4 | Baixo |
| 5–9 | Medio |
| 10–16 | Alto |
| 17–25 | Critico |

---

## Registro de riscos

### R-001 — Exposicao excessiva em API publica

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Endpoint `/api/advogados` — dados de perfil de advogados |
| Ameaca | Reconhecimento e exfiltracao de dados por agente externo |
| Vulnerabilidade | Resposta de API pode incluir campos nao destinados ao publico |
| Probabilidade | 3 |
| Impacto | 3 |
| Nivel de risco inerente | 9 — Medio |
| Tratamento escolhido | Mitigar |
| Controle relacionado | DTO publico em `src/app/api/advogados/route.js`; revisao de payload |
| Proprietario | Carlos Henrique |
| Prazo | Revisao continua a cada release |
| Risco residual | 4 — Baixo |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16 |

---

### R-002 — Scanner identifica cifras TLS fracas

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Cloudflare / camada de TLS da plataforma |
| Ameaca | Interceptacao de trafico por ataque man-in-the-middle com cifras fracas |
| Vulnerabilidade | Configuracao de TLS minimo e selecionada pelo plano Cloudflare; ajuste fino limitado |
| Probabilidade | 3 |
| Impacto | 2 |
| Nivel de risco inerente | 6 — Medio |
| Tratamento escolhido | Aceitar e mitigar parcialmente |
| Controle relacionado | TLS minimo ajustado para 1.2; monitoramento Cloudflare ativo |
| Proprietario | Carlos Henrique |
| Prazo | Reavaliar ao renovar plano Cloudflare |
| Risco residual | 4 — Baixo |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16; mitigacao total depende de upgrade do plano |

---

### R-003 — Acesso indevido a areas privadas

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Middleware de autenticacao / rotas protegidas do dashboard |
| Ameaca | Acesso nao autorizado a dados de clientes, advogados ou painel administrativo |
| Vulnerabilidade | Falha ou bypass no controle de sessao ou validacao de perfil |
| Probabilidade | 3 |
| Impacto | 5 |
| Nivel de risco inerente | 15 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | `middleware.js`, validacoes por perfil (ADMIN/LAWYER/CLIENT), Supabase Auth |
| Proprietario | Carlos Henrique |
| Prazo | Revisao a cada sprint; auditoria semestral |
| Risco residual | 6 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16; monitoramento continuo |

---

### R-004 — Exposicao de dados sensiveis em logs

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | APIs, webhooks e funcoes de log do servidor |
| Ameaca | Exfiltracao de dados pessoais ou credenciais via logs de aplicacao |
| Vulnerabilidade | Logs podem conter payload bruto sem sanitizacao adequada |
| Probabilidade | 3 |
| Impacto | 4 |
| Nivel de risco inerente | 12 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | Revisao de logs; politica de minimizacao; uso de hashes em `security_audit_events` |
| Proprietario | Carlos Henrique |
| Prazo | 2026-08-31 |
| Risco residual | 8 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16; revisao completa prevista para 2026-Q3 |

---

### R-005 — Falha de fornecedor critico

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Supabase (banco e autenticacao), Cloudflare (CDN/DNS), Stripe (pagamentos), Resend (e-mail) |
| Ameaca | Indisponibilidade do servico por falha, interrupcao ou encerramento do fornecedor |
| Vulnerabilidade | Dependencia critica de provedores externos sem failover local |
| Probabilidade | 2 |
| Impacto | 4 |
| Nivel de risco inerente | 8 — Medio |
| Tratamento escolhido | Transferir e mitigar |
| Controle relacionado | `SUPPLIER_SECURITY_POLICY.md`; inventario de fornecedores; SLAs contratuais |
| Proprietario | Carlos Henrique |
| Prazo | Plano de continuidade: 2026-09-30 |
| Risco residual | 6 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16; contrato com SLA monitorado |

---

### R-006 — Uso excessivo de dados em IA

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Rotas de IA / integracao OpenAI |
| Ameaca | Transmissao de dados pessoais ou juridicos sensíveis para provedor de IA sem controle adequado |
| Vulnerabilidade | Minimizacao de dados dependente de implementacao por desenvolvedor; politica ainda informal |
| Probabilidade | 3 |
| Impacto | 4 |
| Nivel de risco inerente | 12 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | Minimizacao por fluxo; politica de uso de IA a formalizar |
| Proprietario | Carlos Henrique |
| Prazo | Politica formal: 2026-08-31 |
| Risco residual | 8 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16 |

---

### R-007 — Credenciais ou tokens expostos

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Variaveis de ambiente, repositorio de codigo, arquivos `.env` |
| Ameaca | Comprometimento de credenciais por exposicao em repositorio ou log |
| Vulnerabilidade | Segredos gerenciados manualmente; risco de commit acidental |
| Probabilidade | 2 |
| Impacto | 5 |
| Nivel de risco inerente | 10 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | `.gitignore` para `.env`; politica de segredos; revisao periodica de variaveis |
| Proprietario | Carlos Henrique |
| Prazo | Revisao semestral; migracao para secret manager avaliada |
| Risco residual | 6 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16 |

---

### R-008 — Falha em backup e restauracao

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Banco de dados Supabase; arquivos criticos da plataforma |
| Ameaca | Perda de dados por corrupcao, exclusao acidental ou ataque |
| Vulnerabilidade | Teste de restauracao ainda nao executado formalmente |
| Probabilidade | 2 |
| Impacto | 5 |
| Nivel de risco inerente | 10 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | `BACKUP_AND_RECOVERY_POLICY.md`; backup automatico Supabase; teste formal pendente |
| Proprietario | Carlos Henrique |
| Prazo | Primeiro teste de restauracao: 2026-07-31 |
| Risco residual | 6 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16; teste de restauracao agendado |

---

### R-009 — Mudanca emergencial sem rastreabilidade

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Pipeline de deploy / processo de release |
| Ameaca | Introducao de vulnerabilidade ou regressao por mudanca nao rastreada |
| Vulnerabilidade | Processo de mudanca informal em situacoes de emergencia |
| Probabilidade | 3 |
| Impacto | 3 |
| Nivel de risco inerente | 9 — Medio |
| Tratamento escolhido | Mitigar |
| Controle relacionado | `CHANGE_MANAGEMENT.md`; historico de commits e deploys |
| Proprietario | Carlos Henrique |
| Prazo | Implementacao: 2026-07-31 |
| Risco residual | 5 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16 |

---

### R-010 — Incidente sem resposta coordenada

| Campo | Valor |
|---|---|
| Ativo / Processo afetado | Operacao geral da plataforma |
| Ameaca | Dano ampliado por demora ou falta de coordenacao em resposta a incidente |
| Vulnerabilidade | Processo de resposta documentado mas ainda nao simulado formalmente |
| Probabilidade | 2 |
| Impacto | 5 |
| Nivel de risco inerente | 10 — Alto |
| Tratamento escolhido | Mitigar |
| Controle relacionado | `INCIDENT_RESPONSE.md`; simulacao de incidente prevista |
| Proprietario | Carlos Henrique |
| Prazo | Primeira simulacao: 2026-07-31 |
| Risco residual | 5 — Medio |
| Aceite formal do risco residual | Aceito por Carlos Henrique em 2026-06-16 |

---

## Aceite formal de riscos residuais

Eu, **Carlos Henrique**, CEO e responsavel pela seguranca da informacao do SocialJuridico, aceito formalmente os niveis de risco residual documentados neste registro para todos os riscos R-001 a R-010, reconhecendo que os controles aplicados reduzem os riscos a niveis toleraveis dentro do apetite de risco da organizacao.

**Aceite registrado por:** Carlos Henrique (CEO / Security Owner)  
**Data do aceite:** 2026-06-16  
**Assinatura:** [Assinado digitalmente por Carlos Henrique — Aceite de Riscos Residuais]  
**Revisado por:** Saulo Pavanello (Software Engineer / Auditor)  
**Assinatura de revisão:** [Assinado digitalmente por Saulo Pavanello — Auditor]  
**Proxima revisao:** 2026-12-16 (semestral) ou quando ocorrer evento relevante


---

## Quando atualizar este registro

- Novo fornecedor critico adicionado
- Novo modulo com dados sensiveis em producao
- Auditoria ou scanner apontar achado relevante
- Incidente de seguranca ocorrer
- Mudanca de infraestrutura alterar o perfil de risco
- Revisao semestral agendada
