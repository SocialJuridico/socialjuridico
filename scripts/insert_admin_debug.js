require('dotenv').config();
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

const adminUser = {
    id: "c548b842-c52e-4275-a175-933d6f23b32a",
    email: "admin@socialjuris.com",
    name: "Administrador",
    role: "ADMIN",
    avatar: "https://ui-avatars.com/api/?name=Administrador&background=random",
    phone: null,
    bio: null,
    oab: null,
    specialties: null,
    verified: false,
    created_at: "2026-01-11T21:24:09.433+00:00",
    balance: 0,
    is_premium: false,
    premium_expires_at: null,
    is_cofounder: false,
    google_id: null,
    facebook_id: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: null,
    subscription_started_at: null,
    subscription_ends_at: null,
    from_facebook_group: true,
    badges: JSON.stringify([]),
    avg_rating: 0,
    total_ratings: 0
};

async function insertAdmin() {
    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await pgClient.connect();
    console.log("Connected to Postgres.");

    try {
        const columns = Object.keys(adminUser);
        const values = Object.values(adminUser);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `INSERT INTO admins (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;`;
        console.log("Running insert...");
        const res = await pgClient.query(query, values);
        console.log("Insert result:", res.rowCount);
    } catch (err) {
        console.error("ERRO NO INSERT:", err.message);
        console.error(err.stack);
    } finally {
        await pgClient.end();
    }
}

insertAdmin();
