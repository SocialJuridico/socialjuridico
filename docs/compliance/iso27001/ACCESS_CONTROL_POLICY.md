# Access Control Policy

**Versao:** 2026-06-16

## 1. Objetivo

Garantir que acesso a sistemas, dados e funcoes administrativas do Social Juridico seja concedido conforme necessidade, menor privilegio e responsabilidade individual.

## 2. Principios

- Menor privilegio.
- Necessidade de saber.
- Credenciais individuais.
- Revisao periodica.
- Revogacao rapida quando o acesso deixa de ser necessario.

## 3. Perfis da aplicacao

Perfis funcionais:

- Cliente.
- Advogado.
- Escritorio.
- Anunciante.
- Administrador.

Rotas privadas devem validar autenticacao no middleware e autorizacao no servidor quando houver operacao sensivel.

## 4. Acessos administrativos

Controles esperados:

- MFA em contas de Cloudflare, Supabase, Stripe, provedores de e-mail e repositorio.
- Acesso admin limitado a responsaveis autorizados.
- Remocao imediata de contas nao utilizadas.
- Registro de alteracoes sensiveis.
- Evitar compartilhamento de credenciais.

## 5. Revisao de acesso

Frequencia minima:

- Administradores: trimestral.
- Fornecedores e integracoes: trimestral.
- Usuarios operacionais internos: semestral.
- Apos incidente: imediatamente.

## 6. Offboarding

Quando uma pessoa deixar de atuar no projeto:

1. Revogar acessos a repositorio.
2. Revogar acessos a Cloudflare, Supabase, Stripe e ferramentas criticas.
3. Rotacionar segredos compartilhados quando necessario.
4. Registrar conclusao no `EVIDENCE_REGISTER.md`.

## 7. Evidencias

- Lista de administradores por sistema.
- Print/export de MFA habilitado.
- Registro de revisoes trimestrais.
- Registro de revogacoes.
