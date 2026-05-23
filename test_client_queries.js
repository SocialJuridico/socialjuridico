const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://uwkcdwlgobnhowumcdnp.supabase.co";
// Pegar ANON KEY do .env
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQxMDcxNTQsImV4cCI6MjAyNTY4MzE1NH0.uU9zKxX-hVpXqHXZj17X1hG0iR5Vq4tQ-y8T1ZfC5c";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2Nkd2xnb2JuaG93dW1jZG5wIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwic3ViIjoiZjg4MTcxYzgtNjRiNC00YTYxLTliNzctNjgyMWZhNzYzZTM4IiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiU2F1bG8iLCJwaG9uZSI6IjI3OTk1ODAxMjc4In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYW1yIjpbeyJtZXRob2QiOiJvdHAiLCJ0aW1lc3RhbXAiOjE3NzM2MTEyNDB9XSwic2Vzc2lvbl9pZCI6IjY0NGI5MzE5LWVkOWItNGM1OC05ZmI4LWYyZDdjMjVjMGRiNiIsImlhdCI6MTc3MzYxMTI0MCwiZXhwIjoxNzczNjE0ODQwfQ.8h5aMiy64fW-0Zl-J9k6c6N_LdFkE4B0m2sQ5kY7XG8";

async function testSupabase() {
  const scopedSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  console.log("=== TESTANDO getLawyerCases ===");
  const res1 = await scopedSupabase
    .from('casos')
    .select('*')
    .limit(1);
  console.log("RES1:", res1.error || "SUCESSO - " + res1.data.length + " casos");

  console.log("=== TESTANDO getMarketplaceCases ===");
  const res2 = await scopedSupabase
    .from('casos')
    .select('*')
    .is('advogado_id', null)
    .in('status', ['ABERTO', 'NEGOCIANDO'])
    .limit(1);
  console.log("RES2:", res2.error || "SUCESSO - " + res2.data.length + " casos");

}

testSupabase();
