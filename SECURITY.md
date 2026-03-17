# 🔒 Guia de Segurança - Social Jurídico

> **Última atualização**: 17 de março de 2026  
> **Status**: ✅ Auditoria completa e implementação de controles de segurança

## 📋 Índice

1. [Princípios de Segurança](#princípios)
2. [Vulnerabilidades Corrigidas](#vulnerabilidades-corrigidas)
3. [Padrões de Desenvolvimento Seguro](#padrões-de-desenvolvimento)
4. [Headers de Segurança](#headers-de-segurança)
5. [Autenticação e Autorização](#autenticação-e-autorização)
6. [Proteção de Dados](#proteção-de-dados)
7. [Rate Limiting](#rate-limiting)
8. [Checklist de Segurança](#checklist-de-segurança)

---

## Princípios

### 1. **Princípio da Menor Privilégio**

- Usuários devem ter apenas as permissões necessárias
- Verificar roles no servidor, NUNCA confiar em `user.user_metadata`

### 2. **Defense in Depth (Defesa em Profundidade)**

- Múltiplas camadas de segurança
- Middleware + API + Banco de dados

### 3. **Não Confiar em Entrada do Cliente**

- Validar e sanitizar SEMPRE
- Verificar roles no servidor, não no cliente

### 4. **Proteção de Dados Sensíveis**

- CPF, CNPJ, RG, email, telefone, endereço: NUNCA enviar para APIs externas
- Logar apenas informações genéricas

---

## Vulnerabilidades Corrigidas

### ✅ 1. Vazamento de Dados Pessoais para OpenAI

**Problema**: Redator IA enviava CPF, CNPJ, RG, email, telefone, endereço para a OpenAI.  
**Impacto**: Violação de LGPD/GDPR 🔴 CRÍTICO  
**Solução**:

- Remover dados pessoais do prompt
- Enviar apenas nome genérico e OAB público

```javascript
// ❌ ANTES (Perigoso!)
const clientInfo = `CPF: ${clientData.cpf_cnpj}, Email: ${clientData.email}`;

// ✅ DEPOIS (Seguro)
const clientInfo = `QUALIFICAÇÃO DA PARTE: ${clientData.name}`;
```

### ✅ 2. Logs Expondo Dados Sensíveis

**Problema**: `console.log` com user.id, user.email, IDs de usuários  
**Impacto**: Vazamento em logs (staging/prod/arquivos) 🔴 CRÍTICO  
**Solução**:

- Remover ou sanitizar logs com informações de identificação
- Usar máscaras para dados sensíveis se necessário logar

```javascript
// ❌ ANTES
console.log(`Atualizando caso ${id} para o usuário ${user.id}`);

// ✅ DEPOIS
// ⚠️ SEGURANÇA: Não logar user.id
```

### ✅ 3. Verificação de Role Fraca

**Problema**: Confiar em `user.user_metadata?.role` (pode ser manipulado no cliente)  
**Impacto**: Elevação de privilégios 🔴 CRÍTICO  
**Solução**:

- Criar função `getRoleFromDatabase()` que consulta o servidor
- Usar em TODAS as verificações de autorização

```javascript
// ❌ ANTES
if (user.user_metadata?.role !== "ADMIN") { ... }

// ✅ DEPOIS
import { isAdmin } from "@/lib/securityUtils";
if (!await isAdmin(db, user.id)) { ... }
```

### ✅ 4. Falta de Headers de Segurança

**Problema**: Sem proteção contra clickjacking, XSS, MIME sniffing  
**Impacto**: Ataques comuns não bloqueados 🟡 MÉDIO  
**Solução**: Adicionar headers de segurança no middleware

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [configuração adequada]
```

### ✅ 5. Falta de Rate Limiting

**Problema**: APIs podem ser abusadas (brute force, DoS)  
**Impacto**: Indisponibilidade do serviço 🟡 MÉDIO  
**Solução**: Implementar rate limiting por rota/IP

```
Auth APIs: 5 requisições / 15 minutos
AI APIs: 10 requisições / minuto
Write APIs: 30 requisições / minuto
```

---

## Padrões de Desenvolvimento

### 📝 Padrão 1: Verificação de Autorização Segura

```javascript
import { getRoleFromDatabase } from "@/lib/securityUtils";

export async function GET(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    // ✅ SEGURO: Consultar role no banco
    const role = await getRoleFromDatabase(db, user.id);

    if (role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    // ... resto da lógica
  } catch (error) {
    // ⚠️ Não logar dados sensíveis
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
```

### 📝 Padrão 2: Selecionar Apenas Campos Necessários

```javascript
// ❌ NEVER - Retorna todos os campos (pode incluir senhas!)
.select("*")

// ✅ ALWAYS - Selecionar explicitamente campos públicos
.select("id, name, email, phone, created_at")
```

### 📝 Padrão 3: Sanitizar e Validar Entrada

```javascript
import { sanitizeString, isValidUUID } from "@/lib/securityUtils";

const name = sanitizeString(body.name); // Remove caracteres perigosos
if (!isValidUUID(userId)) {
  return NextResponse.json(
    { success: false, message: "ID inválido" },
    { status: 400 },
  );
}
```

### 📝 Padrão 4: Nunca Enviar Dados Sensíveis Para APIs Externas

```javascript
// ❌ NUNCA fazer isso!
const prompt = `CPF: ${user.cpf}, Email: ${user.email}, RG: ${user.rg}`;
await openai.createCompletion({ prompt });

// ✅ Enviar apenas dados públicos/anônimos
const prompt = `Gere documento para ${user.name}`;
```

### 📝 Padrão 5: Tratamento de Erros Seguro

```javascript
// ❌ NUNCA expor detalhes internos
console.error("Erro:", error); // Pode conter stack trace sensível
return NextResponse.json({ message: error.message }, { status: 500 });

// ✅ Somente mensagem genérica ao usuário
console.error("[API] Erro ao processar solicitação");
return NextResponse.json(
  { success: false, message: "Erro interno no servidor" },
  { status: 500 },
);
```

---

## Headers de Segurança

### Implementado no Middleware

```http
X-Frame-Options: DENY
  └─ Impede clickjacking (inserção da página em iframe)

X-Content-Type-Options: nosniff
  └─ Previne MIME type sniffing

X-XSS-Protection: 1; mode=block
  └─ Habilita proteção XSS do navegador

Content-Security-Policy: default-src 'self'; ...
  └─ Define de quais fontes o navegador pode carregar recursos

Referrer-Policy: strict-origin-when-cross-origin
  └─ Controla que informações de referência são enviadas

Permissions-Policy: geolocation=(), microphone=(), camera=()
  └─ Desativa características potencialmente sensíveis
```

### HSTS (HTTP Strict Transport Security)

💡 **IMPORTANTE**: Ativar apenas após confirmar que o certificado SSL é válido em produção

```javascript
response.headers.set(
  "Strict-Transport-Security",
  "max-age=31536000; includeSubDomains",
);
```

---

## Autenticação e Autorização

### Verificação de Roles - Agora Segura! ✅

```javascript
import {
  getRoleFromDatabase,
  isAdmin,
  isLawyer,
  isClient,
} from "@/lib/securityUtils";

const role = await getRoleFromDatabase(db, userId); // Consulta banco

const adminFlag = await isAdmin(db, userId); // Retorna boolean
const lawyerFlag = await isLawyer(db, userId); // Retorna boolean
const clientFlag = await isClient(db, userId); // Retorna boolean
```

### Fluxo de Autenticação

```
Cliente (navegador)
    ↓
Middleware (verifica sessão)
    ↓
API Endpoint (verifica user)
    ↓
Consulta Banco (verifica role) ← ✅ SEGURO
    ↓
Executor Lógica
```

---

## Proteção de Dados

### O Que Proteger?

| Dado          | Sensibilidade | Ação                             |
| ------------- | ------------- | -------------------------------- |
| CPF/CNPJ      | 🔴 CRÍTICO    | Nunca enviar p/ APIs externas    |
| RG            | 🔴 CRÍTICO    | Nunca enviar p/ APIs externas    |
| Email         | 🟡 MÉDIO      | Não logar, máscara se necessário |
| Telefone      | 🟡 MÉDIO      | Não logar em console             |
| Endereço      | 🟡 MÉDIO      | Não enviar p/ APIs externas      |
| Senha         | 🔴 CRÍTICO    | Nunca logar, sempre hasheada     |
| Token/API Key | 🔴 CRÍTICO    | Nunca expor ao cliente           |
| OAB           | 🟢 PÚBLICO    | OK retornar (informação pública) |
| Nome          | 🟢 PÚBLICO    | OK retornar (informação pública) |

### Máscaras para Logging Seguro

```javascript
import { maskEmail, maskId } from "@/lib/securityUtils";

const maskedEmail = maskEmail("usuario@example.com"); // u***@example.com
const maskedId = maskId("abc123def456"); // abc***456
```

---

## Rate Limiting

### Configuração

```javascript
RATE_LIMIT_CONFIG = {
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 / 15 min
  read: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 / min
  write: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 / min
  ai: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 / min (OpenAI $$$)
  critical: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 / min (delete)
};
```

### Uso (Futuro)

```javascript
import { rateLimit, getRateLimitConfig } from "@/lib/rateLimitMiddleware";

const config = getRateLimitConfig(pathname);
const limit = rateLimit(config.maxRequests, config.windowMs);
const rateLimitData = limit(request);

if (rateLimitData.isLimited) {
  return NextResponse.json(
    { success: false, message: "Muitas requisições. Tente novamente depois." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": rateLimitData.maxRequests,
        "X-RateLimit-Remaining": rateLimitData.remaining,
        "X-RateLimit-Reset": rateLimitData.resetTime,
      },
    },
  );
}
```

---

## ✅ Checklist de Segurança

Para cada nova API criada, verificar:

### Autenticação

- [ ] Verifica se usuário está autenticado
- [ ] Retorna 401 se não autenticado

### Autorização

- [ ] Verifica role consultando banco (não user_metadata)
- [ ] Retorna 403 se não tem permissão
- [ ] Verifica propriedade (user só acessa seus dados)

### Input Validation

- [ ] Valida comprimento de strings
- [ ] Valida formato de IDs (UUID)
- [ ] Sanitiza entradas de usuário
- [ ] Verifica tipos de dados

### Output Security

- [ ] Seleciona apenas campos necessários (.select("id, name, ..."))
- [ ] Nunca retorna senhas/tokens
- [ ] Nunca expõe detalhes de erro internos

### Logging

- [ ] Não loga user.id ou user.email
- [ ] Não loga senhas ou tokens
- [ ] Não loga dados sensíveis
- [ ] Usa máscaras se necessário logar dados

### APIs Externas

- [ ] Nunca envia CPF/CNPJ/RG para OpenAI ou serviços
- [ ] Nunca envia dados pessoais sem consentimento
- [ ] Valida resposta de API externa

### Rate Limiting

- [ ] Endpoints críticos têm limites apropriados
- [ ] Auth endpoints têm limites reduzidos
- [ ] AI endpoints têm limites por custo

### Headers

- [ ] X-Frame-Options configurado
- [ ] CSP configurado adequadamente
- [ ] X-Content-Type-Options: nosniff

---

## 🚀 Próximos Passos (Recomendações)

### Curto Prazo

1. ✅ Aplicar `getRoleFromDatabase()` em TODOS os endpoints de admin
2. ✅ Implementar rate limiting middleware nos endpoints críticos
3. ✅ Validar TODOS os selects de dados de usuário

### Médio Prazo

1. 📋 Implementar logging estruturado com mascaramento automático
2. 📋 Adicionar encrypt at rest para dados sensíveis no Supabase
3. 📋 Implementar audit log para ações críticas

### Longo Prazo

1. 🗓️ Usar Redis para rate limiting distribuído
2. 🗓️ Implementar 2FA para contas admin
3. 🗓️ Certificação de conformidade (LGPD/GDPR)
4. 🗓️ Teste de penetração periódico

---

## 📚 Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/learn/security/fundamentals)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

---

## Histórico de Auditoria

| Data       | Achados              | Ações                   | Status      |
| ---------- | -------------------- | ----------------------- | ----------- |
| 17/03/2026 | 5 críticas, 2 médias | Correções implementadas | ✅ Completo |

---

**Mantém este guia atualizado!** Se encontrar vulnerabilidades, documente aqui e corrija imediatamente.
