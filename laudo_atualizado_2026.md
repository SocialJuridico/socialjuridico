# 🛡️ RELATÓRIO TÉCNICO DE ARQUITETURA & INFRAESTRUTURA
## SocialJurídico — Mapeamento de Topologia, Segurança e Pipelines de Dados (v2.5)

Este documento apresenta uma revisão técnica e objetiva da arquitetura de software, infraestrutura de rede, conformidade de dados e pipelines de processamento do **SocialJurídico (SJ)**, mapeados para subsidiar análises técnicas de expansão e governança.

---

## SEÇÃO 1: RESUMO EXECUTIVO DA ARQUITETURA
O SocialJurídico é estruturado sob uma topologia multi-portal isolada e baseada em padrões de projeto modular. A plataforma é distribuída em **4 portais funcionais segregados**:
*   **Portal do Advogado (Core Operational):** Módulos de cadastro de clientes (CRM), análise de conformidade cadastral (KYC), geração de minutas e controle operacional de dossiês.
*   **Portal do Cliente (Transparency & Signatures):** Assinatura eletrônica de documentos, upload de evidências documentais e canal de comunicação integrado.
*   **Portal do Anunciante (Marketplace Engine):** Distribuição de ofertas de serviços especializados (como perícias e cálculos judiciais) para a base profissional.
*   **Portal do Administrador (System Governance):** Console centralizado para moderação de anúncios, controle de cotas de faturamento Stripe e auditoria de logs.

A topologia de rede é ancorada em uma camada de proxy reverso e CDN via **Cloudflare Secure Edge**, com terminação SSL/TLS 1.3 e backend hospedado em **servidor dedicado Linux Hardened** com processos encapsulados via **Docker Engine**.

```mermaid
graph TD
    User[Usuários / Dispositivos] -->|HTTPS / TLS 1.3| CF[Cloudflare Secure Edge Proxy]
    CF -->|Filtro WAF / DDoS / CDN| Host[Servidor Hardened Linux Dedicado]
    subgraph Host [Host Standalone - Docker Engine]
        Next[Next.js App Server Standalone]
        Next -->|Node.js Runtime / APIs| Local[Fila de Tarefas Local]
    end
    Next -->|Autenticação & CRUD| SB[(Supabase Cloud Database - RLS / RBAC)]
    Next -->|Webhooks / S2S Billing| Stripe[Stripe Billing Gateway]
    Next -->|Chamadas de Processamento| LLM[Provedores de IA / Whisper API]
```

---

## SEÇÃO 2: PIPELINES DE DADOS & TOLERÂNCIA A INTERRUPÇÕES MÓVEIS

Auditamos e mapeamos os fluxos de captura e estruturação de dados não-estruturados (áudio e arquivos digitalizados) na entrada do sistema:

*   **1. Pipeline de Processamento de Voz Tolerante a Interrupções (Mobile Resilient):**
    Navegadores móveis (iOS/Safari e Android/Chrome) apresentam políticas restritivas de hardware que interrompem a captura de áudio após timeouts curtos de silêncio. Para contornar esta limitação sem prejudicar a experiência do usuário, implementamos um loop de reinicialização baseado em referências de estado atômicas (`isListeningRef`, `isConcludedRef` e `pastTranscriptsRef`):
    *   **Preservação de Buffer:** Se a sessão de gravação for interrompida pelo sistema operacional devido a uma pausa, o buffer de transcrição acumulado é retido em `pastTranscriptsRef`.
    *   **Auto-Restart:** A aplicação intercepta o encerramento da captura e, caso o sinal de conclusão voluntária (`isConcludedRef`) não tenha sido disparado, reinicia a captura assincronamente sem piscar a interface ou fechar o modal ativo, concatenando os novos fragmentos de texto ao histórico gravado.

*   **2. Processamento e Estruturação de Dados (KYC):**
    O pipeline de linguagem natural processa a transcrição ou o documento PDF e retorna uma estrutura de dados relacional contendo 10 campos qualificados:
    1. *Nome Completo*
    2. *Tipo de Pessoa* (Física/Jurídica mapeada de forma contextual)
    3. *CPF / CNPJ* (com validação e formatação automática)
    4. *RG / IE*
    5. *Estado Civil*
    6. *Profissão*
    7. *Telefone*
    8. *E-mail* (validado individualmente)
    9. *Endereço Completo*
    10. *Fatos do Caso* (saneados e mapeados para posterior consumo pelo redator de minutas)

---

## SEÇÃO 3: GOVERNANÇA DE BANCO DE DADOS, RBAC & SUPABASE RLS
A camada de dados adota políticas de segurança que garantem a integridade operacional da plataforma:

*   **Políticas de RLS (Row Level Security):** O banco de dados PostgreSQL utiliza RLS ativo em todas as tabelas transacionais. Cada consulta (Select, Update, Delete) é validada contra o UUID da sessão do usuário autenticado no Supabase Auth, impedindo cruzamento ou exposição de dados entre escritórios concorrentes (*cross-tenant data leakage*).
*   **Decoupled Server Integration:** A chave privada do Supabase (Service Role) é isolada estritamente no ambiente do servidor backend (Next.js Server-Side APIs). O cliente final não tem acesso a chaves privilegiadas, reduzindo a superfície de ataque a injeções de queries.
*   **Consistência de Schema (PGRST-204):** O cache do PostgREST foi saneado e as tabelas relacionais de anunciantes e faturamento foram normalizadas, eliminando divergências de colunas e garantindo conformidade referencial nas chaves estrangeiras.

