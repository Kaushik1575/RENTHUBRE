import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ScratchCard from '../components/ScratchCard';
import ReferralCard from '../components/ReferralCard';
import StatusPopup from '../components/StatusPopup';

const RewardsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ rewards: [], scratchCards: [], referralCode: '' });
    const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login if not authenticated, preserving the destination
            navigate('/login', { state: { from: location } });
            return;
        }
        fetchRewardsData();
    }, [navigate, location]);

    const fetchRewardsData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/user/rewards', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                console.log('Rewards Data:', result);
                if (result.success) {
                    setData(result);
                } else {
                    console.error('Rewards API failed:', result.message);
                }
            } else {
                if (res.status === 401 || res.status === 403) {
                    // Token expired or invalid - redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login', { state: { from: location } });
                    return;
                }
                console.error('Rewards API fetch error:', res.status);
            }
        } catch (error) {
            console.error('Rewards Page Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScratchReveal = async (cardId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/user/scratch-claim', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cardId })
            });
            const result = await res.json();
            if (result.success) {
                setData(prev => ({
                    ...prev,
                    scratchCards: prev.scratchCards.map(card =>
                        card.id === cardId ? { ...card, is_scratched: true, prize_type: result.card.prize_type, prize_value: result.card.prize_value } : card
                    )
                }));
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => { });
                return true;
            }
        } catch (e) {
            console.error(e);
        }
        return false;
    };


    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner"></div></div>;


    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', sans-serif" }}>
            <Navbar />

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 20px 50px 20px' }}>

                {/* Header Section */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a1a' }}>My Rewards</h1>
                    <p style={{ color: '#666' }}>Manage your reward points and benefits</p>
                </div>


                {/* Referral Section (Kept from new design) */}
                <ReferralCard code={data.referralCode} />

                {/* Scratch Cards Grid */}
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-layer-group" style={{ color: '#6366f1' }}></i> Your Scratch Cards
                    </h2>

                    {data.scratchCards.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px',
                            background: 'white', borderRadius: '20px',
                            color: '#9ca3af', boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                        }}>
                            <img src="https://cdn-icons-png.flaticon.com/512/7486/7486747.png" alt="Empty" style={{ width: '80px', opacity: 0.5, marginBottom: '20px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No rewards yet</h3>
                            <p>Invite your friends to start earning!</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            gap: '25px',
                            overflowX: 'auto',
                            padding: '10px 5px 30px 5px', // Bottom padding for scrollbar/shadow
                            scrollSnapType: 'x mandatory',
                            scrollbarWidth: 'none', // Hide scrollbar Firefox
                            msOverflowStyle: 'none', // Hide scrollbar IE
                            maskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)', // Fade effect
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 2%, black 98%, transparent)'
                        }}>
                            <style>{`
                                .rewards-slider::-webkit-scrollbar { display: none; }
                            `}</style>

                            {data.scratchCards.map((card, index) => (
                                <div key={card.id} id={`scratch-card-${card.id}`} style={{
                                    flex: '0 0 auto',
                                    scrollSnapAlign: 'start'
                                }}>
                                    <ScratchCard card={card} onReveal={handleScratchReveal} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                customActions={popup.customActions}
            />
        </div>
    );
};

export default RewardsPage;
