const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uwkcdwlgobnhowumcdnp.supabase.co";
// service role key to create/delete test user
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzYxMTI0MiwiZXhwIjoyMDg5MTg3MjQyfQ.0iDHVz-TlGt031F7x5CPDKy6BOzZZk3j8eZLCed_oEo";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MTEyNDIsImV4cCI6MjA4OTE4NzI0Mn0.Nz-2pITIzlzZW-sePHXAyW6Kz19p45vlMN22Z8VEYEk";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const testEmail = "test_lawyer_diagnostic_123@socialjuridico.com.br";
const testPassword = "TestPassword123!";

async function run() {
  let userId = null;
  try {
    console.log("1. Creating temporary test lawyer user...");
    // Create user in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Test Lawyer Diagnostic", role: "LAWYER" }
    });
    
    if (authError) throw authError;
    userId = authUser.user.id;
    console.log("Created user ID:", userId);

    // Create lawyer record in database to pass role check
    const { error: dbError } = await supabaseAdmin
      .from('advogados')
      .insert([{
        id: userId,
        email: testEmail,
        name: "Test Lawyer Diagnostic",
        role: "LAWYER",
        oab: "999999",
        estado: "SP",
        oab_verification_status: "VERIFIED"
      }]);

    if (dbError) throw dbError;
    console.log("Created database profile row.");

    // Sign in as user using anon client to get access_token
    console.log("2. Signing in to get client JWT token...");
    const { data: sessionData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    const token = sessionData.session.access_token;
    console.log("Logged in successfully. Access token length:", token.length);

    // 3. Query production API /api/perfil
    console.log("3. Fetching production /api/perfil...");
    const perfilRes = await fetch("https://socialjuridico.com.br/api/perfil", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("Response Status /api/perfil:", perfilRes.status);
    const perfilJson = await perfilRes.json();
    console.log("Response JSON /api/perfil:", JSON.stringify(perfilJson, null, 2));

    // 4. Query production API /api/notificacoes
    console.log("4. Fetching production /api/notificacoes...");
    const notifRes = await fetch("https://socialjuridico.com.br/api/notificacoes", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    console.log("Response Status /api/notificacoes:", notifRes.status);
    const notifJson = await notifRes.json();
    console.log("Response JSON /api/notificacoes:", JSON.stringify(notifJson, null, 2));

  } catch (err) {
    console.error("Diagnostic failed:", err);
  } finally {
    if (userId) {
      console.log("5. Cleaning up test user...");
      await supabaseAdmin.from('advogados').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.log("Cleanup finished.");
    }
  }
}

run();
