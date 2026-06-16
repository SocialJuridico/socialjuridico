# Declaração de Prontidão ISO/IEC 27001:2022

**Documento:** SJ-ISMS-DECL-001  
**Versão:** 1.0  
**Data de emissão:** 2026-06-16  
**Próxima revisão:** 2027-06-16  
**Classificação:** Interno — Uso restrito à gestão e auditores

---

> **Aviso legal importante**
>
> Este documento é uma **declaração interna de prontidão e conformidade**, elaborada pela própria organização (auditoria de primeira parte). **Não constitui certificação ISO/IEC 27001.** A certificação formal requer auditoria conduzida por organismo certificador acreditado (terceira parte), nos termos do processo de Estágio 1 (documental) e Estágio 2 (operacional).

---

## 1. Identificação da organização

| Campo | Valor |
|---|---|
| **Razão social** | Social Jurídico Tecnologia Ltda |
| **Nome comercial** | SocialJurídico |
| **Setor** | Legal Tech — Marketplace de serviços jurídicos |
| **Website** | socialjuridico.com.br |
| **País** | Brasil |
| **Representante legal** | Carlos Henrique |

---

## 2. Norma de referência

| Campo | Valor |
|---|---|
| **Norma** | ISO/IEC 27001:2022 |
| **Título** | Information security, cybersecurity and privacy protection — Information security management systems — Requirements |
| **Edição** | 2022 (terceira edição) |
| **Publicação** | 2022-10-25 |
| **Substitui** | ISO/IEC 27001:2013 |

---

## 3. Escopo do SGSI

O Sistema de Gestão de Segurança da Informação (SGSI) da SocialJurídico abrange:

> **Todos os sistemas, processos, dados e infraestrutura envolvidos na operação da plataforma SocialJurídico, incluindo o aplicativo web, APIs, banco de dados, armazenamento em nuvem e integrações com terceiros, utilizados para conectar clientes a advogados para prestação de serviços jurídicos no Brasil, hospedados em infraestrutura Supabase (PostgreSQL), VPS dedicada e serviços de nuvem de terceiros.**

**Exclusões do escopo:** Sistemas internos de recursos humanos e contabilidade não integrados à plataforma.

**Localização dos dados:** Brasil (Supabase região SA-East-1 / São Paulo) e parcialmente em servidores dos fornecedores listados na SoA.

---

## 4. Declaração de prontidão

A SocialJurídico declara ter implementado os requisitos da ISO/IEC 27001:2022, conforme descrito neste documento e evidenciado nos registros referenciados.

### 4.1 Requisitos do SGSI (Seções 4–10)

| Requisito | Seção ISO | Status | Documento de referência |
|---|---|---|---|
| Contexto da organização | 4 | ✅ Implementado | `ISMS_SCOPE.md` |
| Partes interessadas | 4.2 | ✅ Implementado | `ISMS_SCOPE.md` |
| Escopo do SGSI | 4.3 | ✅ Implementado | `ISMS_SCOPE.md` |
| Liderança e comprometimento | 5.1 | ✅ Implementado | `MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` |
| Política de segurança da informação | 5.2 | ✅ Aprovada | `INFORMATION_SECURITY_POLICY.md` |
| Papéis e responsabilidades | 5.3 | ✅ Definidos | `ISMS_OPERATING_PROCEDURE.md` |
| Ações para abordar riscos e oportunidades | 6.1 | ✅ Implementado | `RISK_REGISTER.md` |
| Avaliação de riscos de SI | 6.1.2 | ✅ Realizada | `RISK_REGISTER.md` |
| Tratamento de riscos de SI | 6.1.3 | ✅ Realizado | `RISK_REGISTER.md` |
| Declaração de Aplicabilidade | 6.1.3d | ✅ Emitida | `STATEMENT_OF_APPLICABILITY.md` |
| Objetivos de segurança | 6.2 | ✅ Definidos | `ISMS_IMPLEMENTATION_ROADMAP.md` |
| Competência e conscientização | 7.2–7.3 | ✅ Implementado | `evidence/TRAINING_LOG.md` |
| Comunicação | 7.4 | ✅ Implementado | `ISMS_OPERATING_PROCEDURE.md` |
| Informação documentada | 7.5 | ✅ Implementado | `DOCUMENT_CONTROL.md` |
| Planejamento e controle operacional | 8.1 | ✅ Implementado | `ISMS_OPERATING_PROCEDURE.md` |
| Avaliação de desempenho | 9.1 | ✅ Implementado | `evidence/MONITORING_LOG.md` |
| Auditoria interna | 9.2 | ✅ Realizada (2026 Q2) | `INTERNAL_AUDIT_REPORT_2026_Q2.md` |
| Análise crítica pela direção | 9.3 | ✅ Realizada (2026 Q2) | `MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` |
| Não conformidades e ações corretivas | 10.1 | ✅ Implementado | `CORRECTIVE_ACTION_REGISTER.md` |
| Melhoria contínua | 10.2 | ✅ Implementado | `ISMS_IMPLEMENTATION_ROADMAP.md` |

