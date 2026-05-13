import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import ConfirmationPopup from '../components/ConfirmationPopup';
import RefundDetailsPopup from '../components/RefundDetailsPopup';


const MyBookings = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [showCancellationModal, setShowCancellationModal] = useState(false);
    const [showRefundDetailsModal, setShowRefundDetailsModal] = useState(false);
    const [currentBookingId, setCurrentBookingId] = useState(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [refundFlowMode, setRefundFlowMode] = useState('rejected'); // 'rejected' or 'cancellation'

    // Success Popup State
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [popup, setPopup] = useState({ isOpen: false, type: 'error', title: '', message: '' });

    // Refund Form States
    const [refundMethod, setRefundMethod] = useState('upi'); // 'upi' or 'bank'
    const [refundDetails, setRefundDetails] = useState({
        upiId: '',
        accountHolder: '',
        accountNumber: '',
        ifsc: ''
    });

    const [editingAddressId, setEditingAddressId] = useState(null);
    const [newAddress, setNewAddress] = useState('');
    const [newDistance, setNewDistance] = useState(0);
    const [newFee, setNewFee] = useState(0);
    const [newLat, setNewLat] = useState(null);
    const [newLng, setNewLng] = useState(null);
    const [trackingBooking, setTrackingBooking] = useState(null);
    const SHOP_LOCATION = { lat: 21.492298, lng: 86.902777 };
    const RATE_PER_KM = 10;

    // Force re-render every minute to update cancel button visibility
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        fetchUserBookings();
    }, []);

    // Update current time every second to refresh cancel button visibility immediately
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update every 1 second for immediate response

        return () => clearInterval(interval);
    }, []);

    // Initialize Google Places Autocomplete when editing address
    useEffect(() => {
        if (!editingAddressId || !window.google) return;

        const timer = setTimeout(() => {
            const input = document.getElementById(`edit-address-${editingAddressId}`);
            if (!input) return;

            const autocomplete = new window.google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: 'in' },
                fields: ['address_components', 'geometry', 'formatted_address']
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) return;

                const userLoc = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };

                setNewAddress(place.formatted_address);
                setNewLat(userLoc.lat);
                setNewLng(userLoc.lng);
                
                // Recalculate distance
                const service = new window.google.maps.DistanceMatrixService();
                service.getDistanceMatrix({
                    origins: [new window.google.maps.LatLng(SHOP_LOCATION.lat, SHOP_LOCATION.lng)],
                    destinations: [new window.google.maps.LatLng(userLoc.lat, userLoc.lng)],
                    travelMode: window.google.maps.TravelMode.DRIVING,
                }, (response, status) => {
                    if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                        const distKm = response.rows[0].elements[0].distance.value / 1000;
                        const fee = Math.round(distKm * RATE_PER_KM * 2); // Exact 2-way fee (10/km per way)
                        setNewDistance(distKm);
                        setNewFee(fee);
                    }
                });
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [editingAddressId]);

    const fetchUserBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const response = await fetch('/api/bookings/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    try {
                        const errorData = await response.json();
                        if (errorData.code === 'USER_BLOCKED') {
                            setPopup({
                                isOpen: true, type: 'error', title: 'Account Blocked',
                                message: 'Your account has been blocked by the administrator. You will be logged out.'
                            });
                            return;
                        }
                    } catch (e) {
                        // ignore json parse error if not json
                    }
                }
                throw new Error('Failed to fetch bookings');
            }

            const bookingsData = await response.json();

            // Enrich bookings with vehicle data
            const enrichedBookings = await Promise.all(bookingsData.map(async booking => {
                let vehicleName = 'N/A';
                let vehiclePrice = 0;

                if (booking.vehicle_id && booking.vehicle_type) {
                    try {
                        let typeTable = booking.vehicle_type;
                        if (booking.vehicle_type === 'car') typeTable = 'cars';
                        if (booking.vehicle_type === 'bike') typeTable = 'bikes';
                        if (booking.vehicle_type === 'scooty') typeTable = 'scooty';

                        const res = await fetch(`/api/vehicles/${typeTable}/${booking.vehicle_id}`);
                        if (res.ok) {
                            const vehicle = await res.json();
                            vehicleName = vehicle.name || 'N/A';
                            vehiclePrice = vehicle.price || 0;
                        }
                    } catch (e) {
                        console.error("Error fetching vehicle details", e);
                    }
                }

                // Calculate display amounts
                const duration = parseInt(booking.duration) || 0;
                const vehicleRental = duration * vehiclePrice;
                const totalAmount = booking.total_amount || (vehicleRental + (booking.delivery_fee || 0));
                const advancePayment = booking.advance_payment ? parseFloat(booking.advance_payment) : Math.ceil(vehicleRental * 0.3);
                const remainingAmount = totalAmount - advancePayment;

                return {
                    ...booking,
                    vehicleName,
                    vehiclePrice,
                    totalDisplayAmount: totalAmount, // avoid conflict with booking.total_amount if exists
                    remainingDisplayAmount: remainingAmount,
                    displayAdvancePayment: advancePayment
                };
            }));

            // Filter out bookings ONLY if they are effectively in the past (Start Time + 12 Hours)
            // User Logic: "Completed" means started. Disappear 12h after START.
            const activeBookings = enrichedBookings.filter(booking => {
                // Determine the start time
                let startDateTime;

                if (booking.start_date) {
                    startDateTime = new Date(`${booking.start_date}T${booking.start_time || '00:00'}`);
                } else {
                    // Fallback if data missing - keep it visible
                    return true;
                }

                // Rule: Disappear 12 hours after START time
                const disappearTime = new Date(startDateTime.getTime() + (12 * 60 * 60 * 1000));

                const now = new Date();

                // If we are PAST the disappear time, hide it
                if (now > disappearTime) {
                    return false;
                }

                return true;
            });

            // Format dates for display
            const formattedBookings = activeBookings.map(booking => {
                let startDisplay = 'N/A';
                let endDisplay = 'N/A';

                if (booking.start_date && booking.start_time) {
                    // Start Date
                    startDisplay = `${booking.start_date} (${booking.start_time})`;

                    // Calculate End Date
                    try {
                        const [year, month, day] = booking.start_date.split('-').map(Number);
                        const [hours, minutes] = booking.start_time.split(':').map(Number);
                        const startDateObj = new Date(year, month - 1, day, hours, minutes);

                        const durationHours = parseInt(booking.duration) || 0;
                        const endDateObj = new Date(startDateObj.getTime() + (durationHours * 60 * 60 * 1000));

                        const endYear = endDateObj.getFullYear();
                        const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
                        const endDay = String(endDateObj.getDate()).padStart(2, '0');
                        const endHours = String(endDateObj.getHours()).padStart(2, '0');
                        const endMinutes = String(endDateObj.getMinutes()).padStart(2, '0');

                        endDisplay = `${endYear}-${endMonth}-${endDay} (${endHours}:${endMinutes})`;
                    } catch (e) {
                        console.error("Error calculating end date", e);
                    }
                }

                return {
                    ...booking,
                    displayStartDate: startDisplay,
                    displayEndDate: endDisplay
                };
            });

            setBookings(formattedBookings);

        } catch (error) {
            console.error('Error fetching bookings:', error);
            setError('Error loading bookings. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (bookingId) => {
        setCurrentBookingId(bookingId);
        setShowCancellationModal(true);
    };

    const handleRefundDetailsClick = (bookingId) => {
        setCurrentBookingId(bookingId);
        setRefundFlowMode('rejected');
        setShowRefundDetailsModal(true);
    };

    const handleDownloadInvoice = async (bookingId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/bookings/${bookingId}/invoice`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to download invoice');

            // Find booking to get formatted ID
            const booking = bookings.find(b => b.id === bookingId);
            const downloadFilename = booking && booking.booking_id
                ? `invoice_${booking.booking_id}.pdf`
                : `Invoice_${bookingId}.pdf`;

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = downloadFilename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            setPopup({ isOpen: true, type: 'error', title: 'Download Error', message: 'Could not download invoice. Please try again.' });
        }
    };

    const handleConfirmCancel = async () => {
        if (!currentBookingId) return;

        // Check if there is a refund amount
        const currentBooking = bookings.find(b => b.id === currentBookingId);
        let hasRefund = false;

        if (currentBooking) {
            const bookedTime = new Date(currentBooking.confirmation_timestamp || currentBooking.created_at);
            const now = new Date();
            const hoursSinceBooking = (now - bookedTime) / (1000 * 60 * 60);

            // Advance payment logic
            const advancePayment = currentBooking.displayAdvancePayment || 0;
            if (advancePayment > 0) {
                hasRefund = true;
            }
        }

        setShowCancellationModal(false);

        if (hasRefund) {
            // Open Refund Details Modal instead of cancelling immediately
            setRefundFlowMode('cancellation');
            setShowRefundDetailsModal(true);
        } else {
            // No refund involved, cancel directly
            await executeCancellation({});
        }
    };

    const executeCancellation = async (refundDetailsObj) => {
        setIsCancelling(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/bookings/${currentBookingId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refundDetails: refundDetailsObj })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to cancel booking');
            }

            const data = await response.json();

            // Format success message with refund details
            const msg = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <p style={{ margin: 0 }}>Booking cancelled successfully!</p>

                    <div style={{
                        background: '#f8f9fa',
                        padding: '10px 15px',
                        borderRadius: '8px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        border: '1px solid #e9ecef'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '1.1rem' }}>
                            <span style={{ color: '#555' }}>Refund Amount:</span>
                            <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>₹{data.refundAmount}</span>
                        </div>
                        {data.deduction > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.95rem' }}>
                                <span style={{ color: '#666' }}>Deduction:</span>
                                <span style={{ color: '#d32f2f' }}>-₹{data.deduction}</span>
                            </div>
                        )}
                    </div>

                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#888' }}>
                        Your refund will be processed manually within 24 hours.
                    </p>
                </div>
            );

            setSuccessMessage(msg);
            setShowSuccessPopup(true);
            setShowRefundDetailsModal(false); // Close refund modal if open
            fetchUserBookings();
        } catch (error) {
            setPopup({ isOpen: true, type: 'error', title: 'Cancellation Failed', message: error.message || 'Error cancelling booking.' });
        } finally {
            setIsCancelling(false);
        }
    };

    const handleUpdateAddress = async (bookingId) => {
        if (!newAddress.trim()) {
            setPopup({ isOpen: true, type: 'error', title: 'Invalid Address', message: 'Address cannot be empty.' });
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/bookings/${bookingId}/address`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    deliveryAddress: newAddress,
                    distance: newDistance,
                    deliveryFee: newFee,
                    lat: newLat,
                    lng: newLng
                })
            });

            const data = await response.json();
            if (response.ok) {
                setPopup({ isOpen: true, type: 'success', title: 'Updated', message: 'Delivery address and fee updated successfully!' });
                setEditingAddressId(null);
                fetchUserBookings(); // Refresh
            } else {
                throw new Error(data.error || 'Failed to update address');
            }
        } catch (err) {
            setPopup({ isOpen: true, type: 'error', title: 'Update Failed', message: err.message });
        }
    };

    const submitRefundWithArgs = async (details) => {
        if (!currentBookingId) return;

        // "details" is passed directly from RefundDetailsPopup
        // Structure: { method: 'upi', upiId: '...' } OR { method: 'bank', accountHolder: ... }

        // Map to the format backend expects
        const detailsToSend = { method: details.method };
        if (details.method === 'upi') {
            detailsToSend.upiId = details.upiId;
        } else {
            detailsToSend.accountHolder = details.accountHolder;
            detailsToSend.accountNumber = details.accountNumber;
            detailsToSend.ifsc = details.ifsc;
        }

        if (refundFlowMode === 'cancellation') {
            await executeCancellation(detailsToSend);
        } else {
            // REJECTED Flow (Existing) flow
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/bookings/${currentBookingId}/refund-details`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refundDetails: detailsToSend })
                });

                if (!response.ok) throw new Error('Failed to submit refund details');

                setPopup({ isOpen: true, type: 'success', title: 'Submitted', message: 'Refund details submitted successfully!' });
                setShowRefundDetailsModal(false);
                fetchUserBookings();
            } catch (error) {
                setPopup({ isOpen: true, type: 'error', title: 'Submission Error', message: error.message });
            }
        }
    };

    // Keep this for backward compatibility or direct calls if state was used, 
    // but we are switching to "submitRefundWithArgs" for the new popup.
    const handleSubmitRefundDetails = () => {
        // Legacy wrapper if needed, but we replaced the usage in the render method.
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Loading bookings...</div>;

    return (
        <main>
            <section className="my-bookings-header" style={{ padding: '8rem 5% 2rem', backgroundColor: '#f8f9fa', textAlign: 'center' }}>
                <h1>My Bookings</h1>
                <p>View and manage your vehicle rentals</p>
            </section>

            <section className="bookings-list" style={{ padding: '2rem 5%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {bookings.length === 0 ? (
                    <p className="no-bookings" style={{ textAlign: 'center', padding: '3rem', background: '#f5f5f5', borderRadius: '10px', margin: '2rem auto', maxWidth: '600px', color: '#666' }}>
                        You have no active or past bookings.
                    </p>
                ) : (
                    bookings.map(booking => (
                        <div key={booking.id} className="booking-card" style={{ background: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '550px' }}>
                            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <h3 style={{ margin: 0, color: '#2ecc71', fontSize: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Booking ID: {booking.booking_id || `#${booking.id}`}</h3>
                                <p><strong>Vehicle:</strong> {booking.vehicleName} ({booking.vehicle_type})</p>
                                <p><strong>Start Date:</strong> {booking.displayStartDate}</p>
                                <p><strong>End Date:</strong> {booking.displayEndDate}</p>
                                <p><strong>Duration:</strong> {booking.duration || '0'} hours</p>
                                <p><strong>Total Amount:</strong> ₹{booking.totalDisplayAmount || '0'} {booking.delivery_option === 'home_delivery' ? '(Inc. 2-Way Delivery)' : ''}</p>
                                <p><strong>Advance Payment:</strong> ₹{booking.displayAdvancePayment || '0'}</p>
                                <p><strong>Remaining Amount:</strong> ₹{booking.remainingDisplayAmount >= 0 ? booking.remainingDisplayAmount : '0'} {booking.delivery_option === 'home_delivery' ? '(Inc. Delivery Fee)' : ''}</p>
                                <p><strong>Transaction ID:</strong> {booking.transaction_id || 'N/A'}</p>
                                
                                {booking.delivery_option === 'home_delivery' && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7', color: '#166534' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <p style={{ margin: 0 }}><strong><i className="fas fa-truck"></i> Delivery Address:</strong></p>
                                            {editingAddressId !== booking.id && booking.status === 'confirmed' && (() => {
                                                const start = new Date(`${booking.start_date}T${booking.start_time}`);
                                                const diff = (start - currentTime) / (1000 * 60 * 60);
                                                return diff > 2 ? (
                                                    <button 
                                                        onClick={() => { 
                                                            setEditingAddressId(booking.id); 
                                                            setNewAddress(booking.delivery_address);
                                                            setNewDistance(booking.distance || 0);
                                                            setNewFee(booking.delivery_fee || 0);
                                                            setNewLat(booking.lat || null);
                                                            setNewLng(booking.lng || null);
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', padding: 0 }}
                                                    >
                                                        Change
                                                    </button>
                                                ) : null;
                                            })()}
                                        </div>

                                        {editingAddressId === booking.id ? (
                                            <div style={{ marginTop: '10px' }}>
                                                <input 
                                                    id={`edit-address-${booking.id}`}
                                                    type="text"
                                                    value={newAddress}
                                                    onChange={(e) => setNewAddress(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #2ecc71', fontSize: '0.95rem', marginBottom: '8px', outline: 'none' }}
                                                    placeholder="Start typing your address..."
                                                />

                                                {/* Map Preview */}
                                                <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #dcfce7', marginBottom: '10px', height: '200px' }}>
                                                    {newLat && newLng ? (
                                                        <iframe
                                                            key={`${newLat}-${newLng}`}
                                                            title="Delivery Preview"
                                                            width="100%"
                                                            height="100%"
                                                            style={{ border: 0 }}
                                                            loading="lazy"
                                                            src={`https://www.google.com/maps/embed/v1/directions?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&origin=${SHOP_LOCATION.lat},${SHOP_LOCATION.lng}&destination=${newLat},${newLng}&mode=driving&language=en`}
                                                        />
                                                    ) : (
                                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fdf9', color: '#15803d', fontSize: '0.85rem' }}>
                                                            <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }}></i> Enter address to see route
                                                        </div>
                                                    )}
                                                </div>

                                                {newFee > 0 && (
                                                    <div style={{ margin: '10px 0', padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                                            <span style={{ color: '#166534' }}>Vehicle Rental:</span>
                                                            <span style={{ fontWeight: '600' }}>₹{booking.duration * (booking.vehiclePrice || 0)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                                                            <span style={{ color: '#166534' }}>New Delivery Fee (2-Way):</span>
                                                            <span style={{ fontWeight: '600' }}>₹{newFee} ({newDistance.toFixed(1)} km)</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid #dcfce7', paddingTop: '8px' }}>
                                                            <strong style={{ color: '#166534' }}>Updated Total:</strong>
                                                            <strong style={{ color: '#166534' }}>₹{(booking.duration * (booking.vehiclePrice || 0)) + newFee}</strong>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => handleUpdateAddress(booking.id)} style={{ padding: '8px 18px', background: '#166534', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Save Changes</button>
                                                    <button onClick={() => { setEditingAddressId(null); setNewFee(0); }} style={{ padding: '8px 18px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p style={{ margin: '5px 0 0 0', fontSize: '0.95rem' }}>{booking.delivery_address}</p>
                                        )}

                                        <p style={{ margin: '8px 0 0 0', fontSize: '0.75rem', color: '#15803d', borderTop: '1px solid #dcfce7', paddingTop: '5px' }}>
                                            <i className="fas fa-info-circle"></i> Address can be updated up to 2 hours before pickup.
                                        </p>

                                        {/* --- ARRIVAL TIMINGS --- */}
                                        <div style={{ marginTop: '12px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', borderBottom: '1px solid #e2e8f0', pb: '5px' }}>
                                                <i className="fas fa-clock"></i> Expected Arrival Timings:
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                                    <i className="fas fa-arrow-right" style={{ color: '#16a34a' }}></i> <b>Delivery:</b> Our agent will arrive around <b>{booking.start_time}</b>.
                                                </p>
                                                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                                                    <i className="fas fa-undo" style={{ color: '#2563eb' }}></i> <b>Return:</b> Agent will collect the vehicle around <b>{booking.displayEndDate.split('(')[1].replace(')', '')}</b>.
                                                </p>
                                            </div>
                                            <p style={{ margin: '8px 0 0 0', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                                                * Timings are approximate based on distance.
                                            </p>
                                        </div>

                                        {/* --- LIVE TRACKING BUTTON --- */}
                                        {booking.agent_id && ['picked_up', 'out_for_delivery'].includes(booking.delivery_status) && (
                                            <button 
                                                onClick={() => setTrackingBooking(booking)}
                                                style={{ marginTop: '10px', width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <i className="fas fa-location-arrow"></i> Track Your Vehicle Live
                                            </button>
                                        )}
                                    </div>
                                )}

                                {booking.rewards && booking.rewards.coupon_code && (
                                    <p style={{ color: '#2e7d32', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                        <i className="fas fa-tag"></i>
                                        <strong>Coupon Used:</strong> {booking.rewards.coupon_code}
                                        {booking.rewards.reward_type === 'FREE_2_HOUR_RIDE' && <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: '#666' }}>(Free 2 Hours)</span>}
                                    </p>
                                )}
                            </div>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {(booking.confirmation_timestamp || booking.created_at) && (
                                    <div style={{ fontSize: '0.85rem', color: '#666', background: '#f8f9fa', padding: '0.6rem', borderRadius: '8px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className="far fa-clock" style={{ color: '#2ecc71' }}></i>
                                        <span><strong>Booked on:</strong> {new Date(booking.confirmation_timestamp || booking.created_at).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                            timeZone: 'Asia/Kolkata'
                                        })}</span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={`booking-status status-${booking.status}`} style={{
                                        fontWeight: 'bold', padding: '0.5rem 1.2rem', borderRadius: '50px', fontSize: '0.85rem', color: 'white', textTransform: 'uppercase',
                                        backgroundColor: booking.status === 'confirmed' ? '#4CAF50' :
                                            booking.status === 'pending' ? '#ffa726' :
                                                booking.status === 'cancelled' ? '#f44336' :
                                                    booking.status === 'completed' ? '#2196F3' : '#9e9e9e'
                                    }}>
                                        {booking.status || 'N/A'}
                                    </span>
                                </div>

                                {(booking.status === 'confirmed' || booking.status === 'completed' || booking.status === 'ride_started' || booking.status === 'ride_completed') && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => handleDownloadInvoice(booking.id)} style={{
                                            backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1, fontWeight: '600'
                                        }}>
                                            <i className="fas fa-file-invoice"></i> Invoice
                                        </button>

                                        {booking.status === 'confirmed' && (() => {
                                            if (booking.start_date && booking.start_time) {
                                                const startDateTime = new Date(`${booking.start_date}T${booking.start_time}`);
                                                if (currentTime >= startDateTime) return null;
                                            }
                                            return (
                                                <button className="btn-cancel-booking" onClick={() => handleCancelClick(booking.id)} style={{
                                                    backgroundColor: '#f44336', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: '600'
                                                }}>
                                                    <i className="fas fa-times"></i> Cancel
                                                </button>
                                            );
                                        })()}
                                    </div>
                                )}

                                {booking.status === 'cancelled' && booking.refund_amount && (
                                    <div className="refund-info" style={{ marginTop: '0.5rem', color: '#4CAF50', fontWeight: 'bold', padding: '0.8rem', backgroundColor: '#e8f5e9', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #c8e6c9' }}>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Refund Amount:</strong> ₹{booking.refund_amount}</p>
                                        <p style={{ margin: 0 }}><strong>Refund Status:</strong> {booking.refund_status || 'Processing'}</p>
                                    </div>
                                )}

                                {booking.status === 'rejected' && (
                                    <div className="refund-info" style={{ marginTop: '0.5rem', color: '#4CAF50', fontWeight: 'bold', padding: '0.8rem', backgroundColor: '#e8f5e9', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #c8e6c9' }}>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Refund Amount:</strong> ₹{booking.refund_amount || booking.displayAdvancePayment || '0'}</p>
                                        <p style={{ margin: '0 0 5px 0' }}><strong>Refund Status:</strong> {booking.refund_status || 'Completed'}</p>
                                        {booking.refund_details?.original_tx && (
                                            <p style={{ fontSize: '0.85em', color: '#666', margin: 0 }}>Ref Tx: {booking.refund_details.original_tx}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </section>



            {/* Cancellation Modal using ConfirmationPopup */}
            <ConfirmationPopup
                isOpen={showCancellationModal}
                onClose={() => setShowCancellationModal(false)}
                onConfirm={handleConfirmCancel}
                title="Cancel Booking"
                confirmText="Confirm Cancellation"
                cancelText="Keep Booking"
                type="danger"
                isLoading={isCancelling}
                icon="fa-calendar-times"
                message={
                    <div style={{ textAlign: 'left' }}>
                        {/* Show booking confirmation time and refund calculation */}
                        {(() => {
                            const currentBooking = bookings.find(b => b.id === currentBookingId);
                            if (currentBooking?.confirmation_timestamp || currentBooking?.created_at) {
                                const bookedTime = new Date(currentBooking.confirmation_timestamp || currentBooking.created_at);
                                const now = new Date();
                                const hoursSinceBooking = (now - bookedTime) / (1000 * 60 * 60);
                                const isFullRefund = hoursSinceBooking <= 2;
                                const refundPercentage = isFullRefund ? 100 : 70;
                                const estimatedRefund = Math.round((currentBooking.displayAdvancePayment || 0) * (refundPercentage / 100));

                                return (
                                    <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: isFullRefund ? '#e8f5e9' : '#fff3cd', borderRadius: '8px', borderLeft: `4px solid ${isFullRefund ? '#4caf50' : '#ffc107'}` }}>
                                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: isFullRefund ? '#2e7d32' : '#856404' }}>
                                            ⏰ Booking Time Information
                                        </h3>
                                        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: isFullRefund ? '#2e7d32' : '#856404' }}>
                                            <strong>Booked on:</strong> {bookedTime.toLocaleString('en-IN', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                                timeZone: 'Asia/Kolkata'
                                            })}
                                        </p>
                                        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: isFullRefund ? '#2e7d32' : '#856404' }}>
                                            <strong>Time elapsed:</strong> {hoursSinceBooking.toFixed(1)} hours
                                        </p>
                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', fontWeight: 'bold', color: isFullRefund ? '#2e7d32' : '#856404' }}>
                                            💰 Estimated Refund: ₹{estimatedRefund}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', borderLeft: '4px solid #ffc107', fontSize: '0.9rem' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#856404' }}>📋 Cancellation & Refund Policy</h3>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#856404' }}>
                                <li style={{ marginBottom: '0.3rem' }}>Cancellation within 2 hours: <strong>Full refund</strong></li>
                                <li style={{ marginBottom: '0.3rem' }}>Cancellation after 2 hours: <strong>70% refund</strong></li>
                                <li style={{ marginBottom: '0.3rem' }}>Automatic refund to original method</li>
                                <li>Timeline: <strong>5-7 business days</strong></li>
                            </ul>
                        </div>
                        <p>Are you sure you want to cancel this booking? This action cannot be undone.</p>
                    </div>
                }
            />


            {/* Refund Details Modal (Matches Confirmation Style) */}
            <RefundDetailsPopup
                isOpen={showRefundDetailsModal}
                onClose={() => setShowRefundDetailsModal(false)}
                onSubmit={(details) => {
                    // Adapt the new payload format back to the expected state logic if needed,
                    // or just pass it directly. My logic expects state 'refundMethod' etc.
                    // But wait, the child component now manages the form state.
                    // I need to adapt handleSubmitRefundDetails to accept arguments or update parent state.
                    // EASIER: Update the local state here instantly and call submit.

                    setRefundMethod(details.method);
                    setRefundDetails({
                        upiId: details.upiId,
                        accountHolder: details.accountHolder,
                        accountNumber: details.accountNumber,
                        ifsc: details.ifsc
                    });

                    // We need a slight delay or a direct call function that takes args.
                    // Let's modify handleSubmitRefundDetails to accept args optionally.
                    submitRefundWithArgs(details);
                }}
                mode={refundFlowMode}
                isLoading={isCancelling} // Re-using isCancelling for loading state if applicable
            />

            <StatusPopup
                isOpen={showSuccessPopup || popup.isOpen}
                onClose={() => {
                    if (popup.isOpen) {
                        if (popup.title === 'Account Blocked') {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login'; // Force reload to login
                            return;
                        }
                        setPopup({ ...popup, isOpen: false });
                    }
                    if (showSuccessPopup) {
                        setShowSuccessPopup(false);
                    }
                }}
                type={popup.isOpen ? popup.type : 'success'}
                title={popup.isOpen ? popup.title : 'Success!'}
                message={popup.isOpen ? popup.message : successMessage}
            />
            {/* LIVE TRACKING MODAL */}
            {trackingBooking && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '600px', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
                        <button onClick={() => setTrackingBooking(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10, fontWeight: 'bold' }}>✕</button>
                        
                        <div style={{ padding: '20px', background: '#2563eb', color: 'white' }}>
                            <h3 style={{ margin: 0 }}>Tracking Your Delivery</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>Agent is on the way to your location</p>
                        </div>

                        <div style={{ height: '400px', background: '#eee' }}>
                            <iframe
                                title="Live Tracking"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyDIIoFnrdbqEuukqUQ5XH4sNhD_9KncetA&origin=${trackingBooking.agent_lat || SHOP_LOCATION.lat},${trackingBooking.agent_lng || SHOP_LOCATION.lng}&destination=${trackingBooking.lat || trackingBooking.delivery_address}&mode=driving&language=en`}
                            />
                        </div>

                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>ESTIMATED ARRIVAL</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>Calculating...</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', color: '#666' }}>DELIVERY AGENT</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Assigned Expert</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};


export default MyBookings;
