import React from 'react';

const TermsPopup = ({ isOpen, onClose, onAccept, onDecline }) => {
    if (!isOpen) return null;

    const terms = [
        {
            id: 1,
            title: 'Booking Confirmation',
            icon: '📋',
            color: '#2196F3',
            bgColor: '#E3F2FD',
            points: [
                'Advance booking is confirmed only after successful payment of the advance amount.',
                'A confirmation message/email will be sent once the booking is verified.'
            ]
        },
        {
            id: 2,
            title: 'Advance Payment',
            icon: '💰',
            color: '#4CAF50',
            bgColor: '#E8F5E9',
            points: [
                'A minimum of ₹100/- or 30% of the total rental amount must be paid in advance to secure your booking.',
                'The remaining amount must be paid at the time of pickup.'
            ]
        },
        {
            id: 3,
            title: 'Cancellation Policy',
            icon: '⏰',
            color: '#FF9800',
            bgColor: '#FFF3E0',
            points: [
                'Cancellation 2 hours before the booking time → Full refund of advance.',
                'Cancellation within 2 hours of/after booking time → 50% of the advance will be deducted.',
                'No show without cancellation → No refund.'
            ]
        },
        {
            id: 4,
            title: 'Required Documents',
            icon: '📄',
            color: '#00BCD4',
            bgColor: '#E0F7FA',
            points: [
                'Valid Aadhar Card & Original Driving License must be shown at the time of pickup.',
                'The booking will be cancelled if valid documents are not presented.'
            ]
        },
        {
            id: 5,
            title: 'Vehicle Usage',
            icon: '🚲',
            color: '#F44336',
            bgColor: '#FFEBEE',
            points: [
                'The vehicle should be used only by the registered renter.',
                'Sub-renting or transfer of booking is strictly prohibited.',
                'Any damage or traffic violation fines during the rental period are the renter\'s responsibility.'
            ]
        },
        {
            id: 6,
            title: 'Late Return',
            icon: '⏱️',
            color: '#FF5722',
            bgColor: '#FBE9E7',
            points: [
                'Delay beyond the scheduled return time will incur late fees per hour.',
                'Please inform us in advance if you anticipate a delay.'
            ]
        },
        {
            id: 7,
            title: 'Refund Policy',
            icon: '💳',
            color: '#4CAF50',
            bgColor: '#E8F5E9',
            points: [
                'Refunds (if applicable) will be processed within 3 - 5 working days after cancellation.'
            ]
        },
        {
            id: 8,
            title: 'Company Rights',
            icon: '🏢',
            color: '#607D8B',
            bgColor: '#ECEFF1',
            points: [
                'The company reserves the right to cancel any booking due to unforeseen issues (vehicle unavailability, technical problems, or policy violations).',
                'In such cases, a full refund of the advance will be provided.'
            ]
        }
    ];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(3px)',
            fontFamily: "'Segoe UI', sans-serif"
        }}>
            <div className="terms-popup-content" style={{
                background: 'white',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '600px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                animation: 'popup-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#333' }}>Terms and Conditions</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#999', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Body - Scrollable */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    scrollbarWidth: 'thin'
                }}>
                    {terms.map((item) => (
                        <div key={item.id} style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '1rem',
                            background: 'white',
                            border: '1px solid #eee',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                        }}>
                            {/* Colorful Strip */}
                            <div style={{ width: '6px', background: item.color, flexShrink: 0 }}></div>

                            <div style={{ padding: '12px 15px', flex: 1 }}>
                                <h3 style={{
                                    margin: '0 0 8px 0',
                                    fontSize: '1rem',
                                    color: item.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontWeight: '900', opacity: 0.8 }}>{item.id}.</span>
                                    <span>{item.icon}</span>
                                    {item.title}
                                </h3>
                                <ul style={{
                                    margin: 0,
                                    paddingLeft: '1.2rem',
                                    fontSize: '0.85rem',
                                    color: '#555',
                                    lineHeight: '1.5'
                                }}>
                                    {item.points.map((point, idx) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>{point}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0 0 12px 12px'
                }}>
                    <button
                        onClick={onDecline}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#78909C', // Grey
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#00C853', // Green
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            boxShadow: '0 2px 8px rgba(0, 200, 83, 0.3)'
                        }}
                    >
                        Accept
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes popup-scale-in {
                    0% { opacity: 0; transform: scale(0.95); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default TermsPopup;
