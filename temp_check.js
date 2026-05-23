const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch[1].trim().replace(/['"]/g, '') + '/rest/v1';
const key = keyMatch[1].trim().replace(/['"]/g, '');

async function check() {
  const lawyerId = 'beacdb5e-291c-4231-a024-952805edfd14';
  
  const resInterests = await fetch(url + '/case_interests?lawyer_id=eq.' + lawyerId, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  console.log('Interesses:', await resInterests.json());

  const resCases = await fetch(url + '/casos?advogado_id=eq.' + lawyerId, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  console.log('Casos Atribuidos:', await resCases.json());
}
check();
