import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function GET() {
  let connStr = process.env.DATABASE_URL;
  if (connStr) {
    const matches = connStr.match(/@/g);
    if (matches && matches.length > 1) {
      const prefix = "postgresql://";
      if (connStr.startsWith(prefix)) {
        const rest = connStr.substring(prefix.length);
        const lastAtIndex = rest.lastIndexOf("@");
        if (lastAtIndex !== -1) {
          const credentials = rest.substring(0, lastAtIndex);
          const hostDb = rest.substring(lastAtIndex + 1);
          const colonIndex = credentials.indexOf(":");
          if (colonIndex !== -1) {
            const username = credentials.substring(0, colonIndex);
            const password = credentials.substring(colonIndex + 1);
            connStr = `${prefix}${username}:${encodeURIComponent(password)}@${hostDb}`;
          }
        }
      }
    }
  }

  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Cria a tabela de assinaturas_digitais se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS assinaturas_digitais (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lawyer_id UUID REFERENCES advogados(id) ON DELETE SET NULL,
        client_id UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
        document_name TEXT NOT NULL,
        document_url TEXT,
        original_hash TEXT,
        signed_hash TEXT,
        verification_code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        document_type TEXT DEFAULT 'contrato',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);

    // 2. Cria index para busca rápida pelo código de validação
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assinaturas_code ON assinaturas_digitais(verification_code);
    `);

    await client.end();
    return NextResponse.json({ success: true, message: "Banco de dados de assinaturas inicializado com sucesso!" });
  } catch (error) {
    console.error("Erro ao inicializar banco de assinaturas:", error);
    try {
      await client.end();
    } catch (_) {}
    return NextResponse.json({ success: false, message: "Erro de inicialização do banco", error: error.message }, { status: 500 });
  }
}
