# Declaração de Aplicabilidade do PIMS (SoA) — ISO/IEC 27701:2025

**Documento:** SJ-PIMS-SOA-001  
**Versão:** 2.0 — 2026-06-16  
**Norma:** ISO/IEC 27701:2025 (Tabelas A.1 e A.2)  
**Aprovado por:** Carlos Henrique (Alta Direção / Responsável pelo PIMS)

---

## Introdução

Este documento constitui a Declaração de Aplicabilidade (SoA) do Sistema de Gestão de Privacidade da Informação (PIMS) da SocialJurídico, elaborado em conformidade com a norma **ISO/IEC 27701:2025**.

A SocialJurídico atua em dois papéis distintos no tratamento de dados pessoais (PII):
1. **Controladora (PII Controller)**: Responsável por determinar as finalidades e meios de tratamento dos dados de clientes, advogados cadastrados e administradores da plataforma. Controles aplicáveis constam na **Tabela A.1**.
2. **Operadora (PII Processor)**: Processa dados em nome de escritórios enterprise e seus respectivos clientes finais que utilizam as salas privadas e módulos de gestão da plataforma. Controles aplicáveis constam na **Tabela A.2**.

Os controles de segurança da informação compartilhados (Tabela A.3) são herdados e integrados diretamente da SoA do SGSI baseada na **ISO/IEC 27001:2022**.

---

## Tabela A.1 — Controles para Controlador de PII (PII Controller)

