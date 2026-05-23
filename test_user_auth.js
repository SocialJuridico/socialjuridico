const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uwkcdwlgobnhowumcdnp.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYxMTI0MiwiZXhwIjoyMDg5MTg3MjQyfQ.0iDHVz-TlGt031F7x5CPDKy6BOzZZk3j8eZLCed_oEo";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTEyNDIsImV4cCI6MjA4OTE4NzI0Mn0.Nz-2pITIzlzZW-sePHXAyW6Kz19p45vlMN22Z8VEYEk";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const testEmail = "test_auth_diag@socialjuridico.com.br";
const testPassword = "TestPassword123!";

async function run() {
  let userId = null;
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    userId = authUser.user.id;

    const { data: sessionData } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    const token = sessionData.session.access_token;

    console.log("--- TEST 1: Using supabaseAdmin.auth.getUser(token) ---");
    const { data: userAdmin, error: errorAdmin } = await supabaseAdmin.auth.getUser(token);
    console.log("User:", userAdmin.user ? "Found" : "Null");
    console.log("Error:", errorAdmin);

    console.log("--- TEST 2: Using supabaseAnon.auth.getUser(token) ---");
    // Wait, let's create a client without global authorization header override
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: userAnon, error: errorAnon } = await tempClient.auth.getUser(token);
    console.log("User:", userAnon.user ? "Found" : "Null");
    console.log("Error:", errorAnon);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    if (userId) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    }
  }
}

run();
