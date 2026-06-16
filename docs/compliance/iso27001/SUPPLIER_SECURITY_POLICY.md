# Supplier Security Policy

**Versao:** 2026-06-16

## 1. Objetivo

Definir criterios para avaliacao, uso e revisao de fornecedores que processam, armazenam ou protegem dados do Social Juridico.

## 2. Fornecedores criticos

Fornecedores criticos sao aqueles que impactam:

- autenticacao;
- banco de dados;
- armazenamento;
- pagamentos;
- comunicacao;
- IA;
- seguranca de borda;
- disponibilidade da plataforma.

O inventario fica em `../VENDOR_AND_ASSET_REGISTER.md`.

## 3. Avaliacao minima

Antes de adotar fornecedor critico, avaliar:

- finalidade do uso;
- tipos de dados processados;
- localizacao/regiao;
- controles de seguranca publicados;
- suporte a MFA;
- logs e auditoria;
- possibilidade de exportacao/portabilidade;
- termos, DPA ou contrato aplicavel;
- subprocessadores relevantes quando houver.

## 4. Revisao periodica

- Criticos: trimestral.
- Nao criticos: anual.
- Apos incidente publico relevante: imediatamente.

## 5. Encerramento

Ao descontinuar fornecedor:

1. Revogar chaves/tokens.
2. Exportar ou remover dados quando aplicavel.
3. Atualizar inventario.
4. Registrar evidencia.

