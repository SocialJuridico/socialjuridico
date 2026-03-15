require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAuth() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error(error);
        return;
    }
    
    console.log("--- BUSCANDO NO AUTH ---");
    const targets = ['mxsgamejps@gmail.com', 'mxsgamejps@gmail.com.br', 'marysaujps@gmail.com'];
    users.forEach(u => {
        if (targets.some(t => u.email.includes(t)) || u.email.includes('mxsgamejps')) {
            console.log(`EMAIL: ${u.email} ID: ${u.id}`);
        }
    });
}

checkAuth();
