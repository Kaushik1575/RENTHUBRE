const supabase = require('./config/supabase');
async function check() {
    try {
        const { data, error } = await supabase.from('offers').select('id, title, is_active, valid_until');
        if (error) {
            console.error('Error:', error);
            return;
        }
        console.log('Total Offers in DB:', data.length);
        console.log('Offers:', JSON.stringify(data, null, 2));
        
        const today = new Date().toISOString();
        const activeAndValid = data.filter(o => 
            o.is_active && (!o.valid_until || o.valid_until >= today)
        );
        console.log('Active and Valid Count (JS filter):', activeAndValid.length);

        const { count, error: countErr } = await supabase.from('offers').select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .or(`valid_until.gte.${today},valid_until.is.null`);
        console.log('Active and Valid Count (Supabase query):', count);
        console.log('Supabase Error:', countErr);
    } catch (e) {
        console.error('Crash:', e);
    }
}
check();
