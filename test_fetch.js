const fs = require('fs');
const path = require('path');

async function testFetch() {
  const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const anonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
  const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();

  console.log("Fetching casos to check columns...");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/casos?limit=1`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`, 
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
     console.log("Error:", await res.text());
     return;
  }
  const data = await res.json();
  if (data.length > 0) {
     console.log("Available columns in casos:", Object.keys(data[0]));
  } else {
     console.log("No cases found");
  }
}

testFetch();