| ID | Controle / Objetivo de Controle | Aplicabilidade | Justificativa | Responsável | Evidência de Conformidade | Risco Relacionado |
|---|---|---|---|---|---|---|
| **A.1.2** | **Condições para coleta e processamento** | | | | | |
| A.1.2.1 | Identificação de base legal para o tratamento | **Sim** | Obrigatório sob a LGPD Art. 7 para justificar qualquer operação com dados pessoais. | Carlos Henrique | [PII_INVENTORY.md](./PII_INVENTORY.md), [PRIVACY_NOTICES_REVIEW_LOG.md](./PRIVACY_NOTICES_REVIEW_LOG.md) | R-PRIV-01 |
| A.1.2.2 | Determinação e obtenção de consentimento | **Sim** | Necessário para envio de comunicações de marketing e para o uso dos dados no módulo de IA. | Carlos Henrique | [CONSENT_MANAGEMENT.md](./CONSENT_MANAGEMENT.md) | R-PRIV-02 |
| A.1.2.3 | Registro e gestão de consentimento | **Sim** | Necessário provar que o consentimento foi obtido de forma lícita (LGPD Art. 8). | Carlos Henrique | [CONSENT_MANAGEMENT.md](./CONSENT_MANAGEMENT.md), Logs de banco de dados | R-PRIV-02 |
| A.1.2.4 | Avaliação de Impacto sobre Proteção de Dados (DPIA) | **Sim** | Requisito da ANPD para operações de maior risco, como uso de IA e fluxos de exclusão. | Carlos Henrique | [DPIA_AI_MODULE.md](./DPIA_AI_MODULE.md), [DPIA_LGPD_DELETION.md](./DPIA_LGPD_DELETION.md) | R-PRIV-03 |
| A.1.2.5 | Contratos com operadores de PII (DPAs) | **Sim** | SocialJurídico utiliza fornecedores terceiros que processam dados pessoais sob suas instruções. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-04 |
| A.1.2.6 | Co-controladores (Joint Controllers) | **Não** | A SocialJurídico atua isoladamente como controladora única em seus fluxos. | Carlos Henrique | Declaração de não aplicabilidade em contrato | N/A |
| A.1.2.7 | Registro de operações de tratamento (ROPA) | **Sim** | Exigência legal direta do Art. 37 da LGPD para documentar o ciclo de vida dos dados. | Carlos Henrique | [PII_INVENTORY.md](./PII_INVENTORY.md) | R-PRIV-05 |
| A.1.2.8 | Determinação de propósitos adicionais | **Sim** | Casos onde dados são redefinidos ou reutilizados exigem verificação de compatibilidade. | Carlos Henrique | Cláusulas de aviso de privacidade | R-PRIV-01 |
| A.1.2.9 | Tratamento de dados pessoais sensíveis | **Sim** | Aplicável de forma incidental e não estruturada, especialmente em documentos, casos, mensagens e arquivos enviados pelos usuários. O tratamento deve ser limitado à finalidade jurídica, com acesso restrito, segregação por perfil, retenção definida e base legal revisada. | Carlos Henrique | Filtro de entrada de dados no backend, RLS ativo | R-PRIV-01 |
| A.1.2.10| Tratamento de dados de crianças e adolescentes | **Sim** | Aplicável de forma incidental e não estruturada em processos e documentos anexados envolvendo guarda, pensão alimentícia ou sucessões. O tratamento restringe-se à finalidade jurídica e está sob a responsabilidade do advogado contratado, sob criptografia e isolamento RLS. | Carlos Henrique | Validação de cadastro e RLS | R-PRIV-01 |
| A.1.2.11| Notificação de mudanças na finalidade ou base legal| **Sim** | Mudanças nas condições de tratamento exigem notificação prévia aos titulares. | Carlos Henrique | [PRIVACY_NOTICES_REVIEW_LOG.md](./PRIVACY_NOTICES_REVIEW_LOG.md) | R-PRIV-06 |
| **A.1.3** | **Obrigações com titulares (PII Principals)** | | | | | |
| A.1.3.1 | Fornecimento de aviso de privacidade compreensível | **Sim** | Princípio da transparência exige avisos claros e acessíveis em todos os pontos de entrada. | Carlos Henrique | [PRIVACY_NOTICES_REVIEW_LOG.md](./PRIVACY_NOTICES_REVIEW_LOG.md), Link na Bio, Rodapé | R-PRIV-06 |
| A.1.3.2 | Determinação de obrigações com titulares | **Sim** | Mapeamento dos direitos previstos no Art. 18 da LGPD. | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md) | R-PRIV-07 |
| A.1.3.3 | Facilitação do exercício de direitos dos titulares| **Sim** | Fornecer canais eficientes para solicitações de privacidade. | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md), Canal do DPO | R-PRIV-07 |
| A.1.3.4 | Resposta a solicitações dos titulares | **Sim** | Atender solicitações dentro do prazo legal (15 dias úteis para eliminação e acesso). | Carlos Henrique | [DATA_SUBJECT_REQUEST_TEST_LOG.md](./DATA_SUBJECT_REQUEST_TEST_LOG.md) | R-PRIV-07 |
| A.1.3.5 | Informações sobre compartilhamento com terceiros | **Sim** | Titular tem o direito de saber com quais entidades seus dados são compartilhados. | Carlos Henrique | [PII_INVENTORY.md](./PII_INVENTORY.md), [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-08 |
| A.1.3.6 | Informações sobre decisões automatizadas | **Não** | A plataforma não realiza decisões 100% automatizadas que gerem efeitos jurídicos relevantes. | Carlos Henrique | Declaração nos termos de uso | N/A |
| A.1.3.7 | Informações sobre transferências internacionais | **Sim** | Notificar titulares quando dados transitam por servidores no exterior (Stripe, OpenAI). | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md), Termos de Uso | R-PRIV-09 |
| A.1.3.8 | Informações sobre violações de dados pessoais | **Sim** | Dever de notificar titulares em caso de incidentes com risco relevante (LGPD Art. 48). | Carlos Henrique | [PRIVACY_INCIDENT_PROCEDURE.md](./PRIVACY_INCIDENT_PROCEDURE.md) | R-PRIV-10 |
| A.1.3.9 | Canal para reclamações e consultas dos titulares | **Sim** | Disponibilizar meio de contato fácil (e-mail dpo@socialjuridico.com.br). | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md) | R-PRIV-07 |
| A.1.3.10| Portabilidade de dados pessoais | **Sim** | Direito assegurado pelo Art. 18, V da LGPD. | Engenharia | Previsto para implementação técnica no Q3 2026 | R-PRIV-07 |
| A.1.3.11| Correção, bloqueio ou eliminação de PII | **Sim** | Permitir retificação de dados incorretos e exclusão de dados desnecessários. | Carlos Henrique | [DATA_SUBJECT_REQUEST_TEST_LOG.md](./DATA_SUBJECT_REQUEST_TEST_LOG.md) | R-PRIV-07 |
| **A.1.4** | **Privacidade desde a concepção (by Design/by Default)** | | | | | |
| A.1.4.1 | Limitação da coleta de dados | **Sim** | Coletar apenas dados estritamente necessários para a prestação dos serviços. | Carlos Henrique | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md) | R-PRIV-11 |
| A.1.4.2 | Limitação do processamento de dados | **Sim** | Restringir o tratamento aos escopos autorizados pelo titular ou base legal. | Carlos Henrique | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md), [PII_INVENTORY.md](./PII_INVENTORY.md) | R-PRIV-11 |
| A.1.4.3 | Minimização e pseudonimização | **Sim** | Utilizar técnicas para ocultar dados pessoais diretos (ex: hashes em logs). | Engenharia | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md), Hashing SHA-256 no banco de dados | R-PRIV-11 |
| A.1.4.4 | Descaracterização ou anonimização de PII | **Sim** | Anonimizar dados em relatórios ou após o término de sua finalidade legal. | Engenharia | [PRIVACY_RETENTION_POLICY.md](./PRIVACY_RETENTION_POLICY.md) | R-PRIV-12 |
| A.1.4.5 | Eliminação de arquivos temporários | **Sim** | Garantir que dados residuais (ex: uploads em cache) sejam limpos periodicamente. | Engenharia | Configurações do Next.js / PM2 / Logs do servidor | R-PRIV-13 |
| A.1.4.6 | Definição de prazos de retenção de PII | **Sim** | Evitar retenção indefinida de dados inativos ou desnecessários. | Carlos Henrique | [PRIVACY_RETENTION_POLICY.md](./PRIVACY_RETENTION_POLICY.md) | R-PRIV-14 |
| A.1.4.7 | Métodos seguros de descarte de PII | **Sim** | Apagar fisicamente registros do banco e objetos de storage de forma definitiva. | Engenharia | Scripts de Purge RLS, trigger PostgreSQL | R-PRIV-14 |
| A.1.4.8 | Controles de transmissão e criptografia de PII | **Sim** | Proteger dados pessoais contra interceptação durante o trânsito. | Engenharia | HTTPS/TLS 1.3, cookies Secure/SameSite | R-PRIV-15 |
| A.1.4.9 | Configurações padrão de privacidade (by Default) | **Sim** | A plataforma deve nascer configurada com o nível máximo de privacidade possível. | Carlos Henrique | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md) | R-PRIV-11 |
| A.1.4.10| Privacidade no ciclo de desenvolvimento | **Sim** | Incluir validações de privacidade (como RLS, vazamento de PII) no pipeline de testes. | Engenharia | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md) | R-PRIV-11 |
| **A.1.5** | **Compartilhamento, transferência e divulgação de PII**| | | | | |
| A.1.5.1 | Registro de compartilhamento de PII | **Sim** | Rastrear dados compartilhados com terceiros prestadores de serviços. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-08 |
| A.1.5.2 | Justificativa para transferências a terceiros | **Sim** | Validar a necessidade e fundamentação legal para envio de dados a terceiros. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-08 |
| A.1.5.3 | Destinatários e países de transferência de PII | **Sim** | Documentar locais físicos de armazenamento e processamento de terceiros. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-09 |
| A.1.5.4 | Registro de solicitações de divulgação legal | **Sim** | Registrar requisições judiciais ou de autoridades policiais para fornecimento de dados. | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md) | R-PRIV-16 |
| A.1.5.5 | Procedimentos para atendimento a divulgações legais | **Sim** | Protocolo estruturado para avaliar validade jurídica de ordens de quebra de sigilo. | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md) | R-PRIV-16 |

