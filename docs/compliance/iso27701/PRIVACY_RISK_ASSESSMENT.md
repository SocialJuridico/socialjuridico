# Avaliação de Riscos de Privacidade (Privacy Risk Assessment)

**Documento:** SJ-PIMS-RISK-001  
**Versão:** 1.0 — 2026-06-16  
**Norma:** ISO/IEC 27701:2025 — Seção 6.1.2 | LGPD Art. 50, I, g  
**Aprovado por:** Carlos Henrique (DPO / Responsável pelo PIMS)

---

## 1. Metodologia de Avaliação de Riscos

A avaliação de riscos de privacidade da SocialJurídico foca no **impacto sobre os titulares dos dados (PII Principals)** em termos de violação de seus direitos, perda de controle sobre seus dados ou danos morais e materiais, além do impacto regulatório e reputacional para a organização.

### Matriz de Risco (Probabilidade × Impacto)

Os riscos são classificados com base em uma escala de 1 a 5 para Probabilidade (P) e Impacto (I), gerando uma pontuação final de 1 a 25:
- **Baixo (1–6)**: Monitoramento periódico.
- **Médio (8–12)**: Ações mitigadoras planejadas.
- **Alto (15–25)**: Ações imediatas obrigatórias.

---

## 2. Registro de Riscos de Privacidade (R-PRIV)

| Código | Descrição do Risco | P | I | Risco | Medida de Mitigação | Status Residual |
|---|---|---|---|---|---|---|
| **R-PRIV-01** | Ausência ou inadequação de base legal para tratamento de dados | 1 | 5 | **5** (Baixo) | Vinculação estrita de cada campo no inventário à base legal adequada (Contrato/Consentimento). | ✅ Controlado |
| **R-PRIV-02** | Consentimento inválido, não registrado ou de difícil revogação | 2 | 4 | **8** (Médio) | Implementação de política de consentimento detalhada e botões visíveis de revogação no perfil. | ✅ Mitigado |
| **R-PRIV-03** | Não realização de Relatório de Impacto (DPIA) para tratamentos de alto risco | 1 | 5 | **5** (Baixo) | Realização preventiva de DPIAs para o módulo de inteligência artificial (OpenAI) e exclusão LGPD. | ✅ Controlado |
| **R-PRIV-04** | Falha na assinatura ou formalização de contratos/DPAs com operadores | 3 | 3 | **9** (Médio) | Registro de fornecedores ativo; regularização formal do DPA da InfinitePay e Napoleon VPS. | ⚠️ Em progresso |
| **R-PRIV-05** | Inventário de dados pessoais (ROPA) incompleto ou desatualizado | 2 | 3 | **6** (Baixo) | Revisão trimestral ou em novos deploys do inventário com 12 campos por categoria de dado. | ✅ Controlado |
| **R-PRIV-06** | Avisos de privacidade desatualizados ou inacessíveis | 2 | 3 | **6** (Baixo) | Histórico de revisões logado, links permanentes em rodapés e avisos contextuais no marketplace. | ✅ Controlado |
| **R-PRIV-07** | Atraso ou falha no atendimento aos direitos dos titulares (LGPD Art. 18) | 2 | 4 | **8** (Médio) | Canal direto do DPO configurado e fluxo automatizado de purga testado com sucesso. | ✅ Mitigado |
| **R-PRIV-08** | Compartilhamento indevido ou não documentado de dados com terceiros | 1 | 5 | **5** (Baixo) | Restrição no backend para compartilhamento de dados apenas com parceiros explícitos no registro. | ✅ Controlado |
| **R-PRIV-09** | Transferência internacional de dados sem salvaguardas contratuais | 2 | 4 | **8** (Médio) | Assinatura de DPA com Standard Contractual Clauses (SCCs) com Stripe, Resend e OpenAI. | ✅ Mitigado |
| **R-PRIV-10** | Incidente de segurança com dados pessoais sem notificação tempestiva | 2 | 5 | **10** (Médio) | Canal operacional de incidentes e checklist de notificação para a ANPD em até 48 horas úteis. | ✅ Mitigado |
| **R-PRIV-11** | Coleta excessiva de dados pessoais (desvio de finalidade/minimização) | 2 | 3 | **6** (Baixo) | Revisão de novos campos no desenvolvimento para garantir que apenas dados necessários sejam pedidos. | ✅ Controlado |
| **R-PRIV-12** | Falha na anonimização ou exclusão física real após expiração de prazo | 2 | 4 | **8** (Médio) | Execução de exclusão física definitiva no Supabase (teste controlado documentado). | ✅ Mitigado |
| **R-PRIV-13** | Acúmulo e vazamento de dados em arquivos temporários do servidor | 2 | 3 | **6** (Baixo) | Rotinas de limpeza automática do cache da aplicação e isolamento de arquivos temporários. | ✅ Controlado |
| **R-PRIV-14** | Retenção de dados pessoais além do prazo de prescrição legal/operacional | 2 | 3 | **6** (Baixo) | Execução da política de retenção que expira ou anonimiza dados de acordo com a categoria. | ✅ Controlado |
| **R-PRIV-15** | Interceptação de dados pessoais em trânsito por falta de criptografia | 1 | 5 | **5** (Baixo) | Certificado SSL/TLS obrigatório no Next.js (Napoleon) e redirecionamento de HTTP para HTTPS ativo. | ✅ Controlado |
| **R-PRIV-16** | Fornecimento ilegal de dados pessoais a autoridades judiciais/policiais | 1 | 4 | **4** (Baixo) | Procedimento formal de verificação prévia de ordens judiciais antes de qualquer liberação de PII. | ✅ Controlado |

---

## 3. Plano de Tratamento de Riscos (Ações Pendentes)

1. **Ação para R-PRIV-04 (InfinitePay e Napoleon)**:
   - *O que fazer*: Obter assinatura formal ou aceitação digital de DPAs específicos para tratamento de dados pessoais com a Napoleon e a InfinitePay.
   - *Prazo*: 2026-07-16 (Napoleon) e 2026-09-16 (InfinitePay).
   - *Responsável*: Carlos Henrique.

2. **Ação para R-PRIV-09 (Jitsi)**:
   - *O que fazer*: Implementar aviso de que a vídeo chamada transita por servidor no exterior (8x8 nos EUA) antes do ingresso do usuário na chamada.
   - *Prazo*: 2026-09-16.
   - *Responsável*: Engenharia.

3. **Ação para R-PRIV-07 (Portabilidade)**:
   - *O que fazer*: Desenvolver funcionalidade no painel de configurações que permita ao usuário exportar seus dados cadastrais em formato estruturado (JSON ou CSV).
   - *Prazo*: 2026-09-16.
   - *Responsável*: Engenharia.
