# ISMS Scope - Social Juridico

**Versao:** 2026-06-16  
**Status:** readiness interno  
**Norma-alvo:** ISO/IEC 27001:2022

## 1. Objetivo

Definir o escopo inicial do Sistema de Gestao de Seguranca da Informacao (SGSI) do Social Juridico para preparar a organizacao para uma futura certificacao ISO/IEC 27001.

## 2. Escopo proposto

O SGSI cobre a operacao, desenvolvimento, manutencao e suporte da plataforma SaaS Social Juridico, incluindo:

- aplicacao web em `https://socialjuridico.com.br`;
- APIs publicas, privadas e administrativas;
- dashboards de cliente, advogado, escritorio, anunciante e administrador;
- processamento de dados pessoais e juridicos na plataforma;
- integracoes com Supabase, Cloudflare, Stripe, Resend, OpenAI, OneSignal, Jitsi e provedores de pagamento;
- politicas, processos e evidencias relacionados a seguranca da informacao.

## 3. Exclusoes iniciais

As seguintes areas ficam fora do escopo inicial de readiness, mas podem ser incluidas no futuro:

- auditoria financeira formal;
- ambiente fisico de terceiros fora do modelo de responsabilidade compartilhada;
- dispositivos pessoais de usuarios finais;
- sistemas de parceiros que apenas recebem links ou comunicacoes da plataforma;
- operacoes juridicas independentes realizadas por advogados fora da plataforma.

## 4. Limites organizacionais

O escopo considera os responsaveis internos pela administracao, desenvolvimento, suporte e operacao do Social Juridico.

Fornecedores criticos sao avaliados como suboperadores ou provedores de servico, mas sua certificacao propria nao e incorporada automaticamente ao escopo.

## 5. Interfaces externas

Interfaces relevantes:

- usuarios finais: clientes, advogados, escritorios, anunciantes e administradores;
- provedores de infraestrutura e dados;
- provedores de pagamento;
- provedores de comunicacao;
- provedores de IA;
- scanners e auditores externos.

## 6. Declaracao de escopo sugerida

> O SGSI do Social Juridico cobre o desenvolvimento, operacao e manutencao da plataforma SaaS juridica Social Juridico, incluindo aplicacao web, APIs, dashboards autenticados, integracoes criticas e controles organizacionais relacionados a confidencialidade, integridade e disponibilidade das informacoes processadas pela plataforma.

