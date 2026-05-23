const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const url = urlMatch[1].trim().replace(/['"]/g, '') + '/rest/v1';
const key = keyMatch[1].trim().replace(/['"]/g, '');

async function check() {
  // Check RLS policies on crm_clients
  const res = await fetch(
    `${urlMatch[1].trim().replace(/['"]/g, '')}/rest/v1/crm_clients?lawyer_id=eq.beacdb5e-291c-4231-a024-952805edfd14&limit=5`,
    { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } }
  );
  const data = await res.json();
  console.log('crm_clients (admin):', data.length, 'registros');
  console.log('Amostra:', data[0]);
  
  // Also check finance table name
  const res2 = await fetch(
    `${urlMatch[1].trim().replace(/['"]/g, '')}/rest/v1/financial_entries?lawyer_id=eq.beacdb5e-291c-4231-a024-952805edfd14&limit=5`,
    { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } }
  );
  const data2 = await res2.json();
  if (Array.isArray(data2)) {
    console.log('financial_entries:', data2.length, 'registros');
  } else {
    console.log('financial_entries error:', data2);
  }
}
check();
