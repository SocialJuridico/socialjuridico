# Implementação da Central de Notícias do Social Jurídico

## Instrução principal

Analise o projeto existente do Social Jurídico antes de escrever ou modificar qualquer arquivo. Preserve a arquitetura, os padrões de autenticação, banco de dados, componentes, estilos, APIs, serviços de IA, filas, logs e convenções já utilizados.

Não crie uma aplicação paralela. A Central de Notícias deve ser um novo módulo integrado ao projeto atual, reutilizando a infraestrutura existente sempre que isso não comprometer segurança, desempenho ou manutenção.

O projeto utiliza Next.js, React e Supabase. Confirme as versões e a organização atual antes da implementação. Não instale bibliotecas desnecessárias e não substitua recursos existentes sem justificar tecnicamente.

---

# 1. Objetivo do módulo

Criar uma Central de Notícias pública para o Social Jurídico, acessível antes do login, com foco em:

- aquisição orgânica por mecanismos de busca;
- educação jurídica em linguagem acessível;
- divulgação de notícias e atualizações jurídicas;
- divulgação de novidades reais da plataforma;
- conversão de leitores em usuários cadastrados;
- geração de novos casos para os profissionais da plataforma;
- fortalecimento da autoridade e da marca Social Jurídico;
- compartilhamento fácil das matérias;
- acompanhamento detalhado do desempenho editorial pelo administrador.

A rota principal será:

```text
/noticias
```

A página individual de cada matéria deverá utilizar uma URL amigável:

```text
/noticias/[slug]
```

O banco continuará armazenando um `id` interno. Caso já exista uma exigência técnica para acessar por ID, implemente compatibilidade e redirecionamento permanente para a URL canônica com slug:

```text
/noticias/[id] → 301/308 → /noticias/[slug]
```

Não use IDs UUID na URL pública principal. O slug melhora legibilidade, compartilhamento e organização do conteúdo.

---

# 2. Conceito público

No menu principal, o item poderá ser apresentado como:

```text
Notícias e Direitos
```

A rota permanece `/noticias`.

O módulo não deve parecer um blog genérico ou separado da plataforma. Ele deve funcionar como uma extensão pública do Social Jurídico e conduzir o leitor naturalmente para o cadastro.

Mensagem central:

> Informação jurídica clara, atualizada e conectada a profissionais.

---

# 3. Arquitetura de rotas

## 3.1 Rotas públicas

```text
/noticias
/noticias/[slug]
/noticias/categoria/[slug]
/noticias/busca
/noticias/autor/[slug]              # opcional
/noticias/tag/[slug]                # opcional, somente se houver utilidade real
```

## 3.2 Rotas administrativas

Integrar ao painel existente em `/dashboard/admin`.

```text
/dashboard/admin/noticias
/dashboard/admin/noticias/nova
/dashboard/admin/noticias/[id]
/dashboard/admin/noticias/rascunhos
/dashboard/admin/noticias/agendadas
/dashboard/admin/noticias/publicadas
/dashboard/admin/noticias/fontes
/dashboard/admin/noticias/automacao
/dashboard/admin/noticias/metricas
/dashboard/admin/noticias/configuracoes
/dashboard/admin/noticias/logs
```

A navegação administrativa deve aparecer dentro do padrão visual e estrutural já utilizado pelo painel do Social Jurídico.

## 3.3 APIs ou Server Actions sugeridas

Adapte ao padrão existente do projeto:

```text
/api/noticias
/api/noticias/[id]
/api/noticias/[id]/publicar
/api/noticias/[id]/agendar
/api/noticias/[id]/arquivar
/api/noticias/[id]/revisar
/api/noticias/[id]/compartilhar
/api/noticias/[id]/eventos
/api/noticias/gerar
/api/noticias/automacao/executar
/api/noticias/metricas
/api/noticias/fontes
```

Não exponha endpoints administrativos sem autenticação e autorização por função.

---

# 4. Tipos editoriais obrigatórios

A IA deverá tentar produzir até três matérias por dia, seguindo esta ordem editorial.

## 4.1 Matéria 1: notícia jurídica real

Objetivo:

- novidades do mundo jurídico;
- alterações legislativas;
- jurisprudências relevantes;
- decisões importantes;
- mudanças em regras ou procedimentos;
- comunicados de órgãos oficiais;
- alertas jurídicos de interesse público.

Exemplos de fontes prioritárias:

- legislação oficial;
- Diário Oficial;
- Planalto;
- STF;
- STJ;
- CNJ;
- tribunais;
- Câmara dos Deputados;
- Senado Federal;
- ministérios;
- Receita Federal;
- INSS;
- Banco Central;
- Procon e órgãos públicos reconhecidos.

Regras obrigatórias:

1. Não inventar decisões, processos, números, datas, leis, súmulas, teses ou citações.
2. Utilizar fonte primária oficial sempre que disponível.
3. Salvar a URL, o órgão, a data de acesso e um resumo da evidência utilizada.
4. Sempre que a informação depender de interpretação, deixar isso explícito.
5. Não publicar automaticamente quando a fonte não puder ser validada.
6. Não transformar uma decisão específica em regra geral.
7. Informar tribunal, órgão julgador, data e identificação do processo somente quando confirmados.
8. Diferenciar decisão definitiva, decisão provisória, notícia institucional e projeto de lei.
9. Projeto de lei nunca deve ser apresentado como lei vigente.
10. Matéria antiga não pode ser apresentada como novidade.

