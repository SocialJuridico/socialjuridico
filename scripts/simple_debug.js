require('dotenv').config();
const pg = require('pg');

async function run() {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res1 = await client.query("SELECT COUNT(*) FROM cases;");
    const res2 = await client.query("SELECT COUNT(*) FROM casos;");
    console.log(`CASES: ${res1.rows[0].count} | CASOS: ${res2.rows[0].count}`);
    
    console.log("USERS_START");
    console.log(JSON.stringify(resUsers.rows));
    console.log("CASES_START");
    console.log(JSON.stringify(resCases.rows));
    await client.end();
}
run();
