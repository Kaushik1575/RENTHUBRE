require('dotenv').config({ path: './backend/.env' });
const supabase = require('./backend/config/supabase');

async function testOffers() {
    try {
        console.log('Testing connection to "offers" table...');
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching offers:', error);
            if (error.code === '42P01') {
                console.log('Table "offers" does not exist.');
            }
        } else {
            console.log('Successfully connected to "offers" table.');
            console.log('Data found:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testOffers();
