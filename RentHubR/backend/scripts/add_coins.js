const supabase = require('../config/supabase');

async function addCoins() {
    const userId = 43; // Current user
    const coinsToAdd = 5000;

    console.log(`Adding ${coinsToAdd} coins to user ${userId}...`);

    // First get current balance
    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('super_coins')
        .eq('id', userId)
        .single();

    if (fetchError) {
        console.error('Error fetching user:', fetchError);
        return;
    }

    const newBalance = (user.super_coins || 0) + coinsToAdd;

    // Update
    const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ super_coins: newBalance })
        .eq('id', userId)
        .select();

    if (updateError) console.error('Error updating coins:', updateError);
    else console.log(`Success! New balance: ${newBalance} 🪙`);
}

addCoins();
