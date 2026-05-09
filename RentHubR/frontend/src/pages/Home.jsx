import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';


const Home = () => {
    const [bikes, setBikes] = useState([]);
    const [scooters, setScooters] = useState([]);
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [offers, setOffers] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const navigate = useNavigate();

    // Live Timer for auto-refreshing offer states
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const [bikesRes, scootersRes, carsRes] = await Promise.all([
                    fetch('/api/vehicles/bikes'),
                    fetch('/api/vehicles/scooty'),
                    fetch('/api/vehicles/cars')
                ]);

                const bikesData = await bikesRes.json();
                const scootersData = await scootersRes.json();
                const carsData = await carsRes.json();

                setBikes((bikesData || []).filter(v => v.is_available));
                setScooters((scootersData || []).filter(v => v.is_available));
                setCars((carsData || []).filter(v => v.is_available));
            } catch (error) {
                console.error('Error loading vehicles:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchOffers = async () => {
            try {
                const res = await fetch('/api/offers/active');
                const data = await res.json();
                if (data.success) setOffers(data.offers);
            } catch (err) {
                console.error('Error loading offers:', err);
            }
        };

        fetchVehicles();
        fetchOffers();
    }, []);

    // Handle reward banner clicks with login check
    const handleRewardClick = (e) => {
        e.preventDefault();

        // Check if user is logged in
        const token = localStorage.getItem('token');

        if (!token) {
            // Store intended destination
            sessionStorage.setItem('redirectAfterLogin', '/rewards');
            // Redirect to login
            navigate('/login');
        } else {
            // User is logged in, go to rewards page
            navigate('/rewards');
        }
    };

    // Scroll Animation Observer
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        const headers = document.querySelectorAll('.category-header');
        headers.forEach(header => observer.observe(header));

        return () => headers.forEach(header => observer.unobserve(header));
    }, []);

    const VehicleCard = ({ vehicle, type }) => {
        // Mock rating if not present (random between 4.5 and 5.0)
        const rating = (4.5 + Math.random() * 0.5).toFixed(1);

        // Find the best offer for this specific category
        const matchingOffer = (offers || []).find(o => {
            if (!o.is_active) return false;
            
            // Check if it's actually live (not future and not expired)
            const isLive = (!o.valid_from || new Date(o.valid_from) <= currentTime) && 
                           (!o.valid_until || new Date(o.valid_until) >= currentTime);
            if (!isLive) return false;

            const target = o.target_category.toUpperCase();
            const currentType = type.toUpperCase();

            // Strict matching logic
            if (target === 'ALL') return true;
            if (target === 'BIKES' && currentType === 'BIKE') return true;
            if (target === currentType) return true;

            return false;
        });

        return (
            <div className="vehicle-card" data-id={vehicle.id} data-type={type}>
                <div className="card-image-wrapper">
                    <Link to={`/vehicle/${type}/${vehicle.id}`}>
                        <img src={vehicle.image_url} alt={vehicle.name} />
                    </Link>
                    <span className="rating-badge"><i className="fas fa-star"></i> {rating}</span>
                </div>
                <div className="vehicle-details">
                    <div className="vehicle-header">
                        <Link to={`/vehicle/${type}/${vehicle.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h3>{vehicle.name}</h3>
                        </Link>
                        <span className="engine-badge">{vehicle.engine || 'N/A'}</span>
                    </div>

                    <div className="vehicle-specs">
                        <span><i className="fas fa-gas-pump"></i> {vehicle.fuel_type || 'Petrol'}</span>
                        <span><i className="fas fa-tachometer-alt"></i> Manual</span>
                    </div>

                    <div className="card-divider"></div>

                    <div className="vehicle-footer">
                        <div className="price-info">
                            <span className="price-label">Price per Hour</span>
                            <span className="price-value">₹{vehicle.price}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                            <Link to={`/vehicle/${type}/${vehicle.id}`} className="view-btn" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px',
                                border: '1px solid #007bff',
                                borderRadius: '8px',
                                color: '#007bff',
                                textDecoration: 'none',
                                fontWeight: '600',
                                backgroundColor: 'white',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease'
                            }}>
                                View
                            </Link>
                            <Link to={`/booking-form?vehicleId=${vehicle.id}&type=${type}`} className="rent-btn" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '10px',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontSize: '1rem',
                                height: 'auto',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}>
                                Rent Now
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    // Scroll to specific section
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const offset = 80; // Adjust for sticky navbar
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveCategory(id); // Optional: keep highlighting the button
        } else if (id === 'All') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveCategory('All');
        }
    };

    return (
        <main>


            <section className="hero">
                <div className="hero-content">
                    <h1>Your Adventure Starts Here</h1>
                    <p>Explore our wide range of bikes, scooty, and cars for your next journey.</p>
                </div>
            </section>

            {/* Vehicle Showcase Section */}
            <section className="vehicle-showcase" style={{ paddingTop: '20px' }}>
                <div className="container" style={{ maxWidth: '100%', padding: '0' }}>

                    {/* DYNAMIC FESTIVE OFFERS SECTION - MOVED ABOVE VEHICLE HEADER */}
                    {offers && offers.length > 0 && (
                        <div style={{
                            margin: '0 0 60px 0',
                            background: 'rgba(248, 250, 252, 0.5)',
                            backdropFilter: 'blur(10px)',
                            padding: '60px 0',
                            borderRadius: '0 0 60px 60px',
                            borderBottom: '1px solid rgba(226, 232, 240, 0.8)'
                        }}>
                            <div style={{
                                width: '100%',
                                padding: '0 5%'
                            }}>
                                {/* Decorative Glow Background */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-40px',
                                    left: '-20px',
                                    width: '400px',
                                    height: '200px',
                                    background: 'radial-gradient(circle, rgba(79, 70, 229, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
                                    zIndex: 0,
                                    pointerEvents: 'none'
                                }}></div>

                                <div style={{
                                    textAlign: 'center',
                                    marginBottom: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '20px',
                                    position: 'relative',
                                    zIndex: 1
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <span style={{
                                            padding: '10px 24px',
                                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                            color: 'white',
                                            borderRadius: '50px',
                                            fontSize: '12px',
                                            fontWeight: '950',
                                            textTransform: 'uppercase',
                                            letterSpacing: '2.5px',
                                            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
                                            animation: 'pulse 2s infinite'
                                        }}>
                                            <style>{`
                                                    @keyframes pulse {
                                                        0% { transform: scale(1); box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4); }
                                                        50% { transform: scale(1.05); box-shadow: 0 15px 35px rgba(79, 70, 229, 0.6); }
                                                        100% { transform: scale(1); box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4); }
                                                    }
                                                `}</style>
                                            Limited Time
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '42px', animation: 'float 3s ease-in-out infinite' }}>
                                                <style>{`
                                                        @keyframes float {
                                                            0% { transform: translateY(0px) rotate(0deg); }
                                                            50% { transform: translateY(-10px) rotate(5deg); }
                                                            100% { transform: translateY(0px) rotate(0deg); }
                                                        }
                                                    `}</style>
                                                🎉
                                            </span>
                                            <h2 style={{
                                                fontSize: window.innerWidth < 768 ? '36px' : '58px',
                                                fontWeight: '950',
                                                margin: '0',
                                                color: '#1e1b4b',
                                                letterSpacing: '-2px',
                                                lineHeight: '1.1'
                                            }}>
                                                Festive <span style={{ color: '#4f46e5' }}>Rewards</span> & Deals
                                            </h2>
                                        </div>
                                    </div>

                                    <p style={{
                                        color: '#64748b',
                                        margin: '0',
                                        fontSize: '18px',
                                        fontWeight: '500',
                                        maxWidth: '750px',
                                        lineHeight: '1.6'
                                    }}>
                                        Exclusive seasonal perks handcrafted for your next unforgettable journey.
                                    </p>

                                    {offers.length > 1 && (
                                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                                            <button className="scroll-btn" onClick={() => document.getElementById('offers-container').scrollBy({ left: -450, behavior: 'smooth' })} style={{ width: '56px', height: '56px', borderRadius: '18px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.04)', transition: '0.4s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chevron-left" style={{ color: '#4f46e5', fontSize: '18px' }}></i></button>
                                            <button className="scroll-btn" onClick={() => document.getElementById('offers-container').scrollBy({ left: 450, behavior: 'smooth' })} style={{ width: '56px', height: '56px', borderRadius: '18px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.04)', transition: '0.4s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-chevron-right" style={{ color: '#4f46e5', fontSize: '18px' }}></i></button>
                                        </div>
                                    )}
                                </div>

                                <div
                                    id="offers-container"
                                    style={{
                                        display: 'flex',
                                        gap: window.innerWidth < 768 ? '20px' : '40px',
                                        overflowX: offers.length === 1 ? 'hidden' : 'auto',
                                        padding: '20px 50px 40px 50px', // Added side padding for 'peeking' effect
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none',
                                        scrollSnapType: 'x mandatory',
                                        justifyContent: offers.length === 1 ? 'center' : 'flex-start',
                                        scrollPadding: '50px' // Ensure snap accounts for padding
                                    }}
                                >
                                {offers && offers
                                    .filter(offer => {
                                        // 1. Hide if completely expired (valid_until passed)
                                        if (offer.valid_until && new Date(offer.valid_until) < currentTime) return false;
                                        // 2. Hide if it's too far in the future (optional, but keep it for now)
                                        return true;
                                    })
                                    .map((offer, idx) => {
                                        const isFuture = offer.valid_from && new Date(offer.valid_from) > currentTime;
                                        const isMobile = window.innerWidth < 768;
                                        const launchDateTime = isFuture 
                                            ? new Date(offer.valid_from).toLocaleString('en-IN', { 
                                                day: 'numeric', 
                                                month: 'short', 
                                                hour: '2-digit', 
                                                minute: '2-digit',
                                                hour12: true 
                                            }) 
                                            : null;

                                        return (
                                            <div 
                                                key={offer.id}
                                                className={`offer-card-modern ${isFuture ? 'offer-future' : ''}`}
                                                style={{ 
                                                    minWidth: offers.length === 1 ? 'min(600px, 92vw)' : 'min(480px, 85vw)', 
                                                    background: 'white', 
                                                    borderRadius: '32px', 
                                                    overflow: 'hidden', 
                                                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
                                                    border: '1px solid #f1f5f9',
                                                    scrollSnapAlign: 'center',
                                                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                                    position: 'relative',
                                                    flexShrink: 0,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    height: isMobile ? 'auto' : '780px',
                                                    cursor: isFuture ? 'default' : 'pointer'
                                                }}
                                            >
                                                {/* Future Blur Overlay */}
                                                {isFuture && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        backdropFilter: 'blur(8px)',
                                                        zIndex: 10,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        textAlign: 'center',
                                                        padding: '30px'
                                                    }}>
                                                        <div style={{ 
                                                            background: '#4f46e5', 
                                                            color: 'white', 
                                                            padding: '12px 24px', 
                                                            borderRadius: '50px', 
                                                            fontWeight: '900', 
                                                            fontSize: '18px', 
                                                            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)',
                                                            marginBottom: '15px',
                                                            animation: 'pulse 2s infinite'
                                                        }}>
                                                            🚀 LAUNCHING SOON
                                                        </div>
                                                        <div style={{ color: '#1e1b4b', fontWeight: '800', fontSize: '20px' }}>
                                                            Starts on {launchDateTime}
                                                        </div>
                                                        <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '250px', marginTop: '10px' }}>
                                                            Set your reminders! This exclusive deal will be unlocked on {launchDateTime}.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Top Status Header */}
                                                <div style={{ 
                                                    padding: isMobile ? '15px 20px' : '20px 30px', 
                                                    borderBottom: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    flexShrink: 0,
                                                    filter: isFuture ? 'blur(2px)' : 'none'
                                                }}>
                                                    <div style={{ 
                                                        background: isFuture ? '#f1f5f9' : '#fff7ed', 
                                                        padding: '6px 12px', 
                                                        borderRadius: '100px', 
                                                        fontSize: '10px', 
                                                        fontWeight: '800', 
                                                        color: isFuture ? '#64748b' : '#c2410c',
                                                        letterSpacing: '1px',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {isFuture ? '📅 UPCOMING' : '✨ Exclusive Deal'}
                                                    </div>
                                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>
                                                        {isFuture ? `Starting ${launchDateTime}` : `Ends ${offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Soon'}`}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, filter: isFuture ? 'blur(2px)' : 'none' }}>
                                                    {/* Visual Section */}
                                                    <div className="offer-card-image" style={{ width: '100%', height: '240px', position: 'relative', flexShrink: 0 }}>
                                                        <img src={offer.image_url || 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?auto=format&fit=crop&q=80&w=800'} alt={offer.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        <div style={{ 
                                                            position: 'absolute', 
                                                            top: isMobile ? '15px' : '20px', 
                                                            left: isMobile ? '15px' : '20px',
                                                            background: 'rgba(255, 255, 255, 0.95)',
                                                            padding: '6px 12px',
                                                            borderRadius: '10px',
                                                            fontSize: isMobile ? '12px' : '14px',
                                                            fontWeight: '900',
                                                            color: '#4f46e5',
                                                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                                                        }}>
                                                            {offer.discount_percentage ? `${offer.discount_percentage}% OFF` : `₹${offer.flat_discount} OFF`}
                                                        </div>
                                                    </div>

                                                    {/* Content Section */}
                                                    <div style={{ padding: isMobile ? '20px' : '30px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <h3 className="offer-card-title" style={{ 
                                                                fontSize: '32px', 
                                                                fontWeight: '800', 
                                                                margin: '0 0 8px 0', 
                                                                color: '#0f172a', 
                                                                letterSpacing: '-0.5px', 
                                                                lineHeight: '1.2' 
                                                            }}>{offer.title}</h3>
                                                            <p className="offer-card-desc" style={{ color: '#64748b', fontSize: '16px', margin: '0 0 20px 0', lineHeight: '1.5' }}>{offer.description}</p>
                                                            
                                                            {/* Capsule Badges Grid */}
                                                            <div className="offer-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '30px' }}>
                                                                {[
                                                                    { icon: 'fa-tag', label: 'Valid For', value: offer.target_category, color: '#6366f1' },
                                                                    { icon: 'fa-calendar-alt', label: 'Availability', value: offer.valid_days ? offer.valid_days.split(',').map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseInt(d)]).join(', ') : 'Every Day', color: '#8b5cf6' },
                                                                    { icon: 'fa-clock', label: 'Min Booking', value: offer.min_duration > 0 ? `${offer.min_duration}h` : 'No Min', color: '#f59e0b', hide: offer.min_duration <= 0 },
                                                                    { icon: 'fa-wallet', label: 'Min Spend', value: offer.min_booking_amount > 0 ? `₹${offer.min_booking_amount}` : 'Any', color: '#10b981', hide: offer.min_booking_amount <= 0 },
                                                                    { icon: 'fa-hourglass-half', label: 'Expires', value: offer.valid_until ? new Date(offer.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Soon', color: '#ef4444' }
                                                                ].filter(r => !r.hide).map((rule, idx) => (
                                                                    <div key={idx} className="offer-info-box" style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        gap: '8px',
                                                                        padding: '12px',
                                                                        background: '#f8fafc',
                                                                        borderRadius: '12px',
                                                                        border: '1px solid #f1f5f9'
                                                                    }}>
                                                                        <div style={{ color: rule.color, fontSize: isMobile ? '12px' : '14px' }}>
                                                                            <i className={`fas ${rule.icon}`}></i>
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>{rule.label}</div>
                                                                            <div style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: '700', color: '#1e293b' }}>{rule.value}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Copy Code Action - Always at Bottom */}
                                                        <div className="offer-promo-bar" style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'space-between', 
                                                            background: isFuture ? '#cbd5e1' : '#0f172a', 
                                                            padding: '10px 10px 10px 25px', 
                                                            borderRadius: '20px', 
                                                            boxShadow: isFuture ? 'none' : '0 20px 40px rgba(15, 23, 42, 0.2)',
                                                            flexShrink: 0,
                                                            marginTop: 'auto'
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontSize: '8px', color: isFuture ? '#64748b' : '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Promo Code</div>
                                                                <div className="promo-code-text" style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', letterSpacing: '4px', fontFamily: 'monospace' }}>
                                                                    {isFuture ? '••••••' : offer.code}
                                                                </div>
                                                            </div>
                                                            <button 
                                                                className="copy-btn-modern"
                                                                disabled={isFuture}
                                                                onClick={(e) => {
                                                                    if (isFuture) return;
                                                                    navigator.clipboard.writeText(offer.code);
                                                                    const btn = e.currentTarget;
                                                                    const originalContent = btn.innerHTML;
                                                                    btn.innerHTML = '<i class="fas fa-check"></i>';
                                                                    btn.style.background = '#10b981';
                                                                    setTimeout(() => {
                                                                        btn.innerHTML = originalContent;
                                                                        btn.style.background = '#6366f1';
                                                                    }, 2000);
                                                                }}
                                                                style={{ 
                                                                    background: isFuture ? '#94a3b8' : '#6366f1', 
                                                                    color: 'white', 
                                                                    border: 'none', 
                                                                    width: '56px',
                                                                    height: '56px',
                                                                    borderRadius: '14px', 
                                                                    fontWeight: '700',
                                                                    cursor: isFuture ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '18px',
                                                                    transition: 'all 0.3s ease'
                                                                }}
                                                            >
                                                                <i className={isFuture ? "fas fa-lock" : "far fa-copy"}></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="section-header text-center" style={{ padding: '0 20px' }}>
                        <h2 style={{ fontSize: '48px', fontWeight: '900', color: '#1e1b4b', marginBottom: '15px' }}>Featured Vehicles & Bikes</h2>
                        <p className="section-subtitle" style={{ fontSize: '18px', color: '#64748b', maxWidth: '800px', margin: '0 auto 40px auto' }}>Choose from our premium fleet of well-maintained vehicles for a safe and comfortable ride.</p>
                    </div>



                    {/* Category Filter */}
                    <div className="filter-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '15px',
                        marginBottom: '40px',
                        flexWrap: 'wrap',
                        position: 'sticky',
                        top: '80px',
                        zIndex: 100,
                        backgroundColor: '#f8f9fa',
                        padding: '10px 0'
                    }}>
                        {[
                            { name: 'All', id: 'All', icon: '✨' },
                            { name: 'Bikes', id: 'bikes-section', icon: '🏍️' },
                            { name: 'Scooty', id: 'scooters-section', icon: '🛵' },
                            { name: 'Cars', id: 'cars-section', icon: '🚗' }
                        ].map((category) => (
                            <button
                                key={category.name}
                                onClick={() => scrollToSection(category.id)}
                                style={{
                                    padding: '16px 40px',
                                    borderRadius: '50px',
                                    border: 'none',
                                    background: activeCategory === category.id
                                        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                                        : 'white',
                                    color: activeCategory === category.id ? 'white' : '#555',
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: activeCategory === category.id
                                        ? '0 8px 20px rgba(79, 172, 254, 0.4)'
                                        : '0 4px 6px rgba(0,0,0,0.05)',
                                    transform: activeCategory === category.id ? 'translateY(-2px)' : 'none',
                                    outline: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    if (activeCategory !== category.id) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeCategory !== category.id) {
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                    }
                                }}
                            >
                                {category.icon} {category.name}
                            </button>
                        ))}
                    </div>

                    {/* Bikes Section */}
                    <div className="category-section" id="bikes-section">
                        <h3 className="category-header">Bikes</h3>
                        <div className="vehicle-grid" id="bikesGrid">
                            {loading ? <p>Loading bikes...</p> : bikes.map(bike => <VehicleCard key={bike.id} vehicle={bike} type="bike" />)}
                            {!loading && bikes.length === 0 && <p>No bikes available.</p>}
                        </div>
                    </div>

                    {/* Scooty Section */}
                    <div className="category-section" id="scooters-section">
                        <h3 className="category-header">Scooty</h3>
                        <div className="vehicle-grid" id="scootyGrid">
                            {loading ? <p>Loading scooters...</p> : scooters.map(scooter => <VehicleCard key={scooter.id} vehicle={scooter} type="scooty" />)}
                            {!loading && scooters.length === 0 && <p>No scooters available.</p>}
                        </div>
                    </div>


                    {/* Cars Section */}
                    <div className="category-section" id="cars-section">
                        <h3 className="category-header">Cars</h3>
                        <div className="vehicle-grid" id="carsGrid">
                            {loading ? <p>Loading cars...</p> : cars.map(car => <VehicleCard key={car.id} vehicle={car} type="car" />)}
                            {!loading && cars.length === 0 && <p>No cars available.</p>}
                        </div>
                    </div>
                </div>
            </section>


            {/* How It Works Section */}
            <section className="how-it-works">
                <div className="container">
                    <h2 className="text-center">How It Works</h2>
                    <div className="steps-container">
                        <div className="step-card">
                            <div className="step-icon">
                                <i className="fas fa-search"></i>
                            </div>
                            <h3>1. Pick Your Ride</h3>
                            <p>Browse our extensive collection of well-maintained bikes and cars. Filter by price or model to find your best fit.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-icon">
                                <i className="fas fa-calendar-check"></i>
                            </div>
                            <h3>2. Quick Booking</h3>
                            <p>Choose your duration, upload your license, and pay securely. No long paperwork, just instant confirmation.</p>
                        </div>
                        <div className="step-card">
                            <div className="step-icon">
                                <i className="fas fa-road"></i>
                            </div>
                            <h3>3. Zoom Away</h3>
                            <p>Reach the pickup point, verify your ID, and start your journey. Enjoy the freedom of the road!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="why-choose-us">
                <div className="container">
                    <h2 className="text-center">Why Choose Us?</h2>
                    <div className="features-container">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-motorcycle"></i>
                            </div>
                            <h3>Unbeatable Prices</h3>
                            <p>Rent high-quality vehicles at the most competitive daily and hourly rates in the city and save more.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-wallet"></i>
                            </div>
                            <h3>Zero Hidden Charges</h3>
                            <p>Transparency is key. What you see is what you pay—no surprise taxes, insurance fees, or deposits.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">
                                <i className="fas fa-clock"></i>
                            </div>
                            <h3>Flexible Rentals</h3>
                            <p>Need to extend your trip? No problem. Easily extend your booking on the go with our flexible plans.</p>
                        </div>
                    </div>
                </div>
            </section>


        </main >
    );
};

export default Home;
