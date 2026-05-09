import React from 'react';

const About = () => {
    return (
        <main>
            <section className="about-header" style={{
                padding: '8rem 5% 2rem',
                backgroundColor: '#f8f9fa',
                textAlign: 'center'
            }}>
                <h1>About Us</h1>
                <p>Your trusted partner for bike rentals since 2024</p>
            </section>

            <section className="about-content" style={{ padding: '4rem 5%' }}>
                <div className="about-section" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', color: '#2ecc71' }}>Our Story</h2>
                    <p>BikeRental was founded with a simple mission: to make quality bikes accessible to everyone. We believe that cycling is not just a mode of transportation but a way of life that promotes health, sustainability, and community.</p>
                    <p>Starting with just 10 bikes in 2024, we've grown to become the city's most trusted bike rental service, offering a diverse fleet of well-maintained bikes for every need and preference.</p>
                </div>

                <div className="about-section" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', color: '#2ecc71' }}>Our Values</h2>
                    <div className="values-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '2rem',
                        marginTop: '2rem'
                    }}>
                        <div className="value-card" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <i className="fas fa-leaf" style={{ fontSize: '2.5rem', color: '#2ecc71', marginBottom: '1rem' }}></i>
                            <h3>Sustainability</h3>
                            <p>Promoting eco-friendly transportation options</p>
                        </div>
                        <div className="value-card" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <i className="fas fa-heart" style={{ fontSize: '2.5rem', color: '#2ecc71', marginBottom: '1rem' }}></i>
                            <h3>Quality</h3>
                            <p>Maintaining the highest standards in our fleet</p>
                        </div>
                        <div className="value-card" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <i className="fas fa-handshake" style={{ fontSize: '2.5rem', color: '#2ecc71', marginBottom: '1rem' }}></i>
                            <h3>Trust</h3>
                            <p>Building lasting relationships with our customers</p>
                        </div>
                        <div className="value-card" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <i className="fas fa-users" style={{ fontSize: '2.5rem', color: '#2ecc71', marginBottom: '1rem' }}></i>
                            <h3>Community</h3>
                            <p>Creating a cycling community in our city</p>
                        </div>
                    </div>
                </div>

                <div className="about-section" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', color: '#2ecc71' }}>Meet the Team</h2>
                    <div className="team-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '2rem',
                        marginTop: '2rem'
                    }}>
                        <div className="team-member" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <img src="/photo/KD.jpg" alt="Kaushik Das" style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                marginBottom: '1rem',
                                objectFit: 'cover'
                            }} />
                            <h3>Kaushik Das</h3>
                            <p>Founder & CEO</p>
                        </div>
                        <div className="team-member" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <img src="/photo/JRS.jpg" alt="Jyoti Ranjan Sahoo" style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                marginBottom: '1rem',
                                objectFit: 'cover'
                            }} />
                            <h3>Jyoti Ranjan Sahoo</h3>
                            <p>Operation Manager</p>
                        </div>
                        <div className="team-member" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            backgroundColor: '#fff',
                            borderRadius: '10px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}>
                            <img src="/photo/JSP.jpg" alt="Jyoti Swarup Parhi" style={{
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                marginBottom: '1rem',
                                objectFit: 'cover'
                            }} />
                            <h3>Jyoti Swarup Parhi</h3>
                            <p>Head of Maintenance</p>
                        </div>
                    </div>
                </div>

                <div className="about-section" style={{ marginBottom: '4rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', color: '#2ecc71' }}>Why Choose Us?</h2>
                    <ul>
                        <li>Wide selection of high-quality bikes</li>
                        <li>Flexible rental periods</li>
                        <li>Competitive pricing</li>
                        <li>Professional maintenance</li>
                        <li>24/7 customer support</li>
                        <li>Multiple pickup and drop-off locations</li>
                    </ul>
                </div>
            </section>
        </main>
    );
};

export default About;
