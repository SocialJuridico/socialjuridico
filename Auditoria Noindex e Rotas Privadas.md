# Auditoria de Noindex e Rotas Privadas

**Data:** 08 de junho de 2026

## Objetivo

Garantir que páginas privadas, autenticadas, transitórias, duplicadas ou que utilizam tokens não apareçam nos mecanismos de busca.

A estratégia adotada utiliza duas camadas:

1. `robots` por metadata do Next.js;
2. cabeçalho HTTP `X-Robots-Tag` como reforço.

O `robots.txt` não é utilizado como única forma de impedir indexação, pois bloquear o rastreamento pode impedir que o mecanismo de busca encontre a diretiva `noindex`.

---

## 1. Utilitários criados em `src/lib/seo.js`

### `privateRobots`

Aplicado a rotas privadas, autenticadas, documentos e URLs com token:

```text
noindex
nofollow
nocache
noimageindex
max-image-preview: none
max-snippet: 0
max-video-preview: 0
```

### `noIndexFollowRobots`

Aplicado a rotas públicas transitórias ou duplicadas:

```text
noindex
follow
nocache
```

A diferença é importante: páginas privadas não devem transmitir sinais pelos links internos, enquanto páginas transitórias podem permitir que mecanismos sigam links para páginas canônicas.

---

## 2. Rotas protegidas com `privateRobots`

Foram adicionados ou confirmados layouts para:

```text
/login
/login/esqueci-senha
/login-anunciante
/cadastro
/onboarding
/confirmar-email
/atualizar-senha
/dashboard/*
/admin/*
/chat/*
/assinatura/*
/notificacao/*
```

Arquivos principais:

```text
src/app/login/layout.js
src/app/login-anunciante/layout.js
src/app/cadastro/layout.js
src/app/onboarding/layout.js
src/app/confirmar-email/layout.js
src/app/atualizar-senha/layout.js
src/app/dashboard/layout.js
src/app/admin/layout.js
src/app/chat/layout.js
src/app/assinatura/layout.js
src/app/notificacao/layout.js
```

O layout de `/login` também protege automaticamente `/login/esqueci-senha`.

O layout de `/dashboard` protege todos os painéis de cliente, advogado, escritório, anunciante e administrador, inclusive quando existem layouts internos adicionais.

---

## 3. Rotas com `noindex, follow`

Foram tratadas como transitórias ou duplicadas:

```text
/compartilhar
/clientes
/advogados
```

A rota `/compartilhar` utiliza parâmetros para gerar cards sociais e não deve criar milhares de variações indexáveis.

As rotas `/clientes` e `/advogados` utilizam conteúdo antigo e podem competir com a Home e `/sou-advogado`. A recomendação definitiva é redirecioná-las permanentemente:

```text
/clientes   → /
/advogados  → /sou-advogado
```

---

## 4. Reforço com `X-Robots-Tag`

O `next.config.mjs` passou a enviar:

```text
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex
```

para páginas privadas e APIs.

A rota `/compartilhar` utiliza:

```text
X-Robots-Tag: noindex, follow, noarchive, nosnippet, noimageindex
```

Essa camada protege também respostas que não renderizem corretamente metadata HTML por erro, redirecionamento ou comportamento específico do cliente.

---

## 5. Ajuste do `robots.txt`

O arquivo `src/app/robots.js` foi corrigido para não bloquear páginas privadas que possuem `noindex`.

O bloqueio principal ficou restrito a:

```text
/api/
```

Motivo: uma URL bloqueada no `robots.txt` pode permanecer conhecida pelo buscador sem que ele consiga ler a diretiva `noindex` da página.

Dashboards e chats já exigem autenticação, redirecionam usuários não autenticados e também recebem metadata e cabeçalho `noindex`.

---

## 6. Rotas mantidas indexáveis

### `/validar`

O validador de assinaturas foi mantido indexável por ser uma ferramenta pública e potencialmente útil para confiança, navegação de marca e pesquisa institucional.

Os resultados individuais não possuem URLs próprias indexáveis: a consulta acontece no cliente por código informado no formulário.

### `/notificacao-blindada`

A página comercial pública permanece indexável.

A rota individual com token:

```text
/notificacao/[token]
```

recebe `noindex, nofollow`.

---

## 7. Validações recomendadas após o deploy

Executar:

```bash
npm run build
```

Verificar no HTML das rotas privadas:

```html
<meta name="robots" content="noindex, nofollow" />
```

Verificar os cabeçalhos HTTP:

```bash
curl -I https://www.socialjuridico.com.br/login
curl -I https://www.socialjuridico.com.br/dashboard/cliente
curl -I https://www.socialjuridico.com.br/assinatura/teste
curl -I https://www.socialjuridico.com.br/notificacao/teste
curl -I https://www.socialjuridico.com.br/compartilhar
```

Confirmar a presença de:

```text
X-Robots-Tag
```

Verificar também:

```text
https://www.socialjuridico.com.br/robots.txt
https://www.socialjuridico.com.br/sitemap.xml
```

---

## 8. Search Console

Depois do deploy:

1. usar a inspeção de URL para `/login`, `/cadastro` e uma URL de assinatura sem dados reais;
2. confirmar que o Google detecta `noindex`;
3. solicitar remoção temporária apenas se páginas privadas já tiverem sido indexadas;
4. acompanhar o relatório “Excluída pela tag noindex”;
5. não enviar rotas privadas no sitemap.

---

## 9. Observação de segurança

`noindex` não é mecanismo de autorização.

Rotas privadas devem continuar protegidas por:

- autenticação;
- autorização por perfil;
- tokens fortes e expiráveis;
- políticas de banco e armazenamento;
- validação no servidor;
- ausência de dados sensíveis no HTML público.

A função do `noindex` é impedir exibição nos buscadores, não impedir acesso indevido.
