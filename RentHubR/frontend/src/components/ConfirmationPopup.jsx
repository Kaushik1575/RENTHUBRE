import React from 'react';

const ConfirmationPopup = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    isLoading = false,
    icon = null
}) => {
    if (!isOpen) return null;

    // Design configuration matching StatusPopup
    const config = {
        icon: icon || (type === 'danger' ? 'fa-trash-alt' : 'fa-exclamation-triangle'),
        iconColor: type === 'danger' ? '#f44336' : '#ff9800',
        iconBg: type === 'danger' ? '#ffebee' : '#fff3e0',
        confirmBtnBg: type === 'danger' ? '#f44336' : '#2196f3',
        cancelBtnBg: '#e0e0e0',
        cancelBtnColor: '#333'
    };

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
            backdropFilter: 'blur(3px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                width: '90%',
                maxWidth: '380px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                animation: 'popup-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Icon Container - Circular */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    background: config.iconBg,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <i className={`fas ${config.icon}`} style={{
                        color: config.iconColor,
                        fontSize: '2.2rem'
                    }}></i>
                </div>

                {/* Title */}
                <h2 style={{
                    color: '#2d3748',
                    marginBottom: '0.5rem',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    lineHeight: '1.2'
                }}>
                    {title || 'Are you sure?'}
                </h2>

                {/* Message */}
                <div style={{
                    color: '#718096',
                    marginBottom: '2rem',
                    fontSize: '1rem',
                    lineHeight: '1.5',
                    maxWidth: '100%'
                }}>
                    {message}
                </div>

                {/* Buttons Container */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    width: '100%',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        style={{
                            background: config.cancelBtnBg,
                            color: config.cancelBtnColor,
                            border: 'none',
                            padding: '0.8rem 0',
                            flex: 1,
                            borderRadius: '50px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            transition: 'transform 0.1s ease'
                        }}
                        onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        onMouseDown={e => !isLoading && (e.currentTarget.style.transform = 'translateY(1px)')}
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            background: config.confirmBtnBg,
                            color: 'white',
                            border: 'none',
                            padding: '0.8rem 0',
                            flex: 1,
                            borderRadius: '50px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1,
                            transition: 'transform 0.1s ease, box-shadow 0.2s',
                            boxShadow: `0 4px 12px ${type === 'danger' ? 'rgba(244, 67, 54, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`
                        }}
                        onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        onMouseDown={e => !isLoading && (e.currentTarget.style.transform = 'translateY(1px)')}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>

            <style>
                {`
                @keyframes popup-scale-in {
                    0% { opacity: 0; transform: scale(0.9); }
                    100% { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
        </div>
    );
};

export default ConfirmationPopup;
