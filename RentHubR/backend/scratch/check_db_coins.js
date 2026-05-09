const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
        console.error('Error:', error);
    } else {
        console.table(data.map(u => ({ id: u.id, name: u.full_name, coins: u.super_coins })));
    }
}

checkUsers();