## 4.2 Matéria 2: conteúdo educativo e informativo

Objetivo:

- explicar direitos e procedimentos;
- responder dúvidas frequentes;
- apresentar exemplos fictícios;
- ensinar quais informações e documentos normalmente precisam ser reunidos;
- demonstrar quando procurar orientação profissional.

Exemplo de pauta:

> “Fulana, grávida, foi demitida quando voltou da licença-maternidade. O que pode fazer e como proceder?”

Regras obrigatórias:

1. Informar claramente que personagens e situações são fictícios.
2. Não usar nomes de pessoas reais sem autorização.
3. Não prometer resultado.
4. Não declarar que o leitor “ganhará uma ação”.
5. Usar linguagem simples, mas juridicamente responsável.
6. Explicar que detalhes do contrato, datas, provas e circunstâncias podem alterar a análise.
7. Incluir checklist prático.
8. Incluir perguntas frequentes.
9. Incluir aviso de caráter informativo.
10. Direcionar o leitor para cadastrar seu caso no Social Jurídico.

## 4.3 Matéria 3: novidades do Social Jurídico

Objetivo:

- anunciar novas funcionalidades;
- explicar ferramentas;
- divulgar integrações;
- comunicar melhorias;
- apresentar parcerias;
- ensinar a usar recursos da plataforma;
- comunicar atualizações relevantes aos usuários.

Regra crítica:

A IA não pode inventar novidades da plataforma.

Uma matéria desse tipo só poderá ser criada quando existir pelo menos uma fonte interna aprovada, como:

- release note;
- atualização cadastrada pelo administrador;
- issue ou PR marcado como publicado;
- comunicado interno aprovado;
- registro de nova funcionalidade;
- campanha cadastrada;
- anúncio oficial da administração.

Caso não exista uma novidade real e aprovada naquele dia, a terceira matéria deverá permanecer como `NÃO GERADA`, sem fabricar assunto. Opcionalmente, poderá ser substituída por um guia de uso de funcionalidade já existente, desde que os dados estejam confirmados na base interna.

---

# 5. Frequência e agenda editorial

A IA deverá tentar gerar e publicar até três matérias por dia, quando houver conteúdo válido.

Horários sugeridos no fuso `America/Sao_Paulo`:

```text
08:00 — notícia jurídica real
13:00 — conteúdo educativo
18:00 — novidade do Social Jurídico
```

Os horários devem ser configuráveis no painel.

Regras:

- não publicar apenas para cumprir quantidade;
- qualidade e veracidade são superiores à meta de três matérias;
- se não houver fonte confiável, não publicar;
- evitar assuntos repetidos;
- verificar similaridade com matérias existentes;
- impedir duas matérias com a mesma intenção de pesquisa;
- permitir desativar uma categoria;
- permitir pausar toda a automação;
- permitir geração manual;
- permitir reagendamento;
- registrar motivo quando uma geração for ignorada ou falhar.

Caso o agendador existente suporte timezone, utilizar `America/Sao_Paulo`. Caso utilize apenas UTC, converter corretamente e documentar a configuração.

---

# 6. Fluxo editorial da IA

Implementar um agente editorial separado das demais IAs da plataforma.

Nome interno sugerido:

```text
Agente Editorial Social Jurídico
```

A infraestrutura de IA existente pode ser reutilizada, mas o agente deverá possuir:

- prompt de sistema próprio;
- limites próprios;
- chave ou orçamento lógico separado;
- logs próprios;
- métricas de custo;
- regras editoriais;
- lista de fontes permitidas;
- controle de versões;
- validação antes da publicação.

## 6.1 Pipeline obrigatório

```text
1. Selecionar o tipo de matéria
2. Buscar ou receber fontes autorizadas
3. Validar atualidade e confiabilidade
4. Verificar duplicidade
5. Definir palavra-chave e intenção de busca
6. Criar pauta e estrutura
7. Gerar rascunho
8. Validar fatos, datas, nomes e referências
9. Humanizar o texto
10. Gerar SEO e dados estruturados
11. Gerar ou selecionar imagem de capa
12. Adicionar links internos
13. Adicionar CTA de cadastro
14. Executar validações editoriais
15. Publicar, agendar ou enviar para revisão
16. Registrar custo, modelo, fontes e resultado
```

## 6.2 Estados editoriais

```text
IDEIA
COLETANDO_FONTES
GERANDO
RASCUNHO_IA
AGUARDANDO_REVISAO
APROVADO
AGENDADO
PUBLICADO
PAUSADO
REJEITADO
ARQUIVADO
FALHA
```

## 6.3 Política de publicação

Criar uma configuração por categoria:

```text
AUTO_PUBLICAR
EXIGIR_REVISAO
DESATIVADO
```

Configuração inicial recomendada:

