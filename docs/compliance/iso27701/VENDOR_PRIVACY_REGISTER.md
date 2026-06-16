# Registro de Fornecedores e Contratos de Privacidade

**Norma:** ISO/IEC 27701:2025 — Controles 8.5 (controlador) e 8.6 (operador)  
**Documento:** SJ-PIMS-VENDOR-001 | **Versão:** 1.0 — 2026-06-16  
**Revisão:** Anual ou ao contratar/renovar fornecedor

---

> **Instrução de uso:** Para cada fornecedor, verificar anualmente se a política de privacidade,
> localização dos dados e DPA estão atualizados. Registrar data da verificação na última coluna.

---

## 1. Supabase Inc.

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processa dados em nome da SocialJurídico) |
| **Serviços** | Banco de dados PostgreSQL, autenticação, storage de objetos, edge functions |
| **DPA** | [Supabase DPA](https://supabase.com/legal/dpa) — aceito via termos de serviço |
| **Política de privacidade** | [supabase.com/privacy](https://supabase.com/privacy) |
| **Localização dos dados** | SA-East-1 (São Paulo, Brasil) — dados no Brasil |
| **Transferência internacional** | Não (região Brasil selecionada) |
| **Suboperadores** | AWS (infraestrutura), Cloudflare (edge) |
| **Retenção** | Conforme configuração da SocialJurídico |
| **Exclusão** | Exclusão garantida em 30 dias após encerramento de conta |
| **Resposta a incidentes** | [Política de segurança Supabase](https://supabase.com/security) — notificação em 72h |
| **Medidas de segurança** | SOC 2 Type II, ISO 27001, criptografia em repouso e em trânsito, RLS |
| **Verificado em** | 2026-06-16 |

---

## 2. OpenAI LLC

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processa dados anonimizados para assistência jurídica com IA) |
| **Serviços** | API de modelos de linguagem (GPT) |
| **DPA** | [OpenAI Data Processing Addendum](https://openai.com/policies/data-processing-addendum) — disponível para contas Enterprise/API |
| **Política de privacidade** | [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy) |
| **Localização dos dados** | EUA (principal) |
| **Transferência internacional** | **Sim — EUA.** Mitigação: DPA com Cláusulas Contratuais Padrão (SCCs) da UE adotadas como referência |
| **Suboperadores** | Microsoft Azure (infraestrutura) |
| **Medida adicional** | **Dados anonimizados antes do envio** — nenhum identificador pessoal real enviado à API |
| **Retenção** | API: dados não retidos para treinamento (zero data retention por padrão em contas API) |
| **Exclusão** | N/A (dados não retidos) |
| **Resposta a incidentes** | [openai.com/security](https://openai.com/security) |
| **Medidas de segurança** | SOC 2 Type II, criptografia em trânsito e repouso |
| **Verificado em** | 2026-06-16 |

---

## 3. Stripe Inc.

| Campo | Detalhe |
|---|---|
| **Papel** | Operador e co-controlador (processa dados de pagamento) |
| **Serviços** | Processamento de pagamentos, gestão de assinaturas, emissão de notas |
| **DPA** | [Stripe Data Processing Agreement](https://stripe.com/legal/dpa) — aceito via termos de serviço |
| **Política de privacidade** | [stripe.com/privacy](https://stripe.com/privacy) |
| **Localização dos dados** | EUA + UE (distribuído) |
| **Transferência internacional** | **Sim — EUA/UE.** Mitigação: SCCs + Stripe certificada no EU-US Data Privacy Framework |
| **Suboperadores** | [Lista publicada](https://stripe.com/legal/service-privacy) |
| **Retenção** | Dados financeiros: retenção fiscal (5–7 anos conforme país) |
| **Exclusão** | Conforme solicitação e obrigações fiscais |
| **Resposta a incidentes** | Notificação contratual + [stripe.com/docs/security](https://stripe.com/docs/security) |
| **Medidas de segurança** | PCI DSS Level 1, SOC 1 Type II, SOC 2 Type II, ISO 27001 |
| **Verificado em** | 2026-06-16 |

---

## 4. InfinitePay (CloudWalk Inc.)

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processamento de pagamentos no Brasil) |
| **Serviços** | Processamento de pagamentos, máquina virtual, PIX |
| **DPA** | DPA publicado — verificar [infinitepay.io/termos](https://infinitepay.io/termos) e cláusulas de tratamento de dados |
| **Política de privacidade** | [infinitepay.io/privacidade](https://infinitepay.io/privacidade) |
| **Localização dos dados** | Brasil |
| **Transferência internacional** | Não declarado publicamente — verificar contrato |
| **Suboperadores** | Não declarados publicamente |
| **Retenção** | Retenção fiscal brasileira (5 anos) |
| **Exclusão** | Conforme solicitação e obrigações fiscais |
| **Resposta a incidentes** | Conforme regulação BCB (Banco Central do Brasil) |
| **Medidas de segurança** | Regulação BCB, PCI DSS |
| **Ação pendente** | Solicitar DPA formal assinado ou confirmação por escrito das cláusulas de tratamento |
| **Verificado em** | 2026-06-16 |

---

## 5. Cloudflare Inc.

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processa tráfego de rede em trânsito) |
| **Serviços** | CDN, WAF, DNS, proxy reverso |
| **DPA** | [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) |
| **Política de privacidade** | [cloudflare.com/privacypolicy](https://www.cloudflare.com/privacypolicy/) |
| **Localização dos dados** | Global (PoPs distribuídos); processamento transiente |
| **Transferência internacional** | **Sim — global.** Mitigação: DPA Cloudflare com SCCs; dados em trânsito, não armazenados permanentemente |
| **Suboperadores** | [Lista publicada](https://www.cloudflare.com/cloudflare-subprocessors/) |
| **Retenção** | Logs de segurança: 30 dias (configurável) |
| **Exclusão** | Configurável via dashboard |
| **Resposta a incidentes** | [cloudflare.com/trust-hub](https://www.cloudflare.com/trust-hub/) |
| **Medidas de segurança** | ISO 27001, SOC 2 Type II, PCI DSS |
| **Verificado em** | 2026-06-16 |

---

## 6. Resend Inc.

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processa e-mails transacionais) |
| **Serviços** | Disparo de e-mails transacionais (confirmação, notificações) |
| **DPA** | [resend.com/legal/dpa](https://resend.com/legal/dpa) |
| **Política de privacidade** | [resend.com/legal/privacy-policy](https://resend.com/legal/privacy-policy) |
| **Localização dos dados** | EUA (AWS us-east-1) |
| **Transferência internacional** | **Sim — EUA.** Mitigação: DPA com SCCs |
| **Suboperadores** | AWS SES |
| **Dados transmitidos** | Endereço de e-mail do destinatário, conteúdo do e-mail transacional |
| **Retenção** | Logs de entrega: 30 dias |
| **Exclusão** | Configurável |
| **Medidas de segurança** | TLS em trânsito, autenticação DKIM/SPF/DMARC |
| **Verificado em** | 2026-06-16 |

---

## 7. VPS / Hospedagem (servidor 177.136.229.79)

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (hospeda a aplicação web) |
| **Serviços** | VDS (Virtual Dedicated Server) — aplicação Node.js / Next.js |
| **Provedor** | **Napoleon Hospedagem** (napoleon.com.br) — empresa brasileira |
| **DPA / Termos** | [napoleon.com.br/termos](https://napoleon.com.br) — obter confirmação de cláusulas de tratamento de dados |
| **Política de privacidade** | Verificar em napoleon.com.br |
| **Localização dos dados** | **Brasil** — data centers em território nacional |
| **Transferência internacional** | **Não** — infraestrutura inteiramente no Brasil |
| **Dados no servidor** | Código da aplicação; dados pessoais transitam em memória mas são persistidos no Supabase (SA-East-1 / SP) |
| **Suboperadores** | Não declarados publicamente |
| **Retenção** | Dados de aplicação: enquanto vigente o contrato |
| **Exclusão** | Remoção do servidor ao encerrar contrato |
| **Resposta a incidentes** | Suporte via WhatsApp / Telegram (português) |
| **Medidas de segurança** | SSH com autenticação por chave, firewall, SSD NVMe, recursos dedicados (VDS) |
| **Ação pendente** | Obter confirmação formal de cláusulas de tratamento de dados / DPA |
| **Verificado em** | 2026-06-16 |

---

## 8. Jitsi / 8x8 Inc. (meet.jit.si)

| Campo | Detalhe |
|---|---|
| **Papel** | Operador (processa dados de vídeo/áudio durante chamadas) |
| **Serviços** | Videochamada em tempo real para consultas jurídicas |
| **Configuração** | Servidor público meet.jit.si operado pela 8x8 Inc. |
| **DPA** | [8x8 DPA / Política de privacidade](https://www.8x8.com/terms-and-conditions/privacy-notice) |
| **Política de privacidade** | [jitsi.org/meet-jit-si-privacy](https://jitsi.org/meet-jit-si-privacy/) |
| **Localização dos dados** | EUA (8x8 Inc.) |
| **Transferência internacional** | **Sim — EUA.** Mitigação: dados de vídeo são em tempo real (não gravados por padrão); aviso exibido ao usuário antes da chamada |
| **Dados transmitidos** | Áudio e vídeo em tempo real; metadados de sessão |
| **Retenção** | Não retido (sem gravação padrão) |
| **Medidas de segurança** | Criptografia ponta a ponta (DTLS-SRTP); sem conta requerida |
| **Aviso ao usuário** | Obrigatório exibir aviso de transferência internacional antes de iniciar chamada |
| **Alternativa de menor risco** | Considerar Jitsi auto-hospedado na VPS para eliminar transferência internacional |
| **Verificado em** | 2026-06-16 |

---

## Resumo de transferências internacionais

| Fornecedor | Destino | Mecanismo de adequação |
|---|---|---|
| OpenAI | EUA | DPA + SCCs (dados anonimizados) |
| Stripe | EUA / UE | DPA + SCCs + EU-US DPF |
| Cloudflare | Global (trânsito) | DPA + SCCs |
| Resend | EUA | DPA + SCCs |
| Jitsi / 8x8 | EUA | Aviso ao usuário; sem retenção |

---

## Histórico de revisões

| Data | Alteração | Responsável |
|---|---|---|
| 2026-06-16 | Versão 1.0 — 8 fornecedores documentados com 10 campos cada | Carlos Henrique |