---

## 5. Controles do Anexo A implementados

A SoA completa está em `STATEMENT_OF_APPLICABILITY.md`. Abaixo o resumo por tema:

| Tema | Controles Totais | Aplicáveis | Não aplicáveis | % de Aplicáveis Implementados |
|---|---|---|---|---|
| A.5 — Controles organizacionais | 37 | 32 | 5 | 100% |
| A.6 — Controles de pessoas | 8 | 7 | 1 | 100% |
| A.7 — Controles físicos | 14 | 13 | 1 | 100% |
| A.8 — Controles tecnológicos | 34 | 28 | 6 | 100% |
| **Total** | **93** | **80** | **13** | **100%** |

Controles declarados como não aplicáveis: 13 (justificados na SoA pela natureza da infraestrutura 100% em nuvem e terceirizada). Os controles físicos (A.7) aplicáveis estão subdivididos em controle direto (mesa/tela limpa, dispositivos), compartilhado (descarte, proteção física local e redundância lógica) e herdado do provedor (perímetros, utilitários, monitoramento de data centers).

---

## 6. Gestão de riscos

O registro de riscos contém **10 riscos identificados**, cada um com os seguintes campos obrigatórios:

| Campo | Status |
|---|---|
| Ativo ou processo afetado | ✅ |
| Ameaça e vulnerabilidade | ✅ |
| Impacto (1–5) e probabilidade (1–5) | ✅ |
| Nível de risco (produto) | ✅ |
| Proprietário do risco | ✅ |
| Tratamento escolhido | ✅ |
| Controle ISO relacionado | ✅ |
| Prazo de tratamento | ✅ |
| Risco residual | ✅ |
| Aceite formal do risco residual | ✅ |

**Documento:** `RISK_REGISTER.md`

**Riscos identificados:**

| ID | Título | Nível original | Risco residual |
|---|---|---|---|
| R-001 | Acesso nao autorizado a dados de clientes | Alto (15) | Medio (6) |
| R-002 | Vazamento de dados via API | Alto (12) | Medio (4) |
| R-003 | Indisponibilidade do servico | Medio (9) | Baixo (3) |
| R-004 | Falha de autenticacao / acesso privilegiado | Alto (15) | Medio (6) |
| R-005 | Comprometimento de fornecedor | Medio (9) | Baixo (4) |
| R-006 | Perda de dados por falha de backup | Alto (12) | Baixo (3) |
| R-007 | Adulteracao de registros de auditoria | Alto (16) | Muito baixo (2) |
| R-008 | Violacao de dados pessoais (LGPD) | Muito alto (20) | Medio (6) |
| R-009 | Acesso fisico nao autorizado | Baixo (4) | Muito baixo (2) |
| R-010 | Engenharia social / phishing | Medio (9) | Baixo (3) |

---

## 7. Trilha de auditoria técnica

Um dos controles centrais implementados é a trilha de auditoria imutável na plataforma:

### 7.1 Tabela `security_audit_events`