```text
Notícia jurídica real: EXIGIR_REVISAO
Conteúdo educativo: EXIGIR_REVISAO
Novidade da plataforma: EXIGIR_REVISAO
```

Depois de validar o fluxo, o administrador poderá habilitar autopublicação para conteúdos educativos de baixo risco e novidades baseadas em releases aprovados.

Nunca autopublicar:

- conteúdo sem fontes;
- matéria com conflito entre fontes;
- decisão judicial não confirmada;
- conteúdo com dados pessoais;
- conteúdo com valores, prazos ou regras sem validação;
- conteúdo sinalizado por baixa confiança;
- conteúdo com possível orientação jurídica individual;
- novidade da plataforma sem fonte interna;
- conteúdo potencialmente difamatório.

---

# 7. DNA editorial

Criar um arquivo ou configuração persistente equivalente a:

```text
/noticias/DNA.md
```

Ou armazenar a estratégia no banco, caso essa seja a convenção do projeto.

O DNA deve conter:

- descrição do Social Jurídico;
- público-alvo;
- objetivos de conversão;
- tom de voz;
- temas prioritários;
- temas proibidos;
- especialidades jurídicas;
- palavras-chave;
- regras de linguagem;
- regras de citação;
- fontes autorizadas;
- CTAs permitidos;
- links internos importantes;
- funcionalidades reais da plataforma;
- avisos jurídicos obrigatórios;
- identidade visual;
- frequência editorial;
- responsáveis pela revisão.

A IA deve ler o DNA antes de cada geração.

Tom de voz:

- profissional;
- acolhedor;
- direto;
- educativo;
- responsável;
- sem juridiquês desnecessário;
- sem sensacionalismo;
- sem clickbait enganoso;
- sem promessas;
- sem linguagem genérica de IA;
- em português do Brasil.

---

# 8. Estrutura obrigatória das matérias

Cada matéria deverá possuir:

```text
Título
Slug
Subtítulo ou resumo
Imagem de capa
Categoria
Tipo editorial
Especialidade jurídica
Autor
Revisor
Data de publicação
Data da última atualização
Tempo de leitura
Palavra-chave principal
Palavras-chave secundárias
Corpo
Fontes
Perguntas frequentes
Aviso jurídico
CTA
Matérias relacionadas
Metadados sociais
Dados estruturados
```

## 8.1 Estrutura textual

```text
1. Título claro
2. Resumo inicial com resposta direta
3. Contextualização
4. Desenvolvimento dividido em H2 e H3
5. Explicação prática
6. Lista ou passo a passo
7. Cuidados e exceções
8. Perguntas frequentes
9. Fontes consultadas
10. Aviso informativo
11. CTA para cadastro
12. Matérias relacionadas
```

Para matérias educativas com exemplos fictícios, inserir perto do início:

> Os nomes e a situação apresentados neste exemplo são fictícios e servem apenas para explicar o tema.

## 8.2 Aviso jurídico padrão

Adicionar ao final:

> Este conteúdo possui caráter exclusivamente informativo e não substitui a análise individual de um profissional. Leis, decisões e procedimentos podem variar conforme os fatos, documentos, datas e circunstâncias de cada caso.

Permitir que o administrador edite esse texto globalmente.

---

# 9. CTA obrigatório e conversão

Toda matéria deve terminar com um convite para cadastro.

CTA principal sugerido:

> Está passando por uma situação parecida? Cadastre-se gratuitamente no Social Jurídico, conte o que aconteceu e encontre profissionais que possam analisar seu caso.

Botões:

```text
Cadastrar-se gratuitamente
Publicar meu caso
Conhecer o Social Jurídico
```

O CTA deve direcionar para o fluxo correto já existente na plataforma e incluir parâmetros de origem:

```text
?utm_source=noticias
&utm_medium=conteudo
&utm_campaign=[slug]
&utm_content=cta_final
```

Também incluir um CTA contextual no meio da matéria, depois de aproximadamente 40% a 60% do conteúdo, sem interromper excessivamente a leitura.

Não utilizar popups agressivos que prejudiquem experiência, acessibilidade ou indexação.

Eventos obrigatórios:

```text
news_cta_view
news_cta_click
news_signup_start
news_signup_complete
news_case_start
news_case_published
```

Associar conversões ao artigo de origem sem expor informações jurídicas sensíveis no sistema de analytics.

---

# 10. Design da rota `/noticias`

Preservar a identidade visual do Social Jurídico.

Paleta de referência:

```text
Azul-marinho: #0F2340
Dourado: #C9973C
Branco
Cinzas neutros para superfícies e textos
```

Antes de aplicar, verificar tokens e variáveis já existentes no projeto.

## 10.1 Cabeçalho

Utilizar o cabeçalho público atual da plataforma, antes da área de login.

Adicionar o item:

```text
Notícias e Direitos
```

## 10.2 Hero

O hero deve conter:

- título forte;
- subtítulo;
- campo de pesquisa;
- matéria em destaque;
- categorias principais;
- CTA discreto para cadastro.

Sugestão de texto:

```text
Informação jurídica para decisões mais seguras

Acompanhe notícias, entenda seus direitos e descubra os próximos passos para cada situação.
```

