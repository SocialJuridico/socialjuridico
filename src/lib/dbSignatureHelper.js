// O banco de dados agora é inicializado estaticamente através de migrações
export async function ensureDb() {
  // Retorna imediatamente pois a tabela assinaturas_digitais é criada via migração SQL
  return;
}