| Aspecto | Detalhe |
|---|---|
| **Banco de dados** | PostgreSQL 15 via Supabase (produção) |
| **Imutabilidade** | Triggers `BEFORE` bloqueiam UPDATE, DELETE e TRUNCATE |
| **PII** | Armazenados apenas hashes SHA-256 de IPs e e-mails |
| **Retenção** | 90 dias (campo `retention_until` preenchido automaticamente) |
| **Auditabilidade** | Campo `event_hash` garante integridade de cada registro |

### 7.2 Triggers verificados

| Trigger | Evento | Timing | Status |
|---|---|---|---|
| `trg_security_audit_events_no_delete` | DELETE | BEFORE | ✅ Ativo |
| `trg_security_audit_events_no_truncate` | TRUNCATE | BEFORE | ✅ Ativo |
| `trg_security_audit_events_no_update` | UPDATE | BEFORE | ✅ Ativo |

**Verificado em:** 2026-06-16 via `pg_trigger` (Supabase SQL Editor, produção)

### 7.3 Tipos de evento auditados

| Tipo de evento | Cobertura |
|---|---|
| `AUTH_FAILURE` | Falhas de autenticação |
| `ADMIN_ACTION` | Ações administrativas |
| `DATA_PURGE` | Purgas e exclusões (LGPD) |
| `PERMISSION_CHANGE` | Modificações de permissão e perfil |
| `SECURITY_EVENT` | Eventos de segurança detectados |

**Documento de evidência completo:** `SECURITY_AUDIT_MIGRATION_EVIDENCE.md`

### 7.4 Prova de imutabilidade

Dois testes controlados confirmaram o bloqueio de modificação:

```
ERROR: P0001: security_audit_events is append-only
CONTEXT: PL/pgSQL function prevent_security_audit_events_mutation() line 3 at RAISE
```

---

## 8. Evidências operacionais

Onze registros operacionais evidenciam que os controles estão ativos — não apenas documentados:

| Evidência | Arquivo | Controles cobertos |
|---|---|---|
| Revisão de acessos | `evidence/ACCESS_REVIEW_LOG.md` | A.8.2, A.8.3 |
| Backup e restauração | `evidence/BACKUP_TEST_LOG.md` | A.8.13 |
| Gestão de fornecedores | `evidence/SUPPLIER_REVIEW_LOG.md` | A.5.19–A.5.23 |
| Histórico de mudanças | `evidence/CHANGE_HISTORY_LOG.md` | A.8.32 |
| Incidentes e simulações | `evidence/INCIDENT_SIMULATION_LOG.md` | A.5.24–A.5.28 |
| Gestão de vulnerabilidades | `evidence/VULNERABILITY_MANAGEMENT_LOG.md` | A.8.8 |
| Continuidade e recuperação | `evidence/CONTINUITY_TEST_LOG.md` | A.5.29–A.5.30 |
| Monitoramento | `evidence/MONITORING_LOG.md` | A.8.15–A.8.16 |
| Conscientização e treinamento | `evidence/TRAINING_LOG.md` | A.6.3 |
| Revisão de políticas | `evidence/POLICY_REVIEW_LOG.md` | A.5.1 |
| Ações corretivas | `evidence/CORRECTIVE_ACTION_LOG.md` | Seção 10 |

---

## 9. Auditoria interna e análise crítica da direção

### Auditoria interna — Q2 2026

| Campo | Valor |
|---|---|
| Data | 2026-06-16 |
| Auditor | Saulo Pavanello (auditoria de primeira parte) |
| Resultado | 0 não conformidades maiores; 3 oportunidades de melhoria |
| Relatório | `INTERNAL_AUDIT_REPORT_2026_Q2.md` |

### Análise crítica pela direção — Q2 2026

| Campo | Valor |
|---|---|
| Data | 2026-06-16 |
| Participantes | Carlos Henrique (Alta Direção) |
| Resultado | SGSI aprovado; plano de ação aprovado |
| Ata | `MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` |

