# Laudo de Segurança — Incidente de Vazamento de Credenciais

**Data:** 26 de junho de 2026
**Responsável técnico:** Equipe de Desenvolvimento — Social Jurídico
**Escopo:** três plataformas em produção
- `socialjuridico` — aplicação principal (Next.js)
- `apisocialjuridico` — API de monitoramento processual (Fastify), servida em `n8n.socialjuridico.com.br`
- `validacaooab` — API de verificação automática de OAB (Next.js)
**Infraestrutura:** VPS única (CloudPanel + Nginx + PM2 + Docker), atrás de Cloudflare.

---

## 1. Sumário Executivo

Entre as datas de referência, foram identificados **dois vazamentos de chaves de API de provedores de IA**:

1. **Chave OpenAI** — conta `atendimentosocialjuris` **suspensa pela OpenAI** por uso indevido ("Distillation"), padrão típico de chave roubada operada por terceiros em escala.
2. **Chave Gemini (Google)** — consumo anômalo de **US$ 416 em um único dia**, concentrado na madrugada, sem correspondência com o uso legítimo da aplicação.

A investigação **descartou** vazamento por código-fonte, repositórios Git, dependências (npm) e acesso SSH. A causa-raiz provável foi isolada a **dois vetores de exposição**, ambos já neutralizados:

- **Stack n8n legado e exposto** (subdomínio público via Cloudflare) que armazenava, em cofre próprio, credenciais OpenAI e Supabase — acompanhado de um serviço `browserless` (Chrome headless) acessível pela internet sem autenticação.
- **Ferramenta de acesso remoto (AnyDesk)** na estação de desenvolvimento, com acesso não-supervisionado habilitado, perfil de acesso persistente para um ID externo e compartilhamento de área de transferência (clipboard) ativo.

Todas as correções críticas foram aplicadas. As plataformas estão operacionais e com a superfície de exposição substancialmente reduzida.

---

## 2. Cronologia do Incidente

| Evento | Detalhe |
|---|---|
| Suspensão da conta OpenAI | Bloqueio por violação de termos ("Distillation") — indicativo de uso por terceiro |
| Pico de consumo Gemini | US$ 416 em um dia, concentrado em horário sem operação humana |
| API Gemini desativada | Contenção emergencial no Google Cloud Console (consumo interrompido) |
| Investigação forense | Análise de código, repositórios, dependências, logs SSH, estação de trabalho e VPS |
| Correções aplicadas | Remoção de vetores e endurecimento de infraestrutura (Seção 5) |

---

## 3. Vetores Analisados e Conclusões

| Vetor investigado | Método de verificação | Conclusão |
|---|---|---|
| Chave em repositório Git (3 repos) | Varredura do histórico completo (`git rev-list --all`) | **Limpo** — nenhuma chave real commitada |
| Chave embutida no código / bundle | Busca em `src` e no bundle client (`.next/static`) | **Limpo** |
| Dependências maliciosas (npm) | `npm audit` + verificação de scripts `postinstall` + pacotes da lista JFrog | **Limpo** — nenhum pacote comprometido |
| Acesso indevido via SSH | `auth.log` (`Accepted password/publickey`) | **Nenhum login não-autorizado** |
| Endpoint expondo variáveis de ambiente | Auditoria das rotas de API | **Nenhum** |
| **Stack n8n exposto (cofre de credenciais)** | Inspeção do banco e da exposição de rede | **Vetor confirmado** — credenciais OpenAI + Supabase em serviço público |
| **AnyDesk na estação de desenvolvimento** | Análise de configuração e logs de conexão | **Vetor confirmado** — acesso remoto persistente + clipboard compartilhado |

---

## 4. Causa-Raiz

A combinação dos dois vetores explica de forma consistente os dois vazamentos, em provedores distintos e em chaves diferentes (característica de **fonte persistente e automatizada**, e não de exposição pontual):

- **n8n legado:** o serviço (originalmente um bot do Facebook, já sem uso) permanecia em execução, exposto à internet via Cloudflare, com um serviço auxiliar `browserless` aberto sem autenticação. Seu cofre armazenava credenciais **OpenAI** e **Supabase**. Um serviço de automação exposto e desatualizado é um alvo de alto valor: o comprometimento da interface permite extrair ou operar as credenciais nele guardadas.
- **AnyDesk (estação dev):** configurado com **acesso não-supervisionado**, **perfil de permissão persistente para um ID externo** e **clipboard compartilhado**. Como as chaves transitam pela área de transferência durante a operação, esse canal permite a captura contínua de qualquer credencial nova gerada.

---

## 5. Ações Corretivas Executadas