## 10.3 Conteúdo da página

Ordem sugerida:

```text
1. Hero
2. Matéria principal em destaque
3. Últimas notícias
4. Categorias
5. Direitos trabalhistas
6. Direito do consumidor
7. Família e sucessões
8. Previdenciário
9. Golpes e segurança digital
10. Novidades do Social Jurídico
11. Matérias mais lidas
12. CTA institucional
```

Não exibir uma seção vazia. Renderizar somente categorias com conteúdo.

## 10.4 Cards

Cada card deve exibir:

- imagem 16:9;
- categoria;
- tipo de matéria;
- título;
- resumo curto;
- data;
- tempo de leitura;
- indicador de atualização, quando aplicável;
- link acessível para a matéria.

Layout:

```text
Desktop: 3 colunas
Tablet: 2 colunas
Mobile: 1 coluna
```

O card inteiro pode ser clicável, mas os elementos devem manter semântica e acessibilidade.

Estados:

- hover elegante;
- foco visível;
- skeleton durante carregamento;
- fallback de imagem;
- indicador “Novo” apenas quando realmente recente;
- sem animações excessivas.

## 10.5 Filtros

Implementar:

- busca textual;
- categoria;
- especialidade;
- tipo editorial;
- período;
- mais recentes;
- mais acessadas.

No mobile, usar filtros em drawer ou modal acessível.

## 10.6 Paginação

Preferir paginação indexável:

```text
/noticias?page=2
```

Não depender apenas de rolagem infinita. Se houver “carregar mais”, preservar URLs e navegação acessível.

---

# 11. Design da página individual

A página `/noticias/[slug]` deve conter:

- breadcrumb;
- categoria;
- título;
- subtítulo;
- autor e revisor;
- data de publicação;
- data de atualização;
- tempo de leitura;
- imagem de capa;
- compartilhamento;
- índice da matéria para textos longos;
- conteúdo;
- fontes;
- aviso jurídico;
- CTA;
- matérias relacionadas.

## 11.1 Leitura

Recomendações:

- largura do corpo entre aproximadamente 720 e 820 pixels;
- tipografia confortável;
- line-height amplo;
- H2 e H3 com hierarquia clara;
- parágrafos curtos;
- listas bem espaçadas;
- destaques e callouts;
- contraste compatível com acessibilidade;
- imagens com `alt` descritivo;
- links visualmente identificáveis;
- foco de teclado visível.

## 11.2 Compartilhamento

No desktop:

- barra lateral discreta ou bloco próximo ao título.

No mobile:

- botão nativo “Compartilhar”;
- barra fixa inferior opcional, desde que não cubra conteúdo;
- botão “Copiar link”.

Opções:

- compartilhamento nativo do dispositivo;
- WhatsApp;
- Facebook;
- LinkedIn;
- X;
- Telegram;
- e-mail;
- copiar link.

Sempre implementar fallback quando a API nativa não estiver disponível.

---

# 12. Sistema de links compartilháveis

Cada matéria deve possuir URL canônica pública:

```text
https://www.socialjuridico.com.br/noticias/[slug]
```

Ao compartilhar, criar links rastreáveis:

```text
/noticias/[slug]?utm_source=share&utm_medium=whatsapp
/noticias/[slug]?utm_source=share&utm_medium=facebook
/noticias/[slug]?utm_source=share&utm_medium=linkedin
/noticias/[slug]?utm_source=share&utm_medium=copy_link
```

Opcionalmente, criar links curtos internos:

```text
/s/[code]
```

O redirecionamento deverá:

1. registrar o canal;
2. registrar a matéria;
3. incrementar o evento de compartilhamento;
4. redirecionar para a URL canônica;
5. preservar UTMs;
6. não prejudicar SEO.

Implementar:

```javascript
navigator.share({
  title,
  text: excerpt,
  url: shareUrl
})
```

Adicionar fallback para `navigator.clipboard.writeText()` e links específicos por plataforma.

Não incluir dados pessoais ou identificadores sensíveis nos links.

---

# 13. SEO técnico

O SEO deve ser forte, mas baseado em utilidade, autoridade, rastreabilidade e qualidade. Não usar keyword stuffing, conteúdo duplicado ou páginas criadas apenas para manipular mecanismos de busca.

## 13.1 Metadados

Cada matéria deverá gerar dinamicamente:

- `title`;
- `description`;
- canonical;
- robots;
- Open Graph;
- Twitter/X Card;
- imagem social;
- autores;
- data de publicação;
- data de modificação;
- categoria;
- palavras-chave quando compatível com o padrão do projeto.

Utilizar o sistema de Metadata do App Router.

Exemplo de título:

```text
Título da matéria | Social Jurídico
```

## 13.2 Open Graph

Cada matéria deve possuir:

- título;
- descrição;
- URL;
- imagem 1200x630;
- nome do site;
- locale `pt_BR`;
- tipo `article`;
- data de publicação;
- data de atualização.

Gerar imagem social dinâmica quando não houver imagem cadastrada.

## 13.3 Dados estruturados

Utilizar JSON-LD.

Tipos:

