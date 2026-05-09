import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer>
            <div className="footer-content">
                <div className="footer-section">
                    <h3>RentHub</h3>
                    <p>Your trusted partner for bike rentals</p>
                </div>
                <div className="footer-section">
                    <h3>Quick Links</h3>
                    <Link to="/">Home</Link>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                </div>
                <div className="footer-section">
                    <h3>Contact Us</h3>
                    <p>Email: info@bikerental.com</p>
                    <p>Phone: 7077733320</p>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2025 RentHub. All rights reserved.</p>
                <p><Link to="/login" className="admin-login-link">Admin Login</Link></p>
            </div>
        </footer>
    );
};

export default Footer;
