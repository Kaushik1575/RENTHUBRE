const supabase = require('../config/supabase'); 
(async () => { 
    console.log('--- Starting DB Fix for valid_days ---');
    const { data, error } = await supabase.from('offers').select('id, valid_days'); 
    if (error) {
        console.error('Error fetching offers:', error);
        return;
    }
    
    for (const offer of data) { 
        if (offer.valid_days && (offer.valid_days.includes('[') || offer.valid_days.includes(']') || offer.valid_days.includes('"'))) { 
            const clean = offer.valid_days.replace(/[\[\]"]/g, ''); 
            console.log(`Fixing Offer ID ${offer.id}: "${offer.valid_days}" -> "${clean}"`); 
            const { error: updateError } = await supabase.from('offers').update({ valid_days: clean }).eq('id', offer.id); 
            if (updateError) console.error(`Failed to fix ${offer.id}:`, updateError);
        } 
    } 
    console.log('--- DB Fix Complete ---');
    process.exit(0); 
})();