```text
NewsArticle — notícias jurídicas reais
Article — conteúdos educativos
BlogPosting ou NewsArticle — novidades da plataforma
BreadcrumbList — navegação
Organization — dados institucionais
WebSite — página principal
```

Campos recomendados:

```text
headline
description
image
datePublished
dateModified
author
publisher
mainEntityOfPage
articleSection
keywords
```

O conteúdo do JSON-LD precisa corresponder ao conteúdo visível.

## 13.4 Sitemap

Criar sitemap dinâmico incluindo apenas matérias publicadas e indexáveis.

```text
/sitemap.xml
/sitemap-noticias.xml
```

Incluir:

- URL;
- data de modificação;
- prioridade coerente;
- frequência coerente.

Não incluir rascunhos, previews, páginas administrativas, buscas internas ou conteúdos arquivados.

## 13.5 Robots

Permitir:

```text
/noticias
/noticias/*
```

Bloquear:

```text
/dashboard/admin/*
/api/noticias/admin/*
/noticias/preview/*
```

Configurar referência ao sitemap.

## 13.6 Canonical

Cada matéria possui uma única URL canônica.

Parâmetros de compartilhamento, UTMs, preview e filtros não devem criar páginas canônicas diferentes.

## 13.7 Indexação

- páginas públicas devem renderizar conteúdo indexável no servidor;
- não esconder o texto principal atrás de login;
- evitar depender exclusivamente de JavaScript no cliente;
- retornar `404` para matéria inexistente;
- retornar `410` quando um conteúdo for removido definitivamente, quando apropriado;
- redirecionar slug antigo para novo slug;
- não reutilizar slug de matéria removida sem controle;
- utilizar `noindex` em previews, resultados internos de busca frágeis e páginas administrativas.

## 13.8 Links internos

O agente deve sugerir e adicionar links para:

- matérias relacionadas;
- páginas de funcionalidades;
- páginas institucionais;
- cadastro;
- publicação de caso;
- categorias.

Não criar links para páginas inexistentes.

## 13.9 Conteúdo para busca e assistentes de IA

O conteúdo deve:

- responder diretamente à pergunta no início;
- conter definições autocontidas;
- usar headings descritivos;
- apresentar passos numerados;
- apresentar fontes;
- incluir data de atualização;
- separar fatos de interpretação;
- evitar frases vagas;
- incluir perguntas frequentes;
- mostrar autoria e revisão;
- fornecer contexto suficiente para trechos isolados serem compreendidos.

Não criar centenas de variações artificiais da mesma pauta.

---

# 14. Banco de dados sugerido

Adapte os nomes e tipos ao padrão existente.

## 14.1 `news_articles`

```text
id
title
slug
subtitle
excerpt
content
content_format
cover_image_url
cover_image_alt
category_id
editorial_type
legal_specialty
status
author_id
reviewed_by
published_at
scheduled_at
updated_at
created_at
seo_title
seo_description
primary_keyword
secondary_keywords
canonical_url
reading_time
is_featured
allow_indexing
ai_generated
ai_model
ai_cost
ai_confidence
generation_job_id
cta_variant
source_release_id
```

## 14.2 `news_categories`

```text
id
name
slug
description
icon
display_order
is_active
```

## 14.3 `news_sources`

```text
id
article_id
title
organization
url
source_type
published_at
accessed_at
evidence_summary
is_primary
is_verified
content_hash
```

## 14.4 `news_revisions`

```text
id
article_id
version
content
metadata
changed_by
change_type
created_at
```

## 14.5 `news_generation_jobs`

```text
id
editorial_type
status
scheduled_for
started_at
finished_at
model
prompt_version
tokens_input
tokens_output
estimated_cost
failure_reason
validation_result
article_id
created_at
```

## 14.6 `news_events`

```text
id
article_id
event_type
session_id
anonymous_visitor_id
source
medium
campaign
referrer
device_type
created_at
metadata
```

Não armazenar conteúdo jurídico sensível ou texto do caso dentro dos eventos.

## 14.7 `news_share_links`

```text
id
article_id
code
channel
clicks
created_at
expires_at
```

## 14.8 `news_redirects`

```text
id
old_slug
new_slug
article_id
status_code
created_at
```

## 14.9 `platform_release_notes`

```text
id
title
description
feature_name
version
status
approved_by
approved_at
published_at
source_reference
allow_ai_article
```

A IA só poderá produzir novidade da plataforma com base em registro aprovado.

---

# 15. Segurança e permissões

## 15.1 Administração

Somente usuários com função administrativa autorizada poderão:

- criar;
- editar;
- aprovar;
- publicar;
- agendar;
- arquivar;
- excluir;
- configurar automação;
- cadastrar fontes;
- visualizar logs;
- visualizar métricas internas;
- alterar o DNA editorial.

Aplicar autorização no servidor. Não confiar apenas em ocultação de botões.

## 15.2 Supabase

Criar políticas RLS apropriadas:

- público lê apenas matérias `PUBLICADO`;
- público lê somente categorias ativas;
- administrador autorizado gerencia conteúdos;
- serviços internos gerenciam filas e eventos;
- rascunhos e fontes privadas não ficam acessíveis publicamente.

