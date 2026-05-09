
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
    console.log('🚀 Starting Support System Migration...');
    
    // Add attachment_url column to issues table
    const { error } = await supabase.rpc('run_sql', {
        sql: `ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_url TEXT;`
    });

    if (error) {
        console.log('⚠️ RPC run_sql failed (expected if not configured). Trying direct query approach...');
        // Since we can't run raw SQL easily via client without RPC, we suggest the user runs it.
        console.error('Please run this SQL in your Supabase SQL Editor:');
        console.log('ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS attachment_url TEXT;');
    } else {
        console.log('✅ Column attachment_url added successfully.');
    }
}

migrate();