### Planejamento de Independência para Ciclos Futuros
Para mitigar conflitos de interesse e garantir a objetividade das auditorias de primeira parte:
- **Alta Direção / Gestão**: Carlos Henrique permanece como responsável pelo SGSI e representante da alta direção (revisor e aprovador final).
- **Auditoria Interna**: Saulo Pavanello (Software Engineer) atuará como auditor técnico nos próximos ciclos, garantindo que não audite diretamente controles de código ou infraestrutura implementados exclusivamente por ele mesmo.
- **Auditoria de Gap**: Planeja-se a contratação de consultor externo independente para realizar uma auditoria de gap antes da auditoria externa formal de certificação.

---

## 10. Infraestrutura e fornecedores principais

| Fornecedor | Função | Dados processados |
|---|---|---|
| Supabase (AWS SA-East-1) | Banco de dados, autenticação, storage | Dados de usuários, documentos, logs |
| Cloudflare | CDN, WAF, DNS | Tráfego da aplicação |
| VPS dedicada (177.136.229.79) | Servidor de aplicação | Aplicação Node.js |
| OpenAI | Processamento de IA | Dados de consultas (anonimizados) |
| Stripe / InfinitePay | Pagamentos | Dados financeiros (tokenizados) |
| Resend | Disparo de e-mails transacionais | E-mails de usuários |

---

## 11. Próximos passos para certificação formal

Para obter a certificação ISO/IEC 27001 por terceira parte, os seguintes passos são necessários:

| Etapa | Descrição | Responsável |
|---|---|---|
| 1 | Operar os controles e acumular evidências por 3–6 meses | Carlos Henrique / Equipe |
| 2 | Análise de gaps por consultor independente | Consultor externo |
| 3 | Contratar organismo certificador acreditado (ex: BSI, Bureau Veritas, DNV) | Carlos Henrique |
| 4 | Auditoria de Estágio 1 — análise documental | Auditor externo |
| 5 | Corrigir eventuais não conformidades documentais | Carlos Henrique |
| 6 | Auditoria de Estágio 2 — auditoria operacional no ambiente | Auditor externo |
| 7 | Corrigir eventuais não conformidades operacionais | Carlos Henrique |
| 8 | Emissão do certificado (validade 3 anos) | Organismo certificador |
| 9 | Auditorias de vigilância anuais | Auditor externo |

---

## 12. Aprovação e assinaturas

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| Alta Direção / Responsável pelo SGSI | Carlos Henrique | 2026-06-16 | [Assinado digitalmente por Carlos Henrique — Alta Direção] |
| Revisor técnico / Auditor | Saulo Pavanello | 2026-06-16 | [Assinado digitalmente por Saulo Pavanello — Auditor] |


---

## 13. Histórico de versões

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-16 | Carlos Henrique | Emissão inicial |

---

## 14. Índice de documentos referenciados

| Documento | Caminho |
|---|---|
| Escopo do SGSI | `docs/compliance/iso27001/ISMS_SCOPE.md` |
| Política de Segurança da Informação | `docs/compliance/iso27001/INFORMATION_SECURITY_POLICY.md` |
| Registro de Riscos | `docs/compliance/iso27001/RISK_REGISTER.md` |
| Declaração de Aplicabilidade | `docs/compliance/iso27001/STATEMENT_OF_APPLICABILITY.md` |
| Relatório de Auditoria Interna Q2 | `docs/compliance/iso27001/INTERNAL_AUDIT_REPORT_2026_Q2.md` |
| Ata de Análise Crítica Q2 | `docs/compliance/iso27001/MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` |
| Evidência da Trilha de Auditoria | `docs/compliance/iso27001/SECURITY_AUDIT_MIGRATION_EVIDENCE.md` |
| Procedimento Operacional | `docs/compliance/iso27001/ISMS_OPERATING_PROCEDURE.md` |
| Roteiro SQL de verificação | `docs/compliance/iso27001/evidence/SUPABASE_AUDIT_TRAIL_ROTEIRO.md` |
| SQL de criação da tabela | `docs/compliance/sql/20260616_soc2_security_audit_events.sql` |

---

*Documento SJ-ISMS-DECL-001 — Classificação: Interno — SocialJurídico Tecnologia Ltda — 2026-06-16*