---

## SEÇÃO 4: SEGURANÇA DA INFORMAÇÃO & COMPLIANCE

### 1. Trilha de Auditoria & LGPD (Conformidade com a Lei Geral de Proteção de Dados)
A arquitetura do sistema adota princípios de *Privacy by Design*:
*   **Mapeamento de Custódia:** Cada registro e modificação no banco de dados grava de forma imutável a credencial do operador responsável.
*   **Fluxo de Exclusão Segura:** Implementamos um fluxo nativo de Solicitação de Exclusão de Dados (`showDeleteRequestModal` e rota backend de purga), permitindo a deleção auditada e completa de registros pessoais de clientes finais, atendendo às exigências regulatórias de direitos dos titulares de dados.

### 2. Validade Jurídica de Assinaturas Digitais
O módulo de assinatura eletrônica do SocialJurídico está alinhado à **Medida Provisória nº 2.200-2/2001, Artigo 10º, § 2º**, que valida a eficácia jurídica de assinaturas eletrônicas não-certificadas (ICP-Brasil), desde que provada sua autoria e integridade:
*   **Metadados de Evidência:** A assinatura coleta e registra no banco o endereço IP do signatário, geolocalização do dispositivo, dados do agente de usuário (User-Agent), hash do documento assinado e o traçado digitalizado da assinatura na tela.

### 3. Blindagem e Cadeia de Custódia de Evidências
Para garantir a integridade de provas digitais inseridas no sistema:
*   No momento do upload, a aplicação calcula localmente o **Hash SHA-256** do arquivo e o registra na tabela de metadados junto com o carimbo de data/hora (Timestamp) do servidor. 
*   Isso assegura a imutabilidade do documento anexado para apresentações judiciais, garantindo que qualquer alteração posterior no arquivo seja imediatamente detectada por colisão de hash.

---

## SEÇÃO 5: INFRAESTRUTURA E ESTÁGIO DE EXPANSÃO

A resiliência de infraestrutura do sistema é baseada em três camadas complementares:

1.  **Proteção e Cache na Borda (Cloudflare):**
    *   **WAF Ativo:** Bloqueio de ameaças de borda (DDoS, SQL Injection, injeções de script).
    *   **SSL/TLS 1.3:** Criptografia obrigatória ponta a ponta para todo o tráfego.
2.  **Servidor Linux Hardened Dedicado (Docker Engine):**
    *   Isolamento do servidor Next.js em contêineres Docker, permitindo portabilidade e preparação para orquestração em nuvem horizontal (Kubernetes).
    *   Filtros locais e controle de portas fechadas por padrão, mantendo apenas as portas de proxy HTTP/HTTPS expostas.
3.  **Controle de Consumo de IA & Faturamento:**
    *   Para evitar custos excessivos de inferência nas APIs de processamento (Whisper/LLM), a aplicação possui controle de cotas integrado via Stripe Webhooks (validando o plano ativo PRO antes de liberar requisições de IA).
    *   Rate limiters locais protegem as rotas de API contra loops e abusos de requisições maliciosas.

---

## SEÇÃO 6: CONFORMIDADE & PRONTIDÃO TÉCNICA (VERSÃO 2.5)

Com base nas revisões arquiteturais, estabilidade da camada de segurança perimetral, isolamento de inquilinos via Supabase RLS e a estruturação de pipelines móveis resilientes de voz:

> **"A arquitetura apresenta aderência aos requisitos técnicos esperados para operações SaaS multi-tenant em estágio de expansão, com preparação para evolução enterprise."**

```
📊 INDICADORES DE CONFORMIDADE INTERNA:
🔐 Autenticação (Multi-Tenant RBAC)  ---------> [ VERIFICADO ]
🛡️ Governança de Dados (RLS / LGPD) ----------> [ VERIFICADO ]
🎙️ Pipeline de Voz Mobile (Resilient Mic) ----> [ VERIFICADO ]
⚖️ Integridade de Evidências (SHA-256) --------> [ VERIFICADO ]
⚙️ Hosting & CDN (Linux + Cloudflare Edge) ---> [ VERIFICADO ]
```

---

## SEÇÃO 7: DISCLAIMER INSTITUCIONAL

> [!IMPORTANT]
> **DISCLAIMER:** Este documento possui caráter estritamente técnico-informativo e representa uma revisão da arquitetura interna e mapeamento de topologia do SocialJurídico realizado em maio de 2026. Ele não substitui auditorias, pentests independentes ou certificações emitidas por entidades terceiras credenciadas (como certificações SOC2, ISO/IEC 27001 ou auditorias independentes de código).

**SOCIALJURÍDICO 2026 — RELATÓRIO TÉCNICO ARQUITETURAL (V2.5)**  
*Documento compilado em 17 de maio de 2026.*
