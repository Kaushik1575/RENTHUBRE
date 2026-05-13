require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const email = 'dask64576@gmail.com';
    const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    const { data: agent } = await supabase.from('delivery_agents').select('*').eq('email', email).maybeSingle();
    
    // Also check Supabase Auth list
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const ghostUser = authUsers?.users?.find(u => u.email === email);

    console.log('--- DATABASE CHECK ---');
    console.log('Email:', email);
    console.log('Exists in users table:', !!user);
    console.log('Exists in delivery_agents table:', !!agent);
    console.log('Exists in Supabase Auth:', !!ghostUser);
    
    if (user) console.log('User Role:', user.is_admin ? 'Admin' : 'Customer');
    if (ghostUser) console.log('Ghost User ID:', ghostUser.id);
}

check();
