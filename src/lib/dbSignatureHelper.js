import { Client } from 'pg';

let isInitialized = false;

export async function ensureDb() {
  if (isInitialized) return;

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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_assinaturas_code ON assinaturas_digitais(verification_code);
    `);
    isInitialized = true;
  } catch (error) {
    console.error("ensureDb error:", error);
  } finally {
    await client.end().catch(() => {});
  }
}