| # | Ação | Status |
|---|---|---|
| 1 | Desativação emergencial da API Gemini (contenção do consumo) | ✅ Concluído |
| 2 | Remoção completa do AnyDesk da estação de desenvolvimento (processo, serviço e resíduos de configuração) | ✅ Concluído |
| 3 | Destruição do stack n8n (containers `n8n`, `fb-bot`, `browserless` + volume com o cofre de credenciais) | ✅ Concluído |
| 4 | Bloqueio de acesso externo às portas `3005` (browserless) e `3006` (fb-bot) | ✅ Concluído |
| 5 | Correção de permissões dos arquivos `.env` das 3 plataformas (de world-readable para `600`) | ✅ Concluído |
| 6 | Restrição do painel CloudPanel (`:8443`) e do SSH (`:22`) a IP único autorizado | ✅ Concluído |
| 7 | Neutralização do brute-force SSH em curso (dezenas de IPs) via firewall | ✅ Concluído |
| 8 | Rotação da credencial do banco de dados (Supabase) | ✅ Concluído |
| 9 | Migração das 3 plataformas de Gemini para OpenAI (`gpt-4.1-mini`), com chave nova em ambiente já saneado | ✅ Concluído |
| 10 | Varredura de malware na estação de desenvolvimento (Malwarebytes) | ✅ Sem ameaças residentes |

---

## 6. Estado de Segurança Atual por Plataforma

### 6.1 `socialjuridico` (aplicação principal)
- `.env` com permissão `600`; nenhuma chave em repositório ou bundle.
- Migrada para OpenAI; chamadas server-side, sem exposição de chave ao cliente.
- **Pendente:** rotação final da chave de IA na nova conta saneada; revisão de variáveis de ambiente legadas.

### 6.2 `apisocialjuridico` (API de monitoramento)
- Autenticação por chave (`internalAuth`) e por chave comercial com rate limit.
- Cabeçalhos de segurança fortes (CSP restritiva, HSTS, `nosniff`, `X-Frame-Options`).
- **Recomendações de endurecimento (não-bloqueantes):**
  - Proteger ou desabilitar o Swagger `/docs` em produção (atualmente público).
  - Comparação de chaves em tempo constante (`timingSafeEqual`).
  - Sanitizar mensagens de erro `500` ao cliente em produção.
  - Vincular o listener a `127.0.0.1` (Nginx já faz proxy local).

### 6.3 `validacaooab` (verificação de OAB)
- Banco e storage próprios; `.env` com permissão `600`.
- Endpoints públicos escopados por sessão de uso único e janela de expiração; webhook assinado por HMAC.
- Migrada para OpenAI (documento via visão; checagem facial como critério secundário).

---

## 7. Pendências e Recomendações

**Prioridade alta**
1. **Estação do segundo desenvolvedor (notebook do Carlos):** aplicar a mesma auditoria (acesso remoto, clipboard, extensões de navegador). É onde parte das chaves é gerada e ainda não foi verificada.
2. **Teste de "chave canário":** gerar uma credencial que jamais transite pelas estações de trabalho (apenas servidor, por canal seguro) para confirmar definitivamente que a fonte foi eliminada.
3. **Rotação completa de credenciais** que tenham transitado pelas estações comprometidas (gerenciadores de senha do navegador, painel, provedores).

**Prioridade média**
4. **Limites de gasto (budget cap) e alertas** em todos os provedores de IA — contém o dano de qualquer exposição futura.
5. **Restrição de chave por origem** onde o provedor suportar (ex.: Google permite restrição por IP).
6. **`fail2ban`** como defesa adicional ao firewall.
7. **Substituir FTP (`:21`) por SFTP** e fechar o range de portas passivas.

**Prioridade contínua (processo)**
8. **Gerência de segredos:** adotar cofre dedicado (ex.: Doppler, Infisical ou Secret Manager) — eliminar `.env` em texto plano e a necessidade de copiar chaves manualmente.
9. **Política de manuseio de credenciais:** nunca trafegar chaves por área de transferência, capturas de tela ou canais de chat; nunca manter serviços de automação legados em execução.

---

## 8. Conclusão

O incidente foi **contido** e os **vetores de causa-raiz prováveis foram eliminados**. A investigação demonstrou que **nenhuma das três bases de código** expôs credenciais — a exposição originou-se de **infraestrutura auxiliar legada (n8n) e de uma ferramenta de acesso remoto na estação de desenvolvimento**, ambas já removidas.

As plataformas seguem **operacionais**, com superfície de ataque reduzida (painel administrativo e SSH restritos, permissões de arquivo corrigidas, serviços expostos desativados). As pendências listadas na Seção 7 são **medidas de fortalecimento e de processo**, não falhas ativas em exploração.

Recomenda-se a execução das pendências de prioridade alta e a adoção de um cofre de segredos como medida estrutural definitiva.

---

*Documento técnico de resposta a incidente. As conclusões refletem a evidência disponível na data de emissão; segurança da informação é um processo contínuo e não admite garantia absoluta.*
