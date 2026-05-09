import React, { useState } from 'react';

const RefundDetailsPopup = ({
    isOpen,
    onClose,
    onSubmit,
    mode = 'rejected', // 'rejected' or 'cancellation'
    isLoading = false
}) => {
    if (!isOpen) return null;

    const [refundMethod, setRefundMethod] = useState('upi'); // 'upi' or 'bank'
    const [refundDetails, setRefundDetails] = useState({
        upiId: '',
        accountHolder: '',
        accountNumber: '',
        ifsc: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');

        // Validation
        if (refundMethod === 'upi') {
            if (!refundDetails.upiId.trim()) {
                setError('Please enter a valid UPI ID');
                return;
            }
        } else {
            if (!refundDetails.accountHolder.trim() || !refundDetails.accountNumber.trim() || !refundDetails.ifsc.trim()) {
                setError('Please fill in all bank details');
                return;
            }
        }

        onSubmit({
            method: refundMethod,
            ...refundDetails
        });
    };

    // Design configuration (matching ConfirmationPopup style)
    const config = {
        icon: 'fa-money-bill-wave',
        iconColor: '#2196f3',
        iconBg: '#e3f2fd',
        confirmBtnBg: '#2196f3',
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
                maxWidth: '420px',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                animation: 'popup-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#888'
                    }}
                >
                    &times;
                </button>

                {/* Icon Container - Circular */}
                <div style={{
                    width: '70px',
                    height: '70px',
                    background: config.iconBg,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    minHeight: '70px' // Prevent shrinking
                }}>
                    <i className={`fas ${config.icon}`} style={{
                        color: config.iconColor,
                        fontSize: '1.8rem'
                    }}></i>
                </div>

                {/* Title */}
                <h2 style={{
                    color: '#2d3748',
                    marginBottom: '0.5rem',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    lineHeight: '1.2'
                }}>
                    {mode === 'cancellation' ? 'Confirm Cancellation' : 'Refund Details'}
                </h2>

                {/* Message */}
                <p style={{
                    color: '#718096',
                    marginBottom: '1.5rem',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                }}>
                    {mode === 'cancellation'
                        ? 'Please provide your refund details to process the cancellation:'
                        : 'Your booking was rejected. Please provide details for refund:'}
                </p>

                {/* Form Content */}
                <div style={{ width: '100%', textAlign: 'left', marginBottom: '1.5rem' }}>

                    {/* Method Selection */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', justifyContent: 'center' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            background: refundMethod === 'upi' ? '#e3f2fd' : '#f8f9fa',
                            border: `1px solid ${refundMethod === 'upi' ? '#2196f3' : '#ddd'}`,
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: refundMethod === 'upi' ? '600' : 'normal',
                            color: refundMethod === 'upi' ? '#1565c0' : '#555'
                        }}>
                            <input
                                type="radio"
                                name="refundMethod"
                                checked={refundMethod === 'upi'}
                                onChange={() => setRefundMethod('upi')}
                                style={{ accentColor: '#2196f3' }}
                            />
                            UPI / GPay
                        </label>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            background: refundMethod === 'bank' ? '#e3f2fd' : '#f8f9fa',
                            border: `1px solid ${refundMethod === 'bank' ? '#2196f3' : '#ddd'}`,
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: refundMethod === 'bank' ? '600' : 'normal',
                            color: refundMethod === 'bank' ? '#1565c0' : '#555'
                        }}>
                            <input
                                type="radio"
                                name="refundMethod"
                                checked={refundMethod === 'bank'}
                                onChange={() => setRefundMethod('bank')}
                                style={{ accentColor: '#2196f3' }}
                            />
                            Bank Transfer
                        </label>
                    </div>

                    {/* Inputs */}
                    {refundMethod === 'upi' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: '500' }}>UPI ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 9876543210@upi"
                                    value={refundDetails.upiId}
                                    onChange={e => setRefundDetails({ ...refundDetails, upiId: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '0.95rem',
                                        outlineColor: '#2196f3'
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: '500' }}>Account Holder Name</label>
                                <input
                                    type="text"
                                    placeholder="Name as per bank"
                                    value={refundDetails.accountHolder}
                                    onChange={e => setRefundDetails({ ...refundDetails, accountHolder: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', outlineColor: '#2196f3' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: '500' }}>Account Number</label>
                                <input
                                    type="text"
                                    placeholder="0000000000"
                                    value={refundDetails.accountNumber}
                                    onChange={e => setRefundDetails({ ...refundDetails, accountNumber: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', outlineColor: '#2196f3' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px', fontWeight: '500' }}>IFSC Code</label>
                                <input
                                    type="text"
                                    placeholder="ABCD0123456"
                                    value={refundDetails.ifsc}
                                    onChange={e => setRefundDetails({ ...refundDetails, ifsc: e.target.value })}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.95rem', outlineColor: '#2196f3' }}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <p style={{ color: '#d32f2f', fontSize: '0.85rem', marginTop: '0.8rem', textAlign: 'center', background: '#ffebee', padding: '5px', borderRadius: '4px' }}>
                            <i className="fas fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                            {error}
                        </p>
                    )}

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
                        Cancel
                    </button>

                    <button
                        onClick={handleSubmit}
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
                            boxShadow: `0 4px 12px rgba(33, 150, 243, 0.4)`
                        }}
                        onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        onMouseDown={e => !isLoading && (e.currentTarget.style.transform = 'translateY(1px)')}
                    >
                        {isLoading ? 'Processing...' : (mode === 'cancellation' ? 'Confirm & Cancel' : 'Submit Details')}
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

export default RefundDetailsPopup;
