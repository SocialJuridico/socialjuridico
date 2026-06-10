import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

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
