const supabase = require('../config/supabase');

async function addBulkCoins() {
    try {
        console.log('🪙 Adding 100,000 Super Coins to test accounts...\n');

        const targetUsers = [
            'jyoti ranjan sahoo',
            'jyoti swarup parhi'
        ];

        const coinsToAdd = 100000;

        for (const userName of targetUsers) {
            // Find user by name (case-insensitive)
            const { data: users, error: fetchError } = await supabase
                .from('users')
                .select('id, full_name, super_coins')
                .ilike('full_name', userName);

            if (fetchError) {
                console.error(`❌ Error fetching user "${userName}":`, fetchError.message);
                continue;
            }

            if (!users || users.length === 0) {
                console.log(`⚠️  User "${userName}" not found. Skipping...`);
                continue;
            }

            const user = users[0];
            const currentCoins = user.super_coins || 0;
            const newBalance = currentCoins + coinsToAdd;

            // Update coins
            const { error: updateError } = await supabase
                .from('users')
                .update({ super_coins: newBalance })
                .eq('id', user.id);

            if (updateError) {
                console.error(`❌ Error updating coins for "${user.full_name}":`, updateError.message);
                continue;
            }

            console.log(`✅ ${user.full_name} (ID: ${user.id})`);
            console.log(`   Previous Balance: ${currentCoins.toLocaleString()} coins`);
            console.log(`   Added: +${coinsToAdd.toLocaleString()} coins`);
            console.log(`   New Balance: ${newBalance.toLocaleString()} coins 🎉\n`);
        }

        console.log('✨ Bulk coin addition complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Script error:', error);
        process.exit(1);
    }
}

addBulkCoins();
