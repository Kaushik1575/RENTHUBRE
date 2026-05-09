
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:\\Users\\ASUS\\OneDrive\\Desktop\\RentHub\\RentHubR\\backend\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('--- BIKES ---');
    const { data: b } = await supabase.from('bikes').select('*').limit(1);
    if (b && b.length) console.log(Object.keys(b[0]));
    else console.log('No bikes data');

    console.log('--- CARS ---');
    const { data: c } = await supabase.from('cars').select('*').limit(1);
    if (c && c.length) console.log(Object.keys(c[0]));
    else console.log('No cars data');

    console.log('--- SCOOTY ---');
    const { data: s } = await supabase.from('scooty').select('*').limit(1);
    if (s && s.length) console.log(Object.keys(s[0]));
    else console.log('No scooty data');
}

checkSchema();
