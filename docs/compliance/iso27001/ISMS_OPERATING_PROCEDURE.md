# ISMS Operating Procedure

**Versao:** 2026-06-16  
**Objetivo:** transformar o SGSI do Social Juridico em rotina operacional.

## 1. Como implementar o SGSI na pratica

O SGSI deve funcionar como um ciclo continuo:

1. Definir escopo e politicas.
2. Identificar ativos, fornecedores e riscos.
3. Definir controles e tratamento dos riscos.
4. Operar os controles.
5. Coletar evidencias.
6. Auditar internamente.
7. Corrigir nao conformidades.
8. Revisar pela direcao.
9. Melhorar o sistema.

## 2. Responsabilidades minimas

| Papel | Responsabilidade |
|---|---|
| Responsavel pelo SGSI | Manter documentos, evidencias, riscos e auditorias. |
| Responsavel tecnico | Implementar controles tecnicos, validar mudancas e apoiar incidentes. |
| Administracao | Aprovar riscos residuais, priorizar acoes e revisar resultados. |
| Operacao/suporte | Registrar incidentes, problemas, acessos e evidencias. |

Em uma equipe pequena, a mesma pessoa pode acumular papeis, mas as decisoes relevantes devem ficar registradas.

## 3. Rotina mensal

- Registrar novos incidentes, mudancas e evidencias.
- Revisar achados de scanners.
- Verificar se houve novo fornecedor ou integracao.
- Atualizar riscos quando houver mudanca relevante.
- Conferir se documentos publicos continuam coerentes com o produto real.

## 4. Rotina trimestral

- Revisar acessos administrativos.
- Revisar fornecedores criticos.
- Revisar riscos medios, altos e criticos.
- Validar se controles de seguranca seguem operando.
- Atualizar `EVIDENCE_REGISTER.md`.

## 5. Rotina semestral

- Testar restauracao/backup ou simular procedimento.
- Executar auditoria interna parcial.
- Revisar politica de seguranca e escopo se houver mudancas.

## 6. Rotina anual

- Executar auditoria interna completa.
- Realizar analise critica pela direcao.
- Revisar SoA, matriz de riscos e plano de tratamento.
- Avaliar pentest, consultoria ou certificadora externa.

## 7. Evidencias que devem ser guardadas

- Prints de configuracao Cloudflare/Supabase/Stripe quando relevante.
- Relatorios Probely, SSL Labs, Security Headers e auditorias tecnicas.
- Commits, PRs, diffs ou descricao de mudancas.
- Registro de incidentes.
- Registro de revisao de acessos.
- Registro de revisao de fornecedores.
- Evidencia de backup/restore.
- Relatorio de auditoria interna.
- Plano de acao e fechamento de nao conformidades.

## 8. Regra de ouro

Se um controle existe mas nao possui evidencia, para auditoria ele e fraco. O SGSI precisa demonstrar que os controles sao praticados, nao apenas declarados.

