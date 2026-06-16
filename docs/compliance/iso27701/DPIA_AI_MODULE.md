# DPIA — Módulo de Inteligência Artificial (OpenAI)

**Norma:** ISO/IEC 27701:2025 — A.7.4.5 | LGPD Art. 5, XVII | ANPD Resolução CD/ANPD nº 2/2022  
**Documento:** SJ-PIMS-DPIA-AI-001 | **Versão:** 1.0 — 2026-06-16  
**Responsável:** Carlos Henrique | **Status:** Aprovado

---

## 1. Descrição do tratamento

| Campo | Detalhe |
|---|---|
| **Módulo** | Assistência jurídica com IA |
| **Tecnologia** | OpenAI API (GPT-4 ou equivalente) |
| **Finalidade** | Auxiliar advogados e clientes na redação, análise e classificação de documentos jurídicos |
| **Dados de entrada** | Texto de consultas ou documentos fornecidos pelo usuário |
| **Dados enviados à API** | Texto **anonimizado** — identificadores pessoais removidos antes do envio |
| **Dados retornados** | Resposta textual do modelo (sem dados pessoais) |
| **Retenção pela OpenAI** | Nenhuma — zero data retention por padrão na API |
| **Treinamento do modelo** | Não — dados da API não são usados para treinamento (por contrato) |

---

## 2. Necessidade e proporcionalidade

| Critério | Avaliação |
|---|---|
| A finalidade é legítima? | ✅ Sim — auxiliar profissionais jurídicos em tarefas repetitivas |
| Os dados são adequados e necessários? | ✅ Sim — anonimizados antes do envio; mínimo necessário |
| Há finalidade alternativa menos intrusiva? | Parcialmente — modelos locais (sem envio externo) são alternativa futura |
| Os titulares foram informados? | ✅ Aviso na interface do módulo de IA |

---

## 3. Identificação de riscos

| # | Risco | Probabilidade | Impacto | Nível | Mitigação |
|---|---|---|---|---|---|
| R-1 | Dado pessoal enviado sem anonimização por falha de código | Baixa | Alto | Médio | Revisão de código + testes de sanitização; logging de caracteres PII detectados |
| R-2 | Violação de dados na OpenAI afetando consultas em trânsito | Muito baixa | Alto | Baixo | DPA com OpenAI + TLS obrigatório; dados não retidos |
| R-3 | Uso indevido das respostas da IA como conselho jurídico definitivo | Média | Médio | Médio | Aviso claro na interface: "IA não substitui consulta com advogado" |
| R-4 | Inferência de identidade de texto anonimizado por recombinação | Muito baixa | Alto | Baixo | Remoção de múltiplos campos antes do envio; revisão periódica do método |

---

## 4. Medidas de mitigação implementadas

| Medida | Status |
|---|---|
| Anonimização de dados antes do envio à API OpenAI | ✅ Implementado |
| DPA com OpenAI (zero data retention) | ✅ Contratado |
| TLS obrigatório na transmissão | ✅ Implementado |
| Aviso ao usuário no módulo de IA | ✅ Implementado |
| Logging de tentativas de envio com PII detectado | A implementar — Q3 2026 |
| Consentimento granular para uso do módulo de IA | A implementar — Q3 2026 |

---

## 5. Consulta às partes interessadas

| Parte | Consultado? | Resultado |
|---|---|---|
| Usuários (advogados e clientes) | Aviso na interface | Ciente |
| Encarregado / DPO | Carlos Henrique | Aprovado |
| Jurídico | A realizar formalmente | Pendente |

---

## 6. Conclusão

**Nível de risco residual:** Baixo  
**Decisão:** O tratamento pode prosseguir com as medidas de mitigação implementadas.  
**Revisão:** Obrigatória antes de qualquer expansão do módulo (novos modelos, novos dados de entrada).

**Aprovado por:** Carlos Henrique — 2026-06-16
