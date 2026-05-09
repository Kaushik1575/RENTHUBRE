import React, { useState } from 'react';

const ScratchCard = ({ card, onReveal }) => {
    const [isRevealed, setIsRevealed] = useState(card.is_scratched);
    const [isScratching, setIsScratching] = useState(false);

    const handleReveal = async () => {
        if (isRevealed) return;
        setIsScratching(true);

        // Simulate scratch effect duration
        setTimeout(async () => {
            const success = await onReveal(card.id);
            if (success) {
                setIsRevealed(true);
            }
            setIsScratching(false);
        }, 1200);
    };

    return (
        <div style={{
            width: '300px', // Fixed Width
            height: '180px', // Fixed Height (Landscape)
            borderRadius: '16px',
            position: 'relative',
            cursor: isRevealed ? 'default' : 'pointer',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            transform: isScratching ? 'scale(0.98)' : 'scale(1)',
            transition: 'transform 0.2s',
            marginRight: 'auto' // Ensure left alignment in flex/grid
        }}
            onClick={handleReveal}
        >
            {/* Scratched State (Prize) */}
            {isRevealed && (
                <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fff 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    border: '3px solid #FFD700',
                    borderRadius: '16px',
                    boxSizing: 'border-box',
                    padding: '10px',
                    boxShadow: 'inset 0 0 20px rgba(255, 215, 0, 0.1)'
                }}>
                    <div style={{ fontSize: '42px', marginBottom: '2px', lineHeight: 1 }}>
                        {card.prize_type === 'COINS' ? '🪙' : '🎟️'}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1f2937', lineHeight: 1.1 }}>
                        {card.prize_type === 'COINS' ? `₹${card.prize_value}` : 'Coupon'}
                    </div>
                    {card.prize_type === 'COINS' && <div style={{ fontSize: '12px', color: '#059669', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Points Added</div>}
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: 'auto' }}>
                        Won on {new Date(card.updated_at || Date.now()).toLocaleDateString()}
                    </div>
                </div>
            )}

            {/* Unscratched State (Cover) */}
            {!isRevealed && (
                <div className={`scratch-cover ${isScratching ? 'active' : ''}`} style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(45deg, #1fa2ff, #12d8fa, #a6ffcb)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'absolute', top: 0, left: 0
                }}>
                    <div style={{
                        width: '60px', height: '60px', background: 'rgba(255,255,255,0.25)',
                        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '10px'
                    }}>
                        <i className="fas fa-trophy" style={{ color: 'white', fontSize: '24px' }}></i>
                    </div>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {isScratching ? 'Scratching...' : 'Scratch Card'}
                    </span>

                    {/* Pattern Overlay */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                        backgroundSize: '10px 10px',
                        pointerEvents: 'none'
                    }}></div>
                </div>
            )}

            <style>{`
                @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .scratch-cover.active { animation: shake 0.5s infinite; }
            `}</style>
        </div>
    );
};

export default ScratchCard;
