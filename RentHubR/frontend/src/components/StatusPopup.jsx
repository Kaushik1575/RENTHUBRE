import React from 'react';

const StatusPopup = ({ isOpen, onClose, onConfirm, type = 'error', title, message, confirmText = 'Yes, Proceed', cancelText = 'Cancel', customActions }) => {
    if (!isOpen) return null;

    const isSuccess = type === 'success';
    const isConfirm = type === 'confirm';
    const isInfo = type === 'info';
    const isWarning = type === 'warning';

    // Design configuration with premium color palettes
    const config = {
        icon: isSuccess ? 'fa-check' : (isConfirm || isWarning ? 'fa-exclamation-triangle' : (isInfo ? 'fa-info' : 'fa-times')),
        // Using high-contrast, professional colors
        iconColor: isSuccess ? '#10b981' : (isWarning ? '#f59e0b' : '#ef4444'), 
        // Soft gradients for a premium feel
        iconBg: isSuccess ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : (isWarning ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'),
        btnBg: isSuccess ? '#10b981' : (isWarning ? '#f59e0b' : '#ef4444'),
        defaultTitle: isSuccess ? 'Success' : (isWarning ? 'Notice' : (isConfirm ? 'Security Alert' : (isInfo ? 'Information' : 'Error'))),
        btnText: 'Okay, Got it'
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(15, 23, 42, 0.4)', // Sophisticated dark slate overlay
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)', // More blur for premium feel
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '32px', // Modern, very rounded corners
                width: '90%',
                maxWidth: '400px',
                padding: '3rem 2.5rem',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                animation: 'popupEntry 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Subtle top accent line */}
                <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '6px', 
                    background: config.btnBg 
                }}></div>

                {/* Icon Container */}
                <div style={{
                    width: '90px',
                    height: '90px',
                    background: config.iconBg,
                    borderRadius: '24px', // Squircle shape for modern look
                    transform: 'rotate(45deg)', // Rotated container
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    <i className={`fas ${config.icon}`} style={{
                        color: config.iconColor,
                        fontSize: '2.5rem',
                        transform: 'rotate(-45deg)' // Rotate icon back
                    }}></i>
                </div>

                {/* Title */}
                <h2 style={{
                    color: '#0f172a',
                    marginBottom: '0.75rem',
                    fontSize: '1.75rem',
                    fontWeight: '900',
                    letterSpacing: '-0.5px'
                }}>
                    {title || config.defaultTitle}
                </h2>

                {/* Message */}
                <div style={{
                    color: '#475569',
                    marginBottom: '2.5rem',
                    fontSize: '1.05rem',
                    lineHeight: '1.6',
                    fontWeight: '500'
                }}>
                    {message}
                </div>

                {/* Buttons */}
                {customActions ? (
                    <div style={{ width: '100%' }}>
                        {customActions}
                    </div>
                ) : isConfirm ? (
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'center' }}>
                        <button
                            onClick={onClose}
                            className="status-btn-secondary"
                            style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                border: 'none',
                                padding: '1rem 0',
                                flex: 1,
                                borderRadius: '16px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className="status-btn-primary"
                            style={{
                                background: config.btnBg,
                                color: 'white',
                                border: 'none',
                                padding: '1rem 0',
                                flex: 1,
                                borderRadius: '16px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: `0 10px 15px -3px ${config.btnBg}40`
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onClose}
                        className="status-btn-primary"
                        style={{
                            background: config.btnBg,
                            color: 'white',
                            border: 'none',
                            padding: '1.1rem 2rem',
                            width: '100%',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: `0 10px 15px -3px ${config.btnBg}40`
                        }}
                    >
                        {config.btnText}
                    </button>
                )}
            </div>

            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes popupEntry {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .status-btn-primary:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
                }
                .status-btn-primary:active {
                    transform: translateY(0);
                }
                .status-btn-secondary:hover {
                    background: #e2e8f0;
                    color: #1e293b;
                }
                `}
            </style>
        </div>
    );
};

export default StatusPopup;
