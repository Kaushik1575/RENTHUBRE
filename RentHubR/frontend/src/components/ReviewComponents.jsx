import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Helper to render stars
const StarRating = ({ rating, size = '1rem', color = '#faaf00' }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const fill = i <= rating ? 'fas' : i - 0.5 <= rating ? 'fas fa-star-half-alt' : 'far';
        const iconClass = fill === 'fas' || fill === 'far' ? `${fill} fa-star` : fill;

        stars.push(
            <i
                key={i}
                className={iconClass}
                style={{ color, fontSize: size, marginRight: '2px' }}
            ></i>
        );
    }
    return <span>{stars}</span>;
};

export const ReviewSummary = ({ reviews }) => {
    const totalReviews = reviews.length;
    const averageRating = totalReviews === 0
        ? 0
        : (reviews.reduce((acc, r) => acc + parseFloat(r.rating), 0) / totalReviews).toFixed(1);

    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        const rounded = Math.round(r.rating);
        if (counts[rounded] !== undefined) counts[rounded]++;
    });

    return (
        <div className="review-summary" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#333' }}>{averageRating} <span style={{ fontSize: '1.5rem', color: '#777' }}>/ 5</span></div>
                <StarRating rating={averageRating} size="1.2rem" />
                <div style={{ color: '#777', marginTop: '5px' }}>{totalReviews} Verified Reviews</div>
            </div>

            <div style={{ flex: 1, minWidth: '250px' }}>
                {[5, 4, 3, 2, 1].map(num => (
                    <div key={num} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        <span style={{ width: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>{num}</span>
                        <i className="fas fa-star" style={{ color: '#777', fontSize: '0.8rem', margin: '0 5px' }}></i>
                        <div style={{ flex: 1, background: '#e0e0e0', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '0 10px' }}>
                            <div style={{
                                width: `${totalReviews ? (counts[num] / totalReviews) * 100 : 0}%`,
                                background: '#388e3c',
                                height: '100%'
                            }}></div>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#777', width: '30px' }}>{counts[num]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ReviewCard = ({ review, currentUserId, onDelete }) => {
    return (
        <div style={{ padding: '1.5rem 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                    background: '#388e3c', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    {review.rating} <i className="fas fa-star" style={{ fontSize: '0.7rem' }}></i>
                </span>
                <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{review.users?.full_name || 'RentHub User'}</span>

                {currentUserId && String(review.user_id) === String(currentUserId) && (
                    <button
                        onClick={() => onDelete(review.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.9rem' }}
                        title="Delete your review"
                    >
                        <i className="fas fa-trash-alt"></i>
                    </button>
                )}
            </div>

            <div style={{ color: '#555', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '0.8rem' }}>
                {review.comment}
            </div>

            {review.photos && review.photos.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    {review.photos.map((photo, idx) => (
                        <img
                            key={idx}
                            src={photo}
                            alt="Review"
                            style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#888', fontSize: '0.85rem' }}>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
                {review.is_verified_purchase && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#888' }}>
                        <i className="fas fa-check-circle" style={{ color: '#aaa' }}></i> Verified Purchaser
                    </span>
                )}
            </div>
        </div>
    );
};

export const ReviewForm = ({ vehicleId, vehicleType, onReviewSubmitted, onCancel }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [photos, setPhotos] = useState([]); // Array of base64 strings or URLs
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePhotoUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + photos.length > 5) {
            toast.error("Maximum 5 photos allowed");
            return;
        }

        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) { // 2MB
                toast.error("File size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotos(prev => [...prev, reader.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return toast.error("Please select a star rating");
        if (comment.trim().length < 10) return toast.error("Please write at least 10 characters");

        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error("Please login to review");
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicleId,
                    vehicleType,
                    rating,
                    comment,
                    photos
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to submit review');
            }

            toast.success("Review submitted successfully!");
            onReviewSubmitted();

        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Write a Review</h3>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Rating</label>
                <div style={{ fontSize: '1.5rem', cursor: 'pointer' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <i
                            key={star}
                            className={star <= (hoverRating || rating) ? "fas fa-star" : "far fa-star"}
                            style={{ color: star <= (hoverRating || rating) ? '#faaf00' : '#ccc', marginRight: '5px' }}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        ></i>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Your Review</label>
                <textarea
                    rows="4"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share details of your experience..."
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Add Photos (Optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={photos.length >= 5}
                    style={{ marginBottom: '0.5rem' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                    {photos.map((p, idx) => (
                        <div key={idx} style={{ position: 'relative' }}>
                            <img src={p} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                            <button
                                type="button"
                                onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                            >X</button>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ background: '#388e3c', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '4px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ background: 'none', border: '1px solid #ccc', padding: '0.8rem 1.5rem', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export const ImageSliderModal = ({ images, initialIndex, onClose }) => {
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    const handleNext = (e) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setActiveIndex((prev) => (prev + 1) % images.length);
            if (e.key === 'ArrowLeft') setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [images.length, onClose]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 1, transition: 'opacity 0.3s ease'
        }} onClick={onClose}>

            <button onClick={onClose} style={{
                position: 'absolute', top: '20px', right: '30px',
                background: 'transparent', border: 'none', color: 'white',
                fontSize: '2.5rem', cursor: 'pointer', zIndex: 10001,
                textShadow: '0 0 5px rgba(0,0,0,0.5)'
            }}>&times;</button>

            {images.length > 1 && (
                <>
                    <button onClick={handlePrev} style={{
                        position: 'absolute', left: '20px',
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        padding: '20px 15px', fontSize: '2rem', cursor: 'pointer',
                        borderRadius: '8px', zIndex: 10001,
                        transition: 'background 0.2s'
                    }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >&#10094;</button>

                    <button onClick={handleNext} style={{
                        position: 'absolute', right: '20px',
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        padding: '20px 15px', fontSize: '2rem', cursor: 'pointer',
                        borderRadius: '8px', zIndex: 10001,
                        transition: 'background 0.2s'
                    }}
                        onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseOut={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    >&#10095;</button>
                </>
            )}

            <img
                src={images[activeIndex]}
                alt={`Slide ${activeIndex}`}
                style={{
                    maxWidth: '90%', maxHeight: '90%',
                    objectFit: 'contain', boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                    borderRadius: '4px'
                }}
                onClick={(e) => e.stopPropagation()}
            />

            <div style={{
                position: 'absolute', bottom: '30px', color: 'white',
                background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '20px',
                fontSize: '0.9rem', letterSpacing: '1px'
            }}>
                {activeIndex + 1} / {images.length}
            </div>
        </div>
    );
};
