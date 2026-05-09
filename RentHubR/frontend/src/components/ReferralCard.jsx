import React from 'react';

const ReferralCard = ({ code }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        // Assuming parent handles toast or we just alert
        const btn = document.getElementById('copy-btn-icon');
        if (btn) btn.className = 'fas fa-check';
        setTimeout(() => { if (btn) btn.className = 'far fa-copy'; }, 2000);
    };

    const handleShare = () => {
        const text = `🌟 Exclusive Invite: Join RentHub Premium 🌟

Hi Friend! 👋

I've been using RentHub for my rides and it's AMAZING! 
Want to try it? Use my referral code and get rewarded!

🎁 YOUR WELCOME BONUS:
━━━━━━━━━━━━━━━━━━━
✅ ₹200 Bonus Points (Instant!)
✅ Earn 1 Point per minute on rides
✅ Redeem for FREE rides
✅ Access to premium bikes, scooters & cars

💰 HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━
1️⃣ Sign up using my link
2️⃣ Enter referral code: ${code}
3️⃣ Get ₹200 points credited instantly
4️⃣ Start booking & earning more!

🔗 CLAIM YOUR BONUS:
${window.location.origin}/?ref=${code}

⏰ Limited time offer - Join now!

Happy Riding! 🚗💨`;

        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Navi/PhonePe style gradient
    // Purple/Blue vibrant gradient

    return (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '24px',
            padding: '40px',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(118, 75, 162, 0.3)',
            marginBottom: '40px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations */}
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
            <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    width: '70px', height: '70px', margin: '0 auto 20px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <i className="fas fa-gift" style={{ fontSize: '32px', color: '#fff' }}></i>
                </div>

                <h2 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Refer & Earn</h2>
                <p style={{ fontSize: '16px', opacity: 0.95, marginBottom: '30px', maxWidth: '450px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
                    Invite your friends to RentHub! They get <b>₹200</b> worth of reward points on signup, and you get a <span style={{ color: '#ffd700', fontWeight: 'bold' }}>Scratch Card</span> for every friend who joins.
                </p>

                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '8px 12px 8px 24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: '100%',
                    width: '320px'
                }}>
                    <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '2px', fontFamily: 'monospace', color: '#fff' }}>
                        {code || 'LOADING'}
                    </span>
                    <button onClick={handleCopy} style={{
                        background: 'white', border: 'none', borderRadius: '12px',
                        width: '44px', height: '44px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#764ba2', transition: 'transform 0.2s'
                    }}>
                        <i id="copy-btn-icon" className="far fa-copy" style={{ fontSize: '18px' }}></i>
                    </button>
                </div>

                <div style={{ marginTop: '30px' }}>
                    <button onClick={handleShare} style={{
                        padding: '14px 40px', borderRadius: '50px', border: 'none',
                        background: '#ffd700', color: '#764ba2', fontWeight: 'bold', fontSize: '16px',
                        cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        display: 'inline-flex', alignItems: 'center', gap: '10px'
                    }}>
                        <i className="fas fa-share-alt"></i> Share via WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReferralCard;
