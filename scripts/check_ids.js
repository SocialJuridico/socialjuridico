require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const brUser = users.find(u => u.email === 'mxsgamejps@gmail.com.br');
    const comUser = users.find(u => u.email === 'mxsgamejps@gmail.com');
    
    console.log("BR_USER:", brUser ? brUser.id : "NOT FOUND");
    console.log("COM_USER:", comUser ? comUser.id : "NOT FOUND");
}

check();
