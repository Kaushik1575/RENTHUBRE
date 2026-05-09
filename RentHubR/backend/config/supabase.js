const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables from the backend directory's .env file
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

console.log("Loading Supabase Config...");
console.log("CWD:", process.cwd());
console.log("Env path resolved to:", envPath);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL present:", !!supabaseUrl);
console.log("Supabase Key present:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials. Please check your .env file.');
    console.error('Expected SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
    process.exit(1); 
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 