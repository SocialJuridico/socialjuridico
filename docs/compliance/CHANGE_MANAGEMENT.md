# Change Management Policy

**Versao:** 2026-06-16  
**Escopo:** codigo, configuracao, infraestrutura, banco de dados e documentos publicos relevantes.

## 1. Objetivo

Garantir que mudancas na plataforma sejam rastreaveis, revisadas e validadas antes de producao.

## 2. Tipos de mudanca

| Tipo | Exemplos | Evidencia esperada |
|---|---|---|
| Codigo | Rotas, APIs, componentes, middleware | Diff, testes, descricao da mudanca |
| Infra | Cloudflare, VPS, Docker, Nginx | Print/config, justificativa, rollback |
| Banco | Migrations, RLS, tabelas, indices | Migration versionada, plano de rollback |
| Seguranca | Headers, CSP, TLS, auth | Scan, checklist, evidencia antes/depois |
| Documento publico | Termos, Privacidade, Seguranca | Data, aprovador, resumo |

## 3. Checklist minimo antes de producao

- Mudanca tem objetivo claro.
- Arquivos alterados foram revisados.
- Rotas afetadas foram identificadas.
- Dados sensiveis nao foram expostos em logs ou payloads.
- Teste leve ou validacao estatica foi executado quando aplicavel.
- Plano de rollback foi definido.
- Evidencia foi registrada.

## 4. Mudancas emergenciais

Mudancas urgentes podem ser aplicadas com revisao reduzida, mas devem ser regularizadas em ate 48 horas com:

- registro da causa;
- diff aplicado;
- evidencia de validacao;
- analise pos-incidente se houver impacto.

## 5. Evidencia recomendada

Registrar no `EVIDENCE_REGISTER.md`:

- data;
- autor;
- escopo;
- arquivos/servicos alterados;
- validacao feita;
- link de PR, commit ou deploy quando existir.

