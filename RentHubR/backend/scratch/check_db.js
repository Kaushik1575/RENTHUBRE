require('dotenv').config();
const supabase = require('../config/supabase');

async function checkTable() {
    console.log('Checking "issues" table...');
    const { data, error } = await supabase.from('issues').select('*').limit(1);
    
    if (error) {
        console.error('❌ Table check failed:', error.message);
        console.error('Full Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ "issues" table exists!');
        console.log('Data sample:', data);
    }
    process.exit();
}

checkTable();
