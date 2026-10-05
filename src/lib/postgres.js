import { Pool } from "pg";

// O `pg` sobrescreve a opção `ssl` quando a URL traz `sslmode`/`sslrootcert`
// etc. (sslmode=require vira verify-full e o certificado do Supabase é
// rejeitado). Removemos esses parâmetros para que a configuração abaixo valha.
const SSL_URL_PARAMS = [
  "sslmode",
  "ssl",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "uselibpqcompat",
];

function sanitizeConnectionString(value) {
  if (!value) return value;

  try {
    const url = new URL(value);
    SSL_URL_PARAMS.forEach((param) => url.searchParams.delete(param));
    return url.toString();
  } catch {
    return value;
  }
}

const connectionString = sanitizeConnectionString(process.env.DATABASE_URL);

function createPool() {
  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const globalForPostgres = globalThis;

export const postgresPool =
  globalForPostgres.__socialJuridicoPostgresPool || createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.__socialJuridicoPostgresPool = postgresPool;
}