## 15.3 Conteúdo

- sanitizar HTML;
- impedir scripts e atributos perigosos;
- validar links;
- bloquear `javascript:`;
- sanitizar conteúdo gerado por IA;
- proteger uploads;
- validar MIME type;
- limitar tamanho de imagens;
- registrar revisão;
- manter histórico;
- não renderizar MDX arbitrário vindo do banco sem pipeline seguro.

## 15.4 Eventos e métricas

- aplicar rate limit;
- deduplicar eventos;
- ignorar bots conhecidos nas métricas internas;
- não armazenar IP completo;
- respeitar consentimento e política de privacidade;
- não enviar dados de casos a ferramentas externas de analytics;
- não expor IDs internos desnecessários.

---

# 16. Painel administrativo

Criar uma área completa em:

```text
/dashboard/admin/noticias
```

## 16.1 Visão geral

Cards de resumo:

```text
Visualizações hoje
Usuários únicos
Matérias publicadas
Matérias agendadas
Rascunhos aguardando revisão
Cliques em cadastro
Cadastros originados
Casos publicados originados
Compartilhamentos
Taxa de conversão
Tempo médio de leitura
Custo de IA no período
Falhas de automação
```

## 16.2 Fluxo de acessos

Exibir funil:

```text
Impressão do card
→ clique na matéria
→ leitura iniciada
→ 50% de leitura
→ CTA visualizado
→ CTA clicado
→ cadastro iniciado
→ cadastro concluído
→ caso iniciado
→ caso publicado
```

Calcular conversão por etapa.

## 16.3 Métricas editoriais

- matérias mais acessadas;
- matérias menos acessadas;
- mais compartilhadas;
- maior tempo médio de leitura;
- maior profundidade de scroll;
- maior taxa de clique no CTA;
- maior número de cadastros;
- maior número de casos publicados;
- desempenho por categoria;
- desempenho por especialidade;
- desempenho por tipo editorial;
- desempenho por autor;
- desempenho por período;
- matérias sem acesso;
- matérias que perderam tráfego;
- conteúdos com necessidade de atualização.

## 16.4 Métricas de aquisição

- origem;
- mídia;
- campanha;
- termo, quando disponível;
- referrer;
- busca orgânica;
- acesso direto;
- redes sociais;
- compartilhamento;
- dispositivo;
- navegador;
- país/estado/cidade apenas quando permitido e agregado.

## 16.5 Métricas da IA

- gerações realizadas;
- publicações realizadas;
- matérias ignoradas;
- falhas;
- custo por matéria;
- tokens;
- modelo usado;
- tempo de geração;
- confiança;
- taxa de aprovação;
- taxa de rejeição;
- motivos de rejeição;
- fontes usadas;
- duplicidades bloqueadas.

## 16.6 Search Console

Preparar integração ou área para importar:

- cliques;
- impressões;
- CTR;
- posição média;
- consultas;
- páginas;
- evolução por matéria;
- páginas não indexadas;
- erros de indexação.

Não bloquear o lançamento caso a integração ainda não exista. Estruturar o módulo para recebê-la depois.

## 16.7 Visualizações do painel

Usar:

- linha temporal;
- barras;
- funil;
- tabela ordenável;
- filtros;
- comparação de períodos;
- exportação CSV;
- exportação PDF opcional.

Filtros:

```text
Hoje
7 dias
30 dias
90 dias
Período personalizado
Categoria
Tipo editorial
Especialidade
Autor
Status
Origem
Dispositivo
```

---

# 17. Eventos de analytics

Eventos mínimos:

```text
news_list_view
news_card_impression
news_card_click
news_article_view
news_article_read_25
news_article_read_50
news_article_read_75
news_article_read_100
news_time_30s
news_time_60s
news_source_click
news_related_click
news_share_open
news_share_complete
news_copy_link
news_cta_view
news_cta_click
news_signup_start
news_signup_complete
news_case_start
news_case_published
news_search
news_filter
```

Regras:

- evitar disparar o mesmo evento repetidamente;
- usar sessão anônima;
- associar artigo e campanha;
- registrar consentimento quando aplicável;
- não enviar conteúdo digitado pelo usuário;
- não registrar dados do caso nas métricas editoriais.

---

# 18. Editor administrativo

O administrador deverá poder:

- criar matéria manual;
- gerar com IA;
- editar título;
- editar slug;
- editar resumo;
- editar corpo;
- selecionar categoria;
- selecionar especialidade;
- cadastrar fontes;
- visualizar preview;
- comparar versões;
- aprovar;
- rejeitar;
- agendar;
- publicar;
- despublicar;
- arquivar;
- definir destaque;
- configurar SEO;
- editar imagem e `alt`;
- testar compartilhamento;
- visualizar dados estruturados;
- visualizar CTA;
- ver validações;
- solicitar nova versão da IA.

O editor deve possuir autosave e alerta de alterações não salvas.

Não permitir publicação quando faltarem campos obrigatórios.

---

# 19. Validações antes de publicar

Criar checklist automático:

