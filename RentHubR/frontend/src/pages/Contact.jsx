import React, { useState } from 'react';
import StatusPopup from '../components/StatusPopup';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [popup, setPopup] = useState({ isOpen: false, type: 'success', title: '', message: '' });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Simulate form submission
        setPopup({ isOpen: true, type: 'success', title: 'Message Sent', message: 'Thank you for your message! We will get back to you soon.' });
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    return (
        <main>
            <section className="contact-header" style={{
                padding: '8rem 5% 2rem',
                backgroundColor: '#f8f9fa',
                textAlign: 'center'
            }}>
                <h1>Contact Us</h1>
                <p>We're here to help and answer any questions you might have</p>
            </section>

            <section className="contact-content" style={{
                padding: '4rem 5%',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '4rem'
            }}>
                <div className="contact-info" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="info-card" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
                        backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        <i className="fas fa-map-marker-alt" style={{ fontSize: '1.5rem', color: '#2ecc71' }}></i>
                        <div>
                            <h3>Address</h3>
                            <p>Gohria  ,BBSR</p>
                            <p>Odisha 756001</p>
                        </div>
                    </div>
                    <div className="info-card" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
                        backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        <i className="fas fa-phone" style={{ fontSize: '1.5rem', color: '#2ecc71' }}></i>
                        <div>
                            <h3>Phone</h3>
                            <p>Main: 9040757683</p>
                            <p>Support: 7077733320</p>
                        </div>
                    </div>
                    <div className="info-card" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
                        backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        <i className="fas fa-envelope" style={{ fontSize: '1.5rem', color: '#2ecc71' }}></i>
                        <div>
                            <h3>Email</h3>
                            <p>renthub.otp@gmail.com</p>
                            <p>support@RentHub.com</p>
                        </div>
                    </div>
                    <div className="info-card" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem',
                        backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        <i className="fas fa-clock" style={{ fontSize: '1.5rem', color: '#2ecc71' }}></i>
                        <div>
                            <h3>Hours</h3>
                            <p>Monday - Friday: 8am - 10pm</p>
                            <p>Saturday - Sunday: 9am - 11pm</p>
                        </div>
                    </div>
                </div>

                <div className="contact-form" style={{
                    backgroundColor: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ marginBottom: '1.5rem', color: '#2ecc71' }}>Send us a Message</h2>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text" name="name" placeholder="Your Name"
                            value={formData.name} onChange={handleChange} required
                            style={{ width: '100%', padding: '0.8rem', border: '1px solid #6c757d', borderRadius: '5px' }}
                        />
                        <input
                            type="email" name="email" placeholder="Your Email"
                            value={formData.email} onChange={handleChange} required
                            style={{ width: '100%', padding: '0.8rem', border: '1px solid #6c757d', borderRadius: '5px' }}
                        />
                        <input
                            type="text" name="subject" placeholder="Subject"
                            value={formData.subject} onChange={handleChange} required
                            style={{ width: '100%', padding: '0.8rem', border: '1px solid #6c757d', borderRadius: '5px' }}
                        />
                        <textarea
                            name="message" placeholder="Your Message"
                            value={formData.message} onChange={handleChange} required
                            style={{ width: '100%', padding: '0.8rem', border: '1px solid #6c757d', borderRadius: '5px', minHeight: '150px', resize: 'vertical' }}
                        ></textarea>
                        <button type="submit" className="btn btn-primary">Send Message</button>
                    </form>
                </div>
            </section>

            <section className="map-container" style={{ marginTop: '4rem', padding: '0 5%' }}>
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d380193.3033502755!2d85.32832924375!3d20.296102149999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a190013b5d2c673%3A0x9d4b0f209e5b22b1!2sBhubaneswar%2C%20Odisha!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                    allowFullScreen="" loading="lazy"
                    style={{ width: '100%', height: '400px', border: 'none', borderRadius: '10px' }}>
                </iframe>
            </section>

            <section className="locations" style={{ marginTop: '4rem', padding: '0 5%' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2ecc71' }}>Our Locations</h2>
                <div className="location-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem'
                }}>
                    <div className="location-card" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: '#2ecc71', marginBottom: '1rem' }}>Bhubaneswar Main Branch</h3>
                        <p>Gohrai Square</p>
                        <p>Bhubaneswar, Odisha 751001</p>
                        <p>Phone: 9040757683</p>
                    </div>
                    <div className="location-card" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: '#2ecc71', marginBottom: '1rem' }}>Cuttack Branch</h3>
                        <p>Badambadi Chowk</p>
                        <p>Cuttack, Odisha 753009</p>
                        <p>Phone: 7077733320</p>
                    </div>
                    <div className="location-card" style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: '#2ecc71', marginBottom: '1rem' }}>Puri Branch</h3>
                        <p>Grand Road</p>
                        <p>Puri, Odisha 752001</p>
                        <p>Phone: 9040757683</p>
                    </div>
                </div>
            </section>



            <StatusPopup
                isOpen={popup.isOpen}
                onClose={() => setPopup({ ...popup, isOpen: false })}
                type={popup.type}
                title={popup.title}
                message={popup.message}
            />
        </main>
    );
};

export default Contact;
