import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StatusPopup from '../components/StatusPopup';
import TermsPopup from '../components/TermsPopup';

const BookingForm = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const vehicleId = searchParams.get('vehicleId');
    const vehicleType = searchParams.get('type'); // 'cars', 'bikes', 'scooty'

    // Determine the API endpoint type based on query param
    const getApiType = (type) => {
        if (!type) return 'bikes';
        if (type === 'car' || type === 'cars') return 'cars';
        if (type === 'bike' || type === 'bikes') return 'bikes';
        if (type === 'scooty') return 'scooty';
        return type;
    };

    const [vehicle, setVehicle] = useState(null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        startDate: '',
        startTime: '',
        duration: 2,
        deliveryOption: 'pickup', // 'pickup' or 'home_delivery'
        deliveryAddress: '',
        distance: 0,
        deliveryFee: 0,
        lat: null,
        lng: null
    });
    
    const RATE_PER_KM = 10;
    const SHOP_LOCATION = { lat: 21.492259, lng: 86.902806 }; // Your Shop Location Updated
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false); // For API calls
    const [bookingId, setBookingId] = useState(null); // Store booking ID for invoice download
    const [formattedBookingId, setFormattedBookingId] = useState(null); // Store formatted ID for display/download
    const [downloadingInvoice, setDownloadingInvoice] = useState(false); // Invoice download state
    const [fetchingLocation, setFetchingLocation] = useState(false); // Live location fetch state

    // Popup State
    const [popup, setPopup] = useState({
        isOpen: false,
        type: 'error',
        title: '',
        message: ''
    });
    const [showTermsPopup, setShowTermsPopup] = useState(false); // State for custom Terms Popup

    // Loyalty Rewards
    const [rewards, setRewards] = useState([]);
    const [selectedReward, setSelectedReward] = useState(null);
    const [appliedOffer, setAppliedOffer] = useState(null); // For general offers
    const [couponInput, setCouponInput] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Fetch Rewards
            fetch('/api/user/rewards', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setRewards(data.rewards || []))
                .catch(err => console.error(err));

            // Loyalty nudge removed as per user request
        }
    }, []);

    const apiType = getApiType(vehicleType);

    // Initial Load
    useEffect(() => {
        // Chatbot Auto-Fill: Parse params from URL set by chatbot
        const urlStartDate = searchParams.get('startDate');
        const urlStartTime = searchParams.get('startTime');
        const urlDuration = searchParams.get('duration');

        if (urlStartDate && urlStartTime && urlDuration) {
            setFormData(prev => ({
                ...prev,
                startDate: urlStartDate,
                startTime: urlStartTime,
                duration: parseInt(urlDuration) || 2
            }));
        }

        if (vehicleId && apiType) {
            fetch(`/api/vehicles/${apiType}/${vehicleId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Vehicle not found');
                    return res.json();
                })
                .then(data => {
                    setVehicle(data);
                    setLoading(false);
                })
                .catch(err => {
                    setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Error loading vehicle data' });
                    setTimeout(() => navigate('/'), 2000);
                });
        } else {
            setPopup({ isOpen: true, type: 'error', title: 'Invalid Vehicle', message: 'Invalid vehicle selection' });
            setTimeout(() => navigate('/'), 2000);
        }

        // Auto-fill from Profile Return
        if (location.state?.autoApplyCode) {
            setCouponInput(location.state.autoApplyCode);
        }

    }, [vehicleId, apiType, navigate, searchParams, location.state]);

    // Initialize Google Places Autocomplete when user selects Home Delivery
    // (The visual map is now handled by the Google Maps Embed iframe — no JS map needed)
    useEffect(() => {
        if (formData.deliveryOption !== 'home_delivery') return;
        if (!window.google) return;

        // Small delay to ensure input is mounted after React renders
        const timer = setTimeout(() => {
            const input = document.getElementById('delivery-address-input');
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

                // Update state — the iframe src updates automatically via React re-render
                calculateDistance(userLoc, place.formatted_address);
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [formData.deliveryOption]);

    const calculateDistance = (userLoc, address) => {
        if (!window.google) return;

        const service = new window.google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [new window.google.maps.LatLng(SHOP_LOCATION.lat, SHOP_LOCATION.lng)],
            destinations: [new window.google.maps.LatLng(userLoc.lat, userLoc.lng)],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC,
        }, (response, status) => {
            if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                const distanceInKm = response.rows[0].elements[0].distance.value / 1000;
                const roundedDistance = Math.ceil(distanceInKm);
                
                setFormData(prev => ({
                    ...prev,
                    deliveryAddress: address,
                    lat: userLoc.lat,
                    lng: userLoc.lng,
                    distance: roundedDistance,
                    deliveryFee: roundedDistance * RATE_PER_KM
                }));
            }
        });
    };

    // Auto-Trigger Availability Check if data is present (from Chatbot)
    useEffect(() => {
        // Only run if not loading, vehicle loaded, and form data is present from URL
        if (!loading && vehicle && searchParams.get('startDate') && step === 1) {
            // Check if user is logged in
            const token = localStorage.getItem('token');
            if (!token) {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Login Required',
                    message: 'Please login to complete your booking. Redirecting...'
                });
                setTimeout(() => navigate('/login', { state: { from: location } }), 2000);
            } else {
                // Determine if we should auto-submit availability check
                // We use a small timeout to let state settle
                const timer = setTimeout(() => {
                    // Manually trigger the equivalent of handleCheckAvailability
                    // We can't call the function directly easily due to event param, so strict logic here
                    const check = async () => {
                        setProcessing(true);
                        try {
                            const response = await fetch('/api/bookings/check-availability', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    vehicleId,
                                    startDate: searchParams.get('startDate'), // Use direct URL param to be safe
                                    startTime: searchParams.get('startTime'),
                                    duration: searchParams.get('duration')
                                })
                            });
                            const data = await response.json();
                            if (response.ok) {
                                setStep(2); // Auto-advancing to payment
                            } else {
                                setPopup({
                                    isOpen: true,
                                    type: 'error',
                                    title: 'Not Available',
                                    message: data.message || 'Vehicle not available.'
                                });
                            }
                        } finally {
                            setProcessing(false);
                        }
                    };
                    check();
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [loading, vehicle, searchParams, step, navigate, vehicleId]);


    // Set min date to today
    const today = new Date().toISOString().split('T')[0];

    // Calculations
    // Calculations with Reward
    const hourlyRate = vehicle ? (parseFloat(vehicle.price) || 0) : 0;
    const duration = parseInt(formData.duration) || 0;

    let baseTotal = hourlyRate * duration;
    let discountAmount = 0;

    // Handle Loyalty Rewards (e.g., RHD...)
    if (selectedReward && selectedReward.reward_type === 'FREE_2_HOUR_RIDE') {
        // First 2 hours are free, user pays for the rest
        discountAmount = Math.min(baseTotal, hourlyRate * 2);
    } 
    // Handle General Offers (e.g., SUMMER20)
    else if (appliedOffer) {
        if (appliedOffer.discount_percentage) {
            discountAmount = (baseTotal * appliedOffer.discount_percentage) / 100;
            if (appliedOffer.max_discount && discountAmount > appliedOffer.max_discount) {
                discountAmount = appliedOffer.max_discount;
            }
        } else if (appliedOffer.flat_discount) {
            discountAmount = Math.min(baseTotal, appliedOffer.flat_discount);
        }
    }

    let finalTotal = Math.max(0, baseTotal - discountAmount);

    // Add Delivery Fee if Home Delivery is selected
    if (formData.deliveryOption === 'home_delivery') {
        finalTotal += formData.deliveryFee;
    }

    // 30% Advance Payment
    const advancePercentage = 30;
    const advancePayment = Math.ceil((finalTotal * advancePercentage) / 100);
    const remainingAmount = finalTotal - advancePayment;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Step 1: Check Availability
    const handleCheckAvailability = async (e) => {
        if (e) e.preventDefault(); // Handle optional event for manual calls

        const token = localStorage.getItem('token');
        if (!token) {
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Login Required',
                message: 'You must be logged in to book a vehicle.'
            });
            setTimeout(() => navigate('/login', { state: { from: location } }), 2000);
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch('/api/bookings/check-availability', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicleId,
                    startDate: formData.startDate,
                    startTime: formData.startTime,
                    duration: formData.duration
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStep(2); // Move to Payment Step
            } else {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Not Available',
                    message: data.message || data.error || 'Vehicle is not available for the selected time.'
                });
            }
        } catch (error) {
            console.error(error);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Error',
                message: 'Failed to check availability. Please try again.'
            });
        } finally {
            setProcessing(false);
        }
    };

    // Step 2: Handle Payment
    const handlePayment = async () => {
        const token = localStorage.getItem('token');

        if (!termsAccepted) {
            setPopup({
                isOpen: true,
                type: 'warning',
                title: 'Terms & Conditions',
                message: 'Please accept the Terms and Conditions to proceed.'
            });
            return;
        }

        // Validation: Prevent booking less than 4 hours with free ride coupon
        if (selectedReward && selectedReward.reward_type === 'FREE_2_HOUR_RIDE' && duration < 4) {
            setPopup({
                isOpen: true,
                type: 'warning',
                title: '⚠️ Minimum 4 Hours Required',
                message: 'To use your Free 2-Hour Ride coupon, you must book for at least 4 hours. You\'ll get the first 2 hours FREE and pay for the remaining 2 hours!',
                customActions: (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <button
                            onClick={() => {
                                setFormData({ ...formData, duration: 4 });
                                setPopup({ ...popup, isOpen: false });
                            }}
                            style={{
                                padding: '12px 30px',
                                background: '#E57373',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}
                        >
                            Okay, Got it
                        </button>
                    </div>
                )
            });
            setProcessing(false);
            return;
        }

        setProcessing(true);

        const bookingPayload = {
            vehicleId,
            vehicleType: apiType,
            vehicleName: vehicle?.name,
            ...formData,
            rewardId: selectedReward ? selectedReward.id : null,
            // If strictly 0, send actualAdvancePayment as 0 to avoid validation check fail? 
            // The controller recalculates anyway.
        };

        // If amount is 0, skip Razorpay
        if (advancePayment === 0) {
            await confirmBooking({
                razorpay_payment_id: 'FREE_RIDE',
                razorpay_order_id: 'FREE_RIDE',
                razorpay_signature: 'FREE_RIDE'
            }, token, bookingPayload); // Pass payload explicitly to merge logic if needed
            return;
        }

        // Razorpay / booking logic continues here
        try {
            // 1. Create Order
            const orderRes = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: advancePayment,
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`
                })
            });

            if (!orderRes.ok) {
                const errorData = await orderRes.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.details || errorData.message || `Server Error: ${orderRes.status}`);
            }
            const orderData = await orderRes.json();

            // Retrieve user details for prefill
            let userDetails = {};
            try {
                userDetails = JSON.parse(localStorage.getItem('user') || '{}');
                console.warn("Existing LocalStorage User:", userDetails); // Debugging (Warn for visibility)
            } catch (e) {
                console.warn("Failed to parse user details for Razorpay prefill");
            }

            const prefillData = {
                name: userDetails.fullName || userDetails.name || "User Name",
                email: userDetails.email || "user@example.com",
                contact: userDetails.phoneNumber || userDetails.phone || userDetails.contact || userDetails.mobile || "9999999999"
            };
            console.warn("Razorpay Prefill Data:", prefillData); // Debugging (Warn for visibility)

            // 2. Open Razorpay
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_RvUJ27UN65SU8w", // Use env var in real app
                amount: orderData.amount,
                currency: orderData.currency,
                name: "RentHub",
                description: `Advance for ${vehicle.name}`,
                image: "https://placehold.co/128x128.png?text=RentHub", // Use HTTPS placeholder to check if it fixes blocking
                order_id: orderData.id,
                handler: async function (response) {
                    await confirmBooking(response, token);
                },
                prefill: prefillData,
                modal: {
                    ondismiss: function () {
                        // Handle modal dismissal if needed
                        setProcessing(false);
                    },
                    escape: false,
                    backdropclose: false,
                    confirm_close: false
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                setPopup({
                    isOpen: true,
                    type: 'error',
                    title: 'Payment Failed',
                    message: response.error.description
                });
            });
            rzp1.open();

        } catch (error) {
            console.error(error);
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Payment Error',
                message: `Payment initiation failed: ${error.message}`
            });
        } finally {
            setProcessing(false);
        }
    };

    // Step 3: Confirm Booking (Backend)
    const confirmBooking = async (paymentResponse, token) => {
        setProcessing(true);
        try {
            const bookingPayload = {
                vehicleId,
                vehicleType: apiType,
                ...formData,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpaySignature: paymentResponse.razorpay_signature,
                rewardId: selectedReward ? selectedReward.id : null,
                couponCode: appliedOffer ? appliedOffer.code : null, // Pass the general coupon code
                advancePayment,
                remainingAmount,
                totalAmount: finalTotal
            };

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bookingPayload)
            });

            const data = await response.json();

            if (response.ok) {
                setBookingId(data.id); // Store booking ID
                setFormattedBookingId(data.booking_id); // Store formatted ID

                // CRITICAL FIX: Add delay before changing state to allow Razorpay modal to close properly
                // This prevents "NotFoundError: Failed to execute 'removeChild' on 'Node'"
                setTimeout(() => {
                    setStep(3); // Move to Success Step
                    setPopup({
                        isOpen: true,
                        type: 'success',
                        title: 'Booking Confirmed!',
                        message: `Booking ${data.booking_id || `#${data.id}`} successful. Check your email for details.`
                    });
                }, 1500);
            } else {
                // Show detailed error if available
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || 'Booking confirmation failed');
                throw new Error(errorMessage);
            }
        } catch (error) {
            setPopup({
                isOpen: true,
                type: 'error',
                title: 'Finalization Error',
                message: error.message
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}>Loading...</div>;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Segoe UI', sans-serif"
        }}>
            {/* Added 'notranslate' class to prevent Google Translate from breaking React DOM updates */}
            <div className="booking-container notranslate" style={{
                maxWidth: '850px',
                width: '100%',
                margin: '0 auto',
                background: 'white',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
                <div className="booking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem', fontWeight: 'bold' }}>
                        {step === 1 ? 'Book Vehicle' : step === 2 ? 'Complete Payment' : 'Booking Confirmed'}
                    </h1>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#666', cursor: 'pointer' }}>&times;</button>
                </div>

                {/* Progress Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                    {['Details', 'Payment', 'Done'].map((label, idx) => (
                        <div key={idx} style={{ textAlign: 'center', zIndex: 1, flex: 1 }}>
                            <div style={{
                                width: '30px', height: '30px', borderRadius: '50%',
                                background: step > idx + 1 ? '#28a745' : step === idx + 1 ? '#007bff' : '#dee2e6',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px'
                            }}>
                                {step > idx + 1 ? '✓' : idx + 1}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: step === idx + 1 ? '#007bff' : '#6c757d' }}>{label}</span>
                        </div>
                    ))}
                    <div style={{ position: 'absolute', top: '15px', left: '16%', right: '16%', height: '2px', background: '#dee2e6', zIndex: 0 }}>
                        <div style={{ width: `${(step - 1) * 50}%`, height: '100%', background: '#28a745', transition: 'width 0.3s' }}></div>
                    </div>
                </div>

                {/* Vehicle Summary (Small) */}
                <div className="vehicle-info" style={{ display: 'flex', gap: '1rem', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
                    <img
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/80x80?text=Vehicle'; }}
                        style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{vehicle.name}</h3>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>₹{vehicle.price}/hour • {vehicle.fuel_type}</p>
                    </div>
                </div>

                {/* Delivery Option Toggle (Only for Cars) */}
                {(apiType === 'cars' || apiType === 'car') && step === 1 && (
                    <div style={{ marginBottom: '2rem', background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: '#166534' }}>Choose Delivery Method</h3>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div 
                                onClick={() => setFormData({...formData, deliveryOption: 'pickup', deliveryFee: 0, distance: 0})}
                                style={{ 
                                    flex: 1, padding: '15px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                    background: formData.deliveryOption === 'pickup' ? '#22c55e' : 'white',
                                    color: formData.deliveryOption === 'pickup' ? 'white' : '#166534',
                                    border: '2px solid #22c55e', transition: 'all 0.2s ease', fontWeight: 'bold'
                                }}
                            >
                                🏪 Self-Pickup (Free)
                            </div>
                            <div 
                                onClick={() => setFormData({...formData, deliveryOption: 'home_delivery'})}
                                style={{ 
                                    flex: 1, padding: '15px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                                    background: formData.deliveryOption === 'home_delivery' ? '#22c55e' : 'white',
                                    color: formData.deliveryOption === 'home_delivery' ? 'white' : '#166534',
                                    border: '2px solid #22c55e', transition: 'all 0.2s ease', fontWeight: 'bold'
                                }}
                            >
                                🏠 Home Delivery (₹{RATE_PER_KM}/KM)
                            </div>
                        </div>

                        {formData.deliveryOption === 'home_delivery' && (
                            <div style={{ marginTop: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#166534' }}>Delivery Location</label>

                                {/* Search Box + Live Location Button Row */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'stretch' }}>
                                    <input
                                        id="delivery-address-input"
                                        type="text"
                                        placeholder="Search your delivery location..."
                                        value={formData.deliveryAddress}
                                        onChange={(e) => setFormData({...formData, deliveryAddress: e.target.value})}
                                        style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '1rem', boxSizing: 'border-box', outline: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        title="Use my live location"
                                        disabled={fetchingLocation}
                                        onClick={() => {
                                            if (!navigator.geolocation) {
                                                setPopup({ isOpen: true, type: 'error', title: 'Not Supported', message: 'Geolocation is not supported by your browser.' });
                                                return;
                                            }
                                            setFetchingLocation(true);
                                            navigator.geolocation.getCurrentPosition(
                                                (position) => {
                                                    const liveLoc = {
                                                        lat: position.coords.latitude,
                                                        lng: position.coords.longitude
                                                    };
                                                    // Reverse geocode to get human-readable address
                                                    if (window.google) {
                                                        const geocoder = new window.google.maps.Geocoder();
                                                        geocoder.geocode({ location: liveLoc }, (results, status) => {
                                                            setFetchingLocation(false);
                                                            if (status === 'OK' && results[0]) {
                                                                // Fill the input field with the address
                                                                const addressInput = document.getElementById('delivery-address-input');
                                                                if (addressInput) addressInput.value = results[0].formatted_address;
                                                                calculateDistance(liveLoc, results[0].formatted_address);
                                                            } else {
                                                                // Fallback: use raw coordinates as address
                                                                calculateDistance(liveLoc, `${liveLoc.lat.toFixed(5)}, ${liveLoc.lng.toFixed(5)}`);
                                                            }
                                                        });
                                                    } else {
                                                        setFetchingLocation(false);
                                                        calculateDistance(liveLoc, `${liveLoc.lat.toFixed(5)}, ${liveLoc.lng.toFixed(5)}`);
                                                    }
                                                },
                                                (err) => {
                                                    setFetchingLocation(false);
                                                    setPopup({
                                                        isOpen: true,
                                                        type: 'error',
                                                        title: 'Location Denied',
                                                        message: 'Could not get your location. Please allow location access or type your address manually.'
                                                    });
                                                },
                                                { enableHighAccuracy: true, timeout: 10000 }
                                            );
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0 16px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: fetchingLocation
                                                ? '#9ca3af'
                                                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '0.85rem',
                                            cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                                            whiteSpace: 'nowrap',
                                            boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
                                            transition: 'all 0.2s ease',
                                            minWidth: '48px'
                                        }}
                                    >
                                        {fetchingLocation ? (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                                                </svg>
                                                <span>Locating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                                </svg>
                                                <span>📍 My Location</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Google Maps Directions Embed — updates reactively */}
                                <div style={{ width: '100%', borderRadius: '14px', overflow: 'hidden', border: '2px solid #bbf7d0', marginBottom: '15px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                                    {formData.lat && formData.lng ? (
                                        <iframe
                                            key={`${formData.lat}-${formData.lng}`}
                                            title="Delivery Route"
                                            width="100%"
                                            height="360"
                                            style={{ border: 0, display: 'block' }}
                                            loading="lazy"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                            src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyDIIoFnrdbqEuukqUQ5XH4sNhD_9KncetA&origin=${SHOP_LOCATION.lat},${SHOP_LOCATION.lng}&destination=${formData.lat},${formData.lng}&mode=driving&language=en`}
                                        />
                                    ) : (
                                        /* Placeholder before location is picked */
                                        <iframe
                                            title="Shop Location"
                                            width="100%"
                                            height="360"
                                            style={{ border: 0, display: 'block' }}
                                            loading="lazy"
                                            allowFullScreen
                                            referrerPolicy="no-referrer-when-downgrade"
                                            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDIIoFnrdbqEuukqUQ5XH4sNhD_9KncetA&q=${SHOP_LOCATION.lat},${SHOP_LOCATION.lng}&zoom=14`}
                                        />
                                    )}
                                </div>

                                {formData.distance > 0 && (
                                    <div style={{
                                        padding: '15px', background: 'white', borderRadius: '10px',
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #bbf7d0'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: '#15803d', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                            <i className="fas fa-route"></i>
                                            <span>Road Distance: {formData.distance} KM</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                                            🏠 Delivery Fee: <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{formData.deliveryFee}</span>
                                        </div>
                                    </div>
                                )}

                                <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '10px', textAlign: 'center' }}>
                                    📍 Search your location above — the route will appear on the map automatically.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 1: Details */}
                {step === 1 && (
                    <form onSubmit={handleCheckAvailability}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                                    <i className="far fa-calendar-alt" style={{ marginRight: '8px', color: '#007bff' }}></i> Start Date
                                </label>
                                <input
                                    type="date"
                                    name="startDate"
                                    min={today}
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        backgroundColor: '#f9fafb',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        color: '#1f2937'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#007bff';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                                        e.target.style.backgroundColor = '#ffffff';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                        e.target.style.backgroundColor = '#f9fafb';
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                                    <i className="far fa-clock" style={{ marginRight: '8px', color: '#007bff' }}></i> Start Time
                                </label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '1rem',
                                        backgroundColor: '#f9fafb',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        color: '#1f2937'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#007bff';
                                        e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                                        e.target.style.backgroundColor = '#ffffff';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#e5e7eb';
                                        e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                        e.target.style.backgroundColor = '#f9fafb';
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                                <i className="fas fa-hourglass-half" style={{ marginRight: '8px', color: '#007bff' }}></i> Duration (hours)
                            </label>
                            <input
                                type="number"
                                name="duration"
                                min="1"
                                max="672"
                                value={formData.duration}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    fontSize: '1rem',
                                    backgroundColor: '#f9fafb',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    color: '#1f2937'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#007bff';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                                    e.target.style.backgroundColor = '#ffffff';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e5e7eb';
                                    e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                    e.target.style.backgroundColor = '#f9fafb';
                                }}
                            />
                        </div>

                        <div className="price-details" style={{ background: '#e3f2fd', padding: '1rem', borderRadius: '4px', margin: '1.5rem 0' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1565c0' }}>Have a Coupon Code?</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Enter Coupon Code"
                                        value={couponInput}
                                        onChange={(e) => {
                                            setCouponInput(e.target.value.toUpperCase());
                                            if (e.target.value === '') setSelectedReward(null);
                                        }}
                                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, textTransform: 'uppercase' }}
                                    />
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={async () => {
                                            const code = couponInput.trim();
                                            if (!code) return;

                                            setProcessing(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                
                                                if (!token) {
                                                    setPopup({ 
                                                        isOpen: true, 
                                                        type: 'error', 
                                                        title: 'Login Required', 
                                                        message: 'Please login to apply coupons and view your rewards.',
                                                        isLoginNudge: true 
                                                    });
                                                    setProcessing(false);
                                                    return;
                                                }

                                                // 1. Try General Offers first
                                                const offerRes = await fetch('/api/offers/validate', {
                                                    method: 'POST',
                                                    headers: { 
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify({ 
                                                        code, 
                                                        bookingDetails: {
                                                            duration, 
                                                            vehicleCategory: apiType,
                                                            totalAmount: baseTotal,
                                                            startDate: formData.startDate,
                                                            startTime: formData.startTime
                                                        }
                                                    })
                                                });

                                                const offerData = await offerRes.json();

                                                if (offerRes.ok && offerData.success) {
                                                    const offer = offerData.offer;
                                                    setAppliedOffer(offer);
                                                    setSelectedReward(null); // Clear loyalty reward if using general offer
                                                    
                                                    let successMsg = `Coupon '${offer.code}' applied successfully!`;
                                                    if (offer.usage_limit_per_user === 1) {
                                                        successMsg += " (Note: This is a one-time use offer)";
                                                    }
                                                    
                                                    setPopup({ isOpen: true, type: 'success', title: 'Applied!', message: successMsg });
                                                } else {
                                                    // 2. Fallback to Loyalty Rewards
                                                    const reward = rewards.find(r => r.coupon_code === code && !r.is_used);
                                                    
                                                    if (reward) {
                                                        if (reward.reward_type === 'FREE_2_HOUR_RIDE') {
                                                            if (duration < 4) {
                                                                setPopup({
                                                                    isOpen: true,
                                                                    type: 'warning',
                                                                    title: '⚠️ Minimum 4 Hours Required',
                                                                    message: 'To use your Free 2-Hour Ride coupon, you must book for at least 4 hours.',
                                                                    customActions: (
                                                                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setFormData({ ...formData, duration: 4 });
                                                                                    setSelectedReward(reward);
                                                                                    setAppliedOffer(null);
                                                                                    setPopup({ isOpen: false });
                                                                                }}
                                                                                style={{ padding: '12px 30px', background: '#E57373', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}
                                                                            >
                                                                                Okay, Got it
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                });
                                                            } else {
                                                                setSelectedReward(reward);
                                                                setAppliedOffer(null);
                                                                setPopup({ isOpen: true, type: 'success', title: 'Applied!', message: 'Coupon Applied: Free 2-Hour Ride' });
                                                            }
                                                        } else {
                                                            setPopup({ isOpen: true, type: 'error', title: 'Invalid', message: 'This coupon is not applicable.' });
                                                        }
                                                    } else {
                                                        // Show the exact reason why the general coupon failed
                                                        const isLimit = offerData.error?.includes('used this coupon once');
                                                        const isExpired = offerData.error?.toLowerCase().includes('expired');
                                                        setPopup({ 
                                                            isOpen: true, 
                                                            type: 'error', 
                                                            title: isExpired ? 'Offer Expired' : (isLimit ? 'Offer Limit Reached' : 'Offer Not Applicable'), 
                                                            message: offerData.error || 'Invalid or used coupon code.' 
                                                        });
                                                    }
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                setPopup({ isOpen: true, type: 'error', title: 'Error', message: 'Failed to validate coupon.' });
                                            } finally {
                                                setProcessing(false);
                                            }
                                        }}
                                        style={{ padding: '10px 15px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                                    >
                                        {processing ? '...' : 'Apply'}
                                    </button>
                                </div>
                                {selectedReward && <small style={{ color: '#2e7d32', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>✅ Reward '{selectedReward.coupon_code}' Applied!</small>}
                                {appliedOffer && <small style={{ color: '#2e7d32', fontWeight: 'bold', marginTop: '5px', display: 'block' }}>✅ Offer '{appliedOffer.code}' Applied!</small>}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Total Amount:</span>
                                <strong>
                                    {selectedReward ? <s style={{ color: '#999', marginRight: '5px' }}>₹{baseTotal}</s> : null}
                                    ₹{finalTotal}
                                </strong>
                            </div>
                            
                            {formData.deliveryOption === 'home_delivery' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#15803d', fontSize: '0.9rem' }}>
                                    <span>Delivery Fare ({formData.distance} KM):</span>
                                    <span>+ ₹{formData.deliveryFee}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#007bff' }}>
                                <span>Advance Pay (30%):</span>
                                <strong>₹{advancePayment}</strong>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bbdefb', paddingTop: '0.5rem' }}>
                                <span>Remaining at Pickup:</span>
                                <strong>₹{remainingAmount}</strong>
                            </div>
                        </div>

                        <button type="submit" disabled={processing} className="submit-btn" style={{ width: '100%', padding: '1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '600', cursor: processing ? 'not-allowed' : 'pointer' }}>
                            {processing ? 'Checking...' : 'Continue to Pay'}
                        </button>
                    </form>
                )}

                {/* STEP 2: Payment */}
                {step === 2 && (
                    <div>
                        <div style={{ padding: '1.5rem', background: '#fef3c7', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fcd34d' }}>
                            <h3 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>Booking Summary</h3>
                            <p><strong>Date:</strong> {formData.startDate}</p>
                            <p><strong>Time:</strong> {formData.startTime}</p>
                            <p><strong>Duration:</strong> {formData.duration} hours</p>
                            {formData.deliveryOption === 'home_delivery' && (
                                <p style={{ color: '#15803d' }}><strong>Delivery:</strong> {formData.deliveryAddress} ({formData.distance} KM)</p>
                            )}
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ color: '#92400e' }}>Advance Amount to Pay:</span>
                                    {formData.deliveryOption === 'home_delivery' && (
                                        <small style={{ color: '#d97706' }}>(Includes Delivery Fee: ₹{formData.deliveryFee})</small>
                                    )}
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>₹{advancePayment}</span>
                            </div>
                        </div>

                        <div style={{
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            background: '#f8f9fa',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #eee'
                        }}>
                            <input
                                type="checkbox"
                                id="termsCheckbox"
                                checked={termsAccepted}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        // User trying to check: Show popup first
                                        // We don't set checked here, we wait for popup 'Accept'
                                        setShowTermsPopup(true);
                                    } else {
                                        // User trying to uncheck: Allow immediately
                                        setTermsAccepted(false);
                                    }
                                }}
                                style={{
                                    marginTop: '4px',
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer',
                                    accentColor: '#d97706'
                                }}
                            />
                            <label
                                htmlFor="termsCheckbox"
                                style={{ fontSize: '0.95rem', color: '#555', cursor: 'pointer', lineHeight: '1.5' }}
                                onClick={(e) => {
                                    // Handle label click manually to ensure popup opens if not checked
                                    if (!termsAccepted) {
                                        e.preventDefault();
                                        setShowTermsPopup(true);
                                    }
                                }}
                            >
                                I agree to the <span
                                    style={{ color: '#d97706', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                                >Terms and Conditions</span>. I confirm that I possess a valid driving license.
                            </label>
                        </div>

                        {/* Terms Popup */}
                        <TermsPopup
                            isOpen={showTermsPopup}
                            onClose={() => setShowTermsPopup(false)}
                            onAccept={() => {
                                setTermsAccepted(true);
                                setShowTermsPopup(false);
                            }}
                            onDecline={() => {
                                setTermsAccepted(false);
                                setShowTermsPopup(false);
                            }}
                        />

                        <button onClick={handlePayment} disabled={processing} style={{ width: '100%', padding: '1rem', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: processing ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                            {processing ? 'Processing...' : <><i className="fas fa-lock"></i> Pay ₹{advancePayment} Now</>}
                        </button>
                        <button onClick={() => setStep(1)} style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', background: 'none', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Back to Details</button>
                    </div>
                )}

                {/* STEP 3: Success */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{ width: '80px', height: '80px', background: '#d1e7dd', color: '#0f5132', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
                            <i className="fas fa-check"></i>
                        </div>
                        <h2 style={{ color: '#0f5132' }}>Booking Confirmed!</h2>
                        <p style={{ color: '#666', marginBottom: '2rem' }}>We've sent a confirmation email to you. Your vehicle is reserved.</p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={async () => {
                                    if (!bookingId) {
                                        setPopup({
                                            isOpen: true,
                                            type: 'error',
                                            title: 'Error',
                                            message: 'Booking ID not found. Please try from My Bookings.'
                                        });
                                        return;
                                    }

                                    setDownloadingInvoice(true);
                                    try {
                                        const token = localStorage.getItem('token');
                                        const response = await fetch(`/api/bookings/${bookingId}/invoice`, {
                                            method: 'GET',
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        });

                                        if (!response.ok) {
                                            throw new Error('Failed to download invoice');
                                        }

                                        // Create blob from response
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);

                                        // Create temporary link and trigger download
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `invoice_${formattedBookingId || bookingId}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();

                                        // Cleanup
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);

                                        setPopup({
                                            isOpen: true,
                                            type: 'success',
                                            title: 'Success',
                                            message: 'Invoice downloaded successfully!'
                                        });
                                    } catch (error) {
                                        console.error('Error downloading invoice:', error);
                                        setPopup({
                                            isOpen: true,
                                            type: 'error',
                                            title: 'Download Failed',
                                            message: 'Failed to download invoice. Please try again or check My Bookings.'
                                        });
                                    } finally {
                                        setDownloadingInvoice(false);
                                    }
                                }}
                                disabled={downloadingInvoice}
                                style={{
                                    padding: '0.8rem 1.5rem',
                                    background: downloadingInvoice ? '#6c757d' : '#0f5132',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: downloadingInvoice ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '1rem',
                                    fontWeight: '500'
                                }}
                            >
                                <i className={downloadingInvoice ? 'fas fa-spinner fa-spin' : 'fas fa-print'}></i>
                                {downloadingInvoice ? 'Downloading...' : 'Print Invoice'}
                            </button>
                            <button onClick={() => navigate('/my-bookings')} style={{ padding: '0.8rem 1.5rem', background: '#0f5132', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>My Bookings</button>
                            <button onClick={() => navigate('/')} style={{ padding: '0.8rem 1.5rem', background: 'none', border: '1px solid #0f5132', color: '#0f5132', borderRadius: '4px', cursor: 'pointer' }}>Home</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Status Popup */}
            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                // Custom Actions for Smart Nudge
                customActions={popup.isNudge || popup.isLoginNudge ? (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {popup.isLoginNudge ? (
                            <button
                                onClick={() => navigate('/login', { state: { returnUrl: location.pathname + location.search } })}
                                style={{ padding: '10px 20px', background: '#d97706', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', flex: 1, minWidth: '120px' }}
                            >
                                Login Now
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/rewards', { state: { returnUrl: location.pathname + location.search } })}
                                style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', flex: 1, minWidth: '120px' }}
                            >
                                Go to Rewards & Redeem
                            </button>
                        )}
                        <button onClick={() => setPopup({ ...popup, isOpen: false })} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', flex: 1, minWidth: '120px' }}>
                            Maybe Later
                        </button>
                    </div>
                ) : null}
            />
        </div >
    );
};

export default BookingForm;