```text
[ ] título preenchido
[ ] slug válido e único
[ ] resumo preenchido
[ ] imagem válida
[ ] texto alternativo preenchido
[ ] categoria preenchida
[ ] tipo editorial preenchido
[ ] palavra-chave definida
[ ] meta title válido
[ ] meta description válida
[ ] canonical válida
[ ] fonte validada quando exigida
[ ] datas confirmadas
[ ] nomes e órgãos confirmados
[ ] links válidos
[ ] nenhum conteúdo duplicado
[ ] aviso jurídico presente
[ ] CTA presente
[ ] JSON-LD válido
[ ] matéria relacionada disponível quando possível
[ ] revisão concluída quando exigida
```

Notícia jurídica real não pode ser publicada sem fonte.

Novidade da plataforma não pode ser publicada sem release aprovado.

---

# 20. Imagens

Cada matéria deverá possuir imagem de capa.

Possibilidades:

- imagem cadastrada pelo administrador;
- imagem institucional;
- composição gerada a partir de template;
- imagem gerada por IA;
- imagem de fonte oficial, apenas quando houver direito de uso.

Regras:

- não usar imagem protegida sem autorização;
- não mostrar pessoas reais em situação fictícia sem consentimento;
- evitar símbolos jurídicos genéricos repetitivos;
- manter identidade visual;
- gerar versões responsivas;
- otimizar peso;
- utilizar componente de imagem do Next.js;
- cadastrar texto alternativo;
- não inserir título completo dentro da imagem;
- criar proporções para card e Open Graph.

Para jurisprudência e notícias institucionais, priorizar layouts editoriais com marca, tribunal, tema e elementos abstratos, evitando retratos falsos de pessoas envolvidas.

---

# 21. Performance

- utilizar Server Components quando adequado;
- reduzir JavaScript no cliente;
- carregar imagens responsivamente;
- usar lazy loading abaixo da dobra;
- evitar consultas N+1;
- paginar resultados;
- cachear matérias publicadas;
- invalidar cache ao publicar ou atualizar;
- usar índices no banco;
- não carregar conteúdo completo na listagem;
- armazenar metadados separados do corpo;
- medir Core Web Vitals;
- evitar scripts de analytics bloqueando a renderização.

Criar índices para:

```text
slug
status
published_at
category_id
editorial_type
legal_specialty
is_featured
```

---

# 22. Acessibilidade

Atender, no mínimo:

- navegação por teclado;
- foco visível;
- contraste;
- hierarquia de headings;
- `aria-label` em ícones;
- texto alternativo;
- botões com nomes acessíveis;
- modais com foco controlado;
- links distinguíveis;
- tamanho mínimo de toque no mobile;
- respeito a `prefers-reduced-motion`;
- mensagens de erro compreensíveis;
- formulário de busca com label.

---

# 23. Busca interna

A busca deverá pesquisar:

- título;
- resumo;
- conteúdo;
- categoria;
- especialidade;
- palavras-chave.

Começar com busca textual do banco, aproveitando recursos já disponíveis no Supabase/PostgreSQL.

Requisitos:

- debounce;
- estado vazio;
- sugestões;
- termos destacados;
- paginação;
- analytics de termos;
- não indexar páginas frágeis de resultados internos;
- não expor rascunhos.

---

# 24. Matérias relacionadas

Relacionar por:

- categoria;
- especialidade;
- palavras-chave;
- similaridade semântica, quando disponível;
- links internos definidos pelo administrador.

Exibir de três a seis matérias.

Evitar relacionar:

- matéria arquivada;
- conteúdo não publicado;
- a própria matéria;
- conteúdo duplicado.

---

# 25. Atualização e manutenção de conteúdo

Criar rotina semanal para identificar:

- conteúdo antigo;
- datas desatualizadas;
- links quebrados;
- fonte removida;
- jurisprudência superada;
- mudança legislativa;
- páginas com queda de tráfego;
- conteúdo sem conversão;
- matéria sem links internos;
- matéria sem imagem;
- conteúdo duplicado.

O sistema poderá gerar sugestões, mas alterações jurídicas relevantes devem voltar para revisão.

Exibir:

```text
Atualizado em DD/MM/AAAA
```

Manter também a data original de publicação.

---

# 26. Observabilidade

Registrar:

- execução do cron;
- etapa atual;
- duração;
- falha;
- retry;
- fonte consultada;
- modelo;
- tokens;
- custo;
- artigo gerado;
- validações;
- publicação;
- revalidação de cache.

Implementar retry com limite e backoff.

Não executar gerações duplicadas para o mesmo horário.

Utilizar chave de idempotência:

```text
editorial_type + scheduled_date + scheduled_slot
```

Criar alertas administrativos para:

- três falhas consecutivas;
- custo acima do limite;
- ausência de fontes;
- fila parada;
- artigo preso em geração;
- erro de publicação;
- sitemap não atualizado.

---

# 27. Custos e limites de IA

No painel, permitir configurar:

- modelo por etapa;
- limite diário;
- limite mensal;
- custo máximo por artigo;
- tamanho máximo;
- número de tentativas;
- modo de revisão;
- autopublicação;
- horários;
- categorias ativas.

Estratégia recomendada:

