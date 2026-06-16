# PIMS — Escopo e Objetivos

**Norma:** ISO/IEC 27701:2025  
**Documento:** SJ-PIMS-SCOPE-001  
**Versão:** 2.0 — 2026-06-16  
**Substitui:** Versão 1.0 (referenciava ISO/IEC 27701:2019)

---

## Declaração de escopo

A SocialJurídico opera um Sistema de Gestão de Privacidade da Informação (PIMS) para governar
o tratamento de dados pessoais na plataforma, conforme a **ISO/IEC 27701:2025**.

O PIMS é implementado de forma integrada ao SGSI ISO/IEC 27001:2022 da organização, mas é
**autônomo**: não depende da certificação ISO 27001 para ser certificado independentemente,
conforme permite a edição de 2025 da norma.

---

## Em escopo

- Cadastro e autenticação de contas (clientes, advogados, membros de escritório, administradores)
- Perfis de advogados e clientes
- Escritórios enterprise — contas de equipe e estagiários
- Fluxos de caso, mensagem e documento que contenham dados pessoais
- Fluxo de exclusão e purga LGPD (`solicitacoes_exclusao`, `admin_account_deletion_audit_logs`)
- Logs de autenticação e auditoria de segurança (`security_audit_events`)
- Cartões digitais públicos / Link na Bio e avisos de privacidade contextuais
- Links de acesso a notificações extrajudiciais (evidência legal de citação)
- Sessões de escritório multi-tenant (`sj_escritorio_session`)
- Tratamento via fornecedores: Supabase, OpenAI, Stripe, InfinitePay, Cloudflare, Resend, VPS, Jitsi

---

## Fora de escopo

- Dispositivos pessoais não gerenciados pela SocialJurídico
- Sistemas externos operados diretamente por advogados, clientes ou escritórios fora da plataforma
- Sites de terceiros acessados por links externos após o usuário sair da plataforma

---

## Papel da organização

| Papel | Contexto |
|---|---|
| **Controlador** | SocialJurídico é controladora dos dados pessoais de clientes, advogados, membros de escritório e visitantes da plataforma |
| **Operador** | SocialJurídico atua como operadora quando processa dados pessoais em nome de escritórios enterprise que utilizem a plataforma como ferramenta de gestão |

---

## Objetivos de privacidade

1. Tratar dados pessoais de forma lícita, leal e transparente (LGPD Arts. 6 e 7)
2. Minimizar dados pessoais expostos em APIs e relatórios
3. Manter rastreabilidade de operações sensíveis de privacidade (audit trail imutável)
4. Atender direitos dos titulares sob a LGPD no prazo legal (15 dias úteis)
5. Reter logs e evidências sem armazenar dados pessoais brutos desnecessariamente
6. Implementar privacidade desde a concepção em novos módulos e funcionalidades
7. Avaliar riscos de privacidade antes de lançar tratamentos de maior risco (DPIA)
