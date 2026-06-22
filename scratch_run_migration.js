const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully!");

    const sqlPath = path.join(__dirname, 'database/migrations/20260621_oab_monitoring.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Running migration SQL...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Error executing migration:", error);
  } finally {
    await client.end();
  }
}

run();