```text
Modelo econômico: classificação, resumo e deduplicação
Modelo intermediário: redação inicial
Modelo mais forte: validação final somente quando necessário
```

Salvar estimativa e custo real quando disponível.

Ao atingir o limite:

- pausar novas gerações;
- alertar administrador;
- não prejudicar matérias já publicadas;
- permitir geração manual autorizada.

---

# 28. Critérios de aceite

A implementação só será considerada concluída quando:

1. `/noticias` estiver pública e responsiva.
2. Cards abrirem matérias individuais.
3. A URL pública utilizar slug.
4. O administrador gerenciar matérias pelo dashboard.
5. Houver fluxo de rascunho, revisão, agendamento e publicação.
6. A IA suportar os três tipos editoriais.
7. A automação tentar três matérias diárias quando possível.
8. Notícias reais exigirem fontes validadas.
9. Novidades da plataforma exigirem release aprovado.
10. Toda matéria possuir CTA.
11. Compartilhamento nativo e fallback funcionarem.
12. Links compartilháveis registrarem métricas.
13. Metadados, Open Graph e JSON-LD forem gerados.
14. Sitemap e robots incluírem as rotas corretas.
15. O painel mostrar acessos, cliques, leitura, compartilhamento e conversão.
16. O funil até cadastro e publicação de caso funcionar.
17. RLS, autenticação e autorização estiverem protegidas.
18. O conteúdo estiver sanitizado.
19. A solução passar pelo build e testes.
20. Não houver regressões nas rotas atuais.
21. Acessibilidade básica estiver validada.
22. O administrador puder pausar a automação.
23. Custos e falhas de IA forem registrados.
24. O projeto possuir documentação de configuração e operação.

---

# 29. Testes obrigatórios

## Unitários

- geração de slug;
- cálculo de tempo de leitura;
- montagem de metadata;
- montagem de JSON-LD;
- construção de link compartilhável;
- validação editorial;
- deduplicação;
- permissões;
- transição de status.

## Integração

- criar rascunho;
- adicionar fontes;
- aprovar;
- agendar;
- publicar;
- atualizar sitemap;
- registrar evento;
- converter CTA;
- redirecionar slug antigo;
- bloquear usuário não administrador.

## End-to-end

- visitante acessa `/noticias`;
- filtra categoria;
- abre card;
- lê matéria;
- compartilha;
- clica no CTA;
- inicia cadastro;
- administrador visualiza conversão;
- administrador gera e publica matéria;
- automação falha com fonte inválida e não publica.

---

# 30. Entrega esperada do Claude

Antes de implementar:

1. audite a arquitetura atual;
2. identifique os arquivos e serviços reaproveitáveis;
3. apresente um plano curto;
4. não recrie recursos existentes;
5. preserve o design atual.

Durante a implementação:

- faça alterações modulares;
- mantenha tipagem;
- evite arquivos gigantes;
- utilize componentes reutilizáveis;
- documente decisões;
- trate erros;
- não deixe mocks na produção;
- não exponha segredos;
- rode lint, testes e build.

Ao finalizar, entregar:

```text
Resumo do que foi criado
Arquivos adicionados
Arquivos alterados
Migrações do banco
Variáveis de ambiente
Configuração do agendador
Configuração da IA
Configuração de analytics
Rotas públicas
Rotas administrativas
Políticas de segurança
Testes executados
Pendências
Como validar localmente
Como publicar em produção
```

Não afirmar que algo está funcionando sem executar as validações possíveis.

---

# 31. Ordem recomendada de implementação

## Fase 1 — Fundação

- banco;
- categorias;
- matérias;
- fontes;
- revisões;
- permissões;
- CRUD administrativo.

## Fase 2 — Experiência pública

- `/noticias`;
- cards;
- categorias;
- busca;
- `/noticias/[slug]`;
- CTA;
- relacionados;
- responsividade.

## Fase 3 — SEO e compartilhamento

- metadata;
- Open Graph;
- JSON-LD;
- sitemap;
- robots;
- canonical;
- share;
- links rastreáveis.

## Fase 4 — Analytics

- eventos;
- funil;
- métricas;
- dashboard;
- UTMs;
- conversões.

## Fase 5 — IA editorial

- DNA;
- agente;
- fontes;
- geração;
- validação;
- revisão;
- custos;
- logs.

## Fase 6 — Automação

- cron;
- três horários;
- idempotência;
- retry;
- alertas;
- pausa;
- limites.

## Fase 7 — Evoluções

- Search Console;
- atualização automática;
- recomendação semântica;
- testes de CTA;
- newsletter;
- notificações;
- RSS;
- Google News, caso o projeto cumpra os requisitos editoriais aplicáveis.

---

# 32. Regra final

A Central de Notícias deve gerar tráfego, mas seu objetivo de negócio é converter informação em relacionamento com a plataforma.

O fluxo principal deve permanecer mensurável:

```text
Pesquisa ou compartilhamento
→ matéria
→ leitura
→ CTA
→ cadastro
→ publicação de caso
→ conexão com profissional
```

Não sacrificar veracidade, confiança, segurança jurídica, experiência do usuário ou reputação do Social Jurídico para cumprir a meta de três matérias por dia.
