import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ReviewSummary, ReviewCard, ReviewForm, ImageSliderModal } from '../components/ReviewComponents';
import { toast } from 'react-hot-toast';
import StatusPopup from '../components/StatusPopup';

const VehicleDetails = () => {
    const { type, id } = useParams(); // type: 'bikes', 'cars', 'scooty'
    const navigate = useNavigate();

    const [vehicle, setVehicle] = useState(null);
    const [reviews, setReviews] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [sliderIndex, setSliderIndex] = useState(0);

    // Auth state for delete check
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const currentUserId = currentUser ? currentUser.id : null;

    const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '', onConfirm: null });

    const showPopup = (type, title, message, onConfirm = null) => {
        setPopup({ isOpen: true, type, title, message, onConfirm });
    };

    // Map 'bike' -> 'bikes' if necessary (though route should standardise)
    const apiType = type === 'bike' ? 'bikes' : type === 'car' ? 'cars' : type;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Vehicle
                const vehicleRes = await fetch(`/api/vehicles/${apiType}/${id}`);
                if (!vehicleRes.ok) throw new Error('Vehicle not found');
                const vehicleData = await vehicleRes.json();
                setVehicle(vehicleData);

                // Fetch Reviews
                const reviewRes = await fetch(`/api/reviews/${apiType}/${id}`);
                if (reviewRes.ok) {
                    const reviewData = await reviewRes.json();
                    setReviews(reviewData);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load vehicle details");
                // navigate('/'); // Optional: redirect on error
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [apiType, id, navigate]);

    const handleReviewSubmitted = async () => {
        setShowReviewForm(false);
        // Refresh reviews
        try {
            const reviewRes = await fetch(`/api/reviews/${apiType}/${id}`);
            if (reviewRes.ok) {
                const reviewData = await reviewRes.json();
                setReviews(reviewData);
            }
        } catch (e) { console.error("Error refreshing reviews", e); }

    };

    const handleDeleteReview = async (reviewId) => {
        showPopup('confirm', 'Delete Review', 'Are you sure you want to delete this review?', async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`/api/reviews/${reviewId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (res.ok) {
                    setPopup({ ...popup, isOpen: false });
                    toast.success("Review deleted");
                    // Refresh reviews
                    const reviewRes = await fetch(`/api/reviews/${apiType}/${id}`);
                    if (reviewRes.ok) {
                        const reviewData = await reviewRes.json();
                        setReviews(reviewData);
                    }
                } else {
                    const data = await res.json();
                    showPopup('error', 'Delete Failed', data.error || "Failed to delete review");
                }
            } catch (error) {
                console.error(error);
                showPopup('error', 'Error', "Error deleting review");
            }
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px', minHeight: '100vh' }}>Loading...</div>;
    if (!vehicle) return <div style={{ textAlign: 'center', paddingTop: '100px', minHeight: '100vh' }}>Vehicle not found</div>;

    return (
        <div style={{ background: '#fff', minHeight: '100vh' }}>
            <div className="container" style={{ padding: '100px 20px 50px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Vehicle Header & Main Info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>

                    {/* Left: Image */}
                    <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #eee' }}>
                        <img
                            src={vehicle.image_url}
                            alt={vehicle.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#f8f8f8', maxHeight: '500px' }}
                        />
                    </div>

                    {/* Right: Details */}
                    <div>
                        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#1a1a1a' }}>{vehicle.name}</h1>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span style={{ background: '#388e3c', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                {(reviews.length > 0 ? (reviews.reduce((acc, r) => acc + parseFloat(r.rating), 0) / reviews.length).toFixed(1) : 'New')} <i className="fas fa-star" style={{ fontSize: '0.8rem' }}></i>
                            </span>
                            <span style={{ color: '#777' }}>{reviews.length} Ratings & Reviews</span>
                        </div>

                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2rem' }}>
                            ₹{vehicle.price}<span style={{ fontSize: '1rem', color: '#777', fontWeight: 'normal' }}>/hour</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                <i className="fas fa-microchip" style={{ color: '#007bff', marginRight: '10px' }}></i>
                                <strong>Engine:</strong> {vehicle.engine || 'N/A'}
                            </div>
                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                <i className="fas fa-gas-pump" style={{ color: '#007bff', marginRight: '10px' }}></i>
                                <strong>Fuel:</strong> {vehicle.fuel_type || 'Petrol'}
                            </div>
                            <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                                <i className="fas fa-cog" style={{ color: '#007bff', marginRight: '10px' }}></i>
                                <strong>Type:</strong> {vehicle.type || type}
                            </div>
                        </div>

                        <Link
                            to={`/booking-form?vehicleId=${vehicle.id}&type=${apiType}`}
                            style={{
                                display: 'inline-block',
                                background: '#fb641b',
                                color: 'white',
                                padding: '1.2rem 3rem',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                transition: 'transform 0.2s',
                            }}
                            onMouseOver={e => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
                        >
                            Rent Now
                        </Link>
                    </div>
                </div>

                {/* Reviews Section */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.8rem', color: '#1a1a1a', margin: 0 }}>Ratings & Reviews</h2>
                        {!showReviewForm && (
                            <button
                                onClick={() => {
                                    const token = localStorage.getItem('token');
                                    if (!token) {
                                        toast.error("Please login to rate this vehicle");
                                        navigate('/login');
                                        return;
                                    }
                                    setShowReviewForm(true);
                                }}
                                style={{
                                    padding: '0.8rem 1.5rem',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                Rate Product
                            </button>
                        )}
                    </div>

                    {showReviewForm && (
                        <div style={{ marginBottom: '2rem' }}>
                            <ReviewForm
                                vehicleId={vehicle.id}
                                vehicleType={apiType}
                                onReviewSubmitted={handleReviewSubmitted}
                                onCancel={() => setShowReviewForm(false)}
                            />
                        </div>
                    )}

                    {/* Customer Photos Strip */}
                    {reviews.flatMap(r => r.photos || []).length > 0 && (
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#333' }}>Customer Photos ({reviews.flatMap(r => r.photos || []).length})</h3>
                            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '10px', scrollBehavior: 'smooth' }}>
                                {reviews.flatMap(r => r.photos || []).map((photo, index) => (
                                    <div key={index}
                                        onClick={() => { setSliderIndex(index); setIsSliderOpen(true); }}
                                        style={{
                                            flexShrink: 0, width: '100px', height: '100px',
                                            cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
                                            border: '1px solid #ddd',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                                        }}>
                                        <img src={photo} alt="Customer" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                                            onMouseOver={e => e.target.style.transform = 'scale(1.1)'}
                                            onMouseOut={e => e.target.style.transform = 'scale(1.0)'}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: '3rem' }}>
                        <ReviewSummary reviews={reviews} />
                    </div>



                    {/* Image Slider Modal */}
                    {isSliderOpen && (
                        <ImageSliderModal
                            images={reviews.flatMap(r => r.photos || [])}
                            initialIndex={sliderIndex}
                            onClose={() => setIsSliderOpen(false)}
                        />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {reviews.map(review => (
                            <ReviewCard
                                key={review.id}
                                review={review}
                                currentUserId={currentUserId}
                                onDelete={handleDeleteReview}
                            />
                        ))}
                        {reviews.length === 0 && (
                            <div style={{ color: '#777', fontStyle: 'italic', padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px' }}>
                                No reviews yet. Be the first to rent and review this vehicle!
                            </div>
                        )}
                    </div>
                </div>

            </div>
            
            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                onConfirm={popup.onConfirm}
                confirmText="Yes, Delete It"
                cancelText="Cancel"
            />
        </div>
    );
};

export default VehicleDetails;