---

## Tabela A.2 — Controles para Operador de PII (PII Processor)

| ID | Controle / Objetivo de Controle | Aplicabilidade | Justificativa | Responsável | Evidência de Conformidade | Risco Relacionado |
|---|---|---|---|---|---|---|
| **A.2.2** | **Condições para coleta e processamento** | | | | | |
| A.2.2.1 | Acordo com clientes (DPA com controlador) | **Sim** | Estabelecer limites contratuais ao processar dados pessoais em nome dos escritórios de advocacia. | Carlos Henrique | [PRIVACY_ROLES_AND_RESPONSIBILITIES.md](./PRIVACY_ROLES_AND_RESPONSIBILITIES.md), Termo de Adesão Enterprise | R-PRIV-04 |
| A.2.2.2 | Acordo de co-operador ou operador conjunto | **Não** | A SocialJurídico atua isoladamente como operadora direta, sem compartilhar a operação com parceiros. | Carlos Henrique | N/A | N/A |
| A.2.2.3 | Registro de operações de tratamento (operador) | **Sim** | Relação de dados de clientes finais dos escritórios processados dentro da plataforma. | Carlos Henrique | [PII_INVENTORY.md](./PII_INVENTORY.md) (Item 4) | R-PRIV-05 |
| A.2.2.4 | Auxílio ao controlador na avaliação de impacto (PIA) | **Sim** | Fornecer documentação de segurança do ambiente Supabase/Napoleon aos escritórios clientes. | Carlos Henrique | [PRIVACY_BY_DESIGN_EVIDENCE.md](./PRIVACY_BY_DESIGN_EVIDENCE.md) | R-PRIV-03 |
| A.2.2.5 | Contratos com suboperadores | **Sim** | Garantir que Stripe, Supabase e Napoleon repliquem as obrigações de proteção de dados. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-04 |
| **A.2.3** | **Obrigações com titulares (PII Principals)** | | | | | |
| A.2.3.1 | Auxílio na facilitação de direitos dos titulares | **Sim** | Fornecer ferramentas (como botões de exclusão de dados de clientes) para que os escritórios atendam titulares. | Engenharia | Painel do Advogado (Exclusão de clientes da sala) | R-PRIV-07 |
| **A.2.4** | **Privacidade desde a concepção (by Design/by Default)** | | | | | |
| A.2.4.1 | Limitação da coleta sob instrução | **Sim** | Não coletar dados adicionais de clientes dos escritórios sem que estes os insiram ativamente. | Engenharia | Esquema de tabelas do Supabase, RLS ativo | R-PRIV-11 |
| A.2.4.2 | Limitação do processamento sob instrução | **Sim** | Garantir que dados de escritórios não sejam utilizados para fins próprios da plataforma (como marketing). | Carlos Henrique | Termos Enterprise, isolamento multi-tenant | R-PRIV-11 |
| A.2.4.3 | Minimização de PII sob instrução | **Sim** | Permitir que o escritório determine quais campos deseja preencher para seus clientes. | Engenharia | Campos opcionais no cadastro de casos | R-PRIV-11 |
| A.2.4.4 | Descaracterização ou exclusão sob instrução | **Sim** | Garantir exclusão definitiva de registros a pedido do escritório. | Engenharia | [PRIVACY_RETENTION_POLICY.md](./PRIVACY_RETENTION_POLICY.md), Rotina de exclusão | R-PRIV-12 |
| A.2.4.5 | Eliminação de arquivos temporários | **Sim** | Limpeza de caches em sessões do Next.js de dados carregados pelos escritórios. | Engenharia | Server config | R-PRIV-13 |
| A.2.4.6 | Retenção de PII sob instrução | **Sim** | Devolver ou apagar dados pessoais após encerramento do contrato de licença enterprise. | Carlos Henrique | [PRIVACY_RETENTION_POLICY.md](./PRIVACY_RETENTION_POLICY.md) | R-PRIV-14 |
| A.2.4.7 | Descarte de PII sob instrução | **Sim** | Executar rotinas de purga física de dados dos inquilinos ao expirar o prazo ou mediante pedido. | Engenharia | [PRIVACY_RETENTION_POLICY.md](./PRIVACY_RETENTION_POLICY.md) | R-PRIV-14 |
| A.2.4.8 | Controles de transmissão sob instrução | **Sim** | Criptografar tráfego entre o navegador do escritório/cliente e os servidores da plataforma. | Engenharia | SSL/TLS, Criptografia em repouso no Supabase | R-PRIV-15 |
| **A.2.5** | **Compartilhamento, transferência e divulgação de PII**| | | | | |
| A.2.5.1 | Registro de compartilhamento de PII | **Sim** | Logar envio de dados dos inquilinos a suboperadores (ex: notificações por e-mail via Resend). | Engenharia | Logs de integração na API | R-PRIV-08 |
| A.2.5.2 | Justificativa para transferências a terceiros | **Sim** | Garantir que o envio de dados a suboperadores esteja justificado pela execução do contrato. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-08 |
| A.2.5.3 | Destinatários e países de transferência de PII | **Sim** | Informar aos escritórios que seus dados transitam no exterior através de suboperadores globais. | Carlos Henrique | [VENDOR_PRIVACY_REGISTER.md](./VENDOR_PRIVACY_REGISTER.md) | R-PRIV-09 |
| A.2.5.4 | Registro de solicitações de divulgação legal | **Sim** | Notificar o controlador (escritório) em caso de ordens judiciais direcionadas a dados sob sua custódia. | Carlos Henrique | [DATA_SUBJECT_RIGHTS_PROCEDURE.md](./DATA_SUBJECT_RIGHTS_PROCEDURE.md) | R-PRIV-16 |

---

## Aceite formal e aprovação

Eu, **Carlos Henrique**, na qualidade de Alta Direção e DPO do SocialJurídico, aprovo esta Declaração de Aplicabilidade do PIMS (SoA) como documento normativo e operacional do sistema de privacidade, conforme revisado e validado internamente.

**Aprovado por:** Carlos Henrique (CEO / DPO / Responsável pelo PIMS)  
**Data:** 2026-06-16  
**Assinatura:** [Assinado digitalmente por Carlos Henrique — DPO]  
**Revisado por:** Saulo Pavanello (Software Engineer / Auditor)  
**Assinatura de revisão:** [Assinado digitalmente por Saulo Pavanello — Auditor]
