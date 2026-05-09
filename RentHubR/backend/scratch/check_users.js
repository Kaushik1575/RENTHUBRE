const supabase = require('../config/supabase');

async function checkUsersSchema() {
    console.log('Checking "users" table columns...');
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });
    
    if (error) {
        // Fallback: just select one user and see keys
        const { data: users, error: selectError } = await supabase.from('users').select('*').limit(1);
        if (selectError) {
            console.error('Error fetching users:', selectError.message);
        } else {
            console.log('User sample keys:', Object.keys(users[0] || {}));
            console.log('User sample values:', users[0]);
        }
    } else {
        console.log('Columns:', data);
    }
    process.exit();
}

checkUsersSchema();
