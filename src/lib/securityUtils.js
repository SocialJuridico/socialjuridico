/**
 * Utilitários de Segurança
 * ⚠️ IMPORTANTE: Nunca confiar em user_metadata para determinar roles/permissões!
 * Roles devem SEMPRE ser verificadas no servidor consultando o banco de dados.
 */

/**
 * Resolve o role real de um usuário consultando o banco de dados
 * @param {Object} db - Cliente Supabase (admin ou autenticado)
 * @param {string} userId - ID do usuário
 * @returns {Promise<string|null>} "ADMIN", "LAWYER", "CLIENT", ou null se não encontrado
 */
export async function getRoleFromDatabase(db, userId) {
  if (!db || !userId) {
    return null;
  }

  try {
    // Verificar em admins
    const { data: adminData } = await db
      .from("admins")
      .select("role")
      .eq("id", userId)
      .single();

    if (adminData?.role) {
      return adminData.role; // "ADMIN"
    }

    // Verificar em advogados
    const { data: lawyerData } = await db
      .from("advogados")
      .select("id")
      .eq("id", userId)
      .single();

    if (lawyerData) {
      return "LAWYER";
    }

    // Verificar em clientes
    const { data: clientData } = await db
      .from("clientes")
      .select("id")
      .eq("id", userId)
      .single();

    if (clientData) {
      return "CLIENT";
    }

    return null;
  } catch (error) {
    console.error("[securityUtils] Erro ao resolver role:", error.message);
    return null;
  }
}

/**
 * Verifica se o usuário é ADMIN consultando o banco
 * @param {Object} db - Cliente Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>}
 */
export async function isAdmin(db, userId) {
  const role = await getRoleFromDatabase(db, userId);
  return role === "ADMIN";
}

/**
 * Verifica se o usuário é ADVOGADO consultando o banco
 * @param {Object} db - Cliente Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>}
 */
export async function isLawyer(db, userId) {
  const role = await getRoleFromDatabase(db, userId);
  return role === "LAWYER";
}

/**
 * Verifica se o usuário é CLIENT consultando o banco
 * @param {Object} db - Cliente Supabase
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>}
 */
export async function isClient(db, userId) {
  const role = await getRoleFromDatabase(db, userId);
  return role === "CLIENT";
}

/**
 * Sanitizes a string to remove dangerous characters
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (!input) return "";
  return String(input)
    .trim()
    .replace(/[<>\"']/g, ""); // Remove caracteres HTML/SQL perigosos
}

/**
 * Validates a UUID v4 format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID v4
 */
export function isValidUUID(uuid) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Masks email for safe logs (example: user@example.com becomes u***@example.com)
 * @param {string} email - Email to mask
 * @returns {string} Masked email
 */
export function maskEmail(email) {
  if (!email) return "***";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.charAt(0)}***@${domain}`;
}

/**
 * Masks ID for safe logs (example: abc123def456 becomes abc***456)
 * @param {string} id - ID to mask
 * @returns {string} Masked ID
 */
export function maskId(id) {
  if (!id || id.length < 6) return "***";
  return `${id.substring(0, 3)}***${id.substring(id.length - 3)}`;
}

/**
 * Masks CPF/CNPJ for secure display
 * CPF example: 11111111111 becomes ***.***.**-11
 * CNPJ example: 12345678000190 becomes **.***.*******-90
 * @param {string} cpfCnpj - CPF or CNPJ without formatting
 * @returns {string} Masked CPF/CNPJ
 */
export function maskCPFCNPJ(cpfCnpj) {
  if (!cpfCnpj) return "***.***.***-**";
  const cleaned = String(cpfCnpj).replace(/\D/g, "");

  if (cleaned.length === 11) {
    // CPF: 11 digits
    const last2 = cleaned.slice(-2);
    return `***.***.***-${last2}`;
  }

  if (cleaned.length === 14) {
    // CNPJ: 14 digits
    const last2 = cleaned.slice(-2);
    return `**.***.***/****-${last2}`;
  }

  return "***.***.***-**";
}

/**
 * Formats phone with visual mask
 * 10 digits: 5133334444 becomes (51) 3333-4444
 * 11 digits: 5199392983 becomes (51) 99392-983
 * @param {string} phone - Phone without formatting
 * @returns {string} Formatted phone
 */
export function formatPhone(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Masks phone for secure display (shows region + last 4 digits)
 * 10 digits: 5133334444 becomes (51) ****-4444
 * 11 digits: 5199392983 becomes (51) ****-2983
 * @param {string} phone - Formatted or unformatted phone
 * @returns {string} Partially masked phone
 */
export function maskPhone(phone) {
  if (!phone) return "(**) ****-****";
  const cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ****-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ****-${cleaned.slice(7)}`;
  }

  return phone;
}

/**
 * Removes UUID/IDs from text (protection against internal identifier exposure)
 * Example: User 550e8400-e29b-41d4-a716-446655440000 not found -> User [ID] not found
 * @param {string} text - Text containing possible UUID
 * @returns {string} Text with UUIDs removed
 */
export function stripUUIDs(text) {
  if (!text) return "";
  return String(text).replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "[ID]",
  );
}
