require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findIds() {
    let allUsers = [];
    let page = 0;
    while(true) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: ++page, perPage: 1000 });
        if (error || users.length === 0) break;
        allUsers = allUsers.concat(users);
        if (users.length < 1000) break;
    }
    
    allUsers.filter(u => u.email.includes('mxsgamejps')).forEach(u => console.log(`${u.email}|${u.id}`));
}

findIds();
