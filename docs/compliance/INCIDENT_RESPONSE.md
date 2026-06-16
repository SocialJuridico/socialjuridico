# Incident Response Plan

**Versao:** 2026-06-16  
**Dono do processo:** Administracao do Social Juridico

## 1. Objetivo

Definir um processo minimo para identificar, classificar, conter, corrigir e registrar incidentes de seguranca, privacidade ou disponibilidade.

## 2. Classificacao de severidade

| Severidade | Definicao | Exemplos |
|---|---|---|
| SEV-1 Critico | Impacto amplo, dados sensiveis expostos ou indisponibilidade severa. | Vazamento de documentos, acesso admin indevido, indisponibilidade geral. |
| SEV-2 Alto | Impacto relevante, mas limitado. | Falha em API privada, exposicao parcial de metadados, erro em pagamento. |
| SEV-3 Medio | Impacto localizado e sem evidencia de abuso. | Erro de permissao sem dados sensiveis, bug de autenticao contornado rapidamente. |
| SEV-4 Baixo | Achado preventivo ou melhoria. | Scanner Low, header ajustavel, dependencia sem exploit conhecido. |

## 3. Fluxo de resposta

1. Detectar e registrar o incidente.
2. Classificar severidade.
3. Nomear responsavel.
4. Conter impacto imediato.
5. Preservar evidencias relevantes.
6. Corrigir causa raiz.
7. Validar correcao.
8. Comunicar partes afetadas quando aplicavel.
9. Registrar pos-incidente com acoes preventivas.

## 4. Registro minimo

Todo incidente deve registrar:

- data e hora de abertura;
- responsavel;
- severidade;
- sistemas afetados;
- descricao;
- evidencias;
- decisao de comunicacao;
- correcao aplicada;
- data e hora de encerramento;
- acoes preventivas.

## 5. Comunicacao

Incidentes com possivel impacto em dados pessoais ou juridicos devem ser avaliados conforme LGPD e politica de privacidade vigente.

Mensagem externa deve evitar especulacao e conter apenas fatos confirmados.

## 6. Evidencias

Guardar:

- logs relevantes;
- prints de ferramenta;
- hash ou ID de deploy;
- arquivos alterados;
- horario de mitigacao;
- resultado de reteste.

