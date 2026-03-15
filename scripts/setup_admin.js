require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const DATABASE_URL = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    badges: [],
    avg_rating: 0,
    total_ratings: 0
};

async function setupAdmin() {
    // 1. Database Table
    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await pgClient.connect();
    console.log("Connected to Postgres.");

    try {
        console.log("Creating 'admins' table...");
        await pgClient.query(`CREATE TABLE IF NOT EXISTS admins (LIKE clientes INCLUDING ALL);`);
        
        console.log("Inserting admin user into database...");
        const columns = Object.keys(adminUser);
        const values = Object.values(adminUser).map(v => Array.isArray(v) ? JSON.stringify(v) : v);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        await pgClient.query(`INSERT INTO admins (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING;`);
        console.log("Admin ensured in database.");
    } catch (err) {
        console.error("Database error:", err.message);
    } finally {
        await pgClient.end();
    }

    // 2. Auth Sync
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    console.log("Syncing admin to Supabase Auth...");

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        id: adminUser.id,
        email: adminUser.email,
        password: "SocialJuridico123!",
        email_confirm: true,
        user_metadata: { 
            full_name: adminUser.name,
            role: 'ADMIN',
            needs_password_update: true
        }
    });

    if (authError) {
        if (authError.message.includes("already has been registered")) {
            console.log("Admin already exists in Auth. Updating flag...");
            await supabase.auth.admin.updateUserById(adminUser.id, {
                user_metadata: { needs_password_update: true, role: 'ADMIN' }
            });
        } else {
            console.error("Auth error:", authError.message);
        }
    } else {
        console.log("Admin created in Supabase Auth successfully.");
    }

    console.log("\nSetup Admin finalizado!");
}

setupAdmin().catch(console.error);
