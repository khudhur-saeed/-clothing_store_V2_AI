import { Link } from 'react-router-dom';
import { Shirt, Instagram, Twitter, Facebook, Mail } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <Shirt size={20} /> MODA
                        </Link>
                        <p className="text-sm text-muted" style={{ marginTop: '12px', lineHeight: 1.7 }}>
                            Curating fashion that tells your story. Premium pieces, thoughtfully selected.
                        </p>
                        <div className="footer-social">
                            <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
                            <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
                            <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
                            <a href="#" aria-label="Email"><Mail size={18} /></a>
                        </div>
                    </div>

                    <div>
                        <h4 className="footer-heading">Shop</h4>
                        <ul className="footer-links">
                            <li><Link to="/products?category=1">Women</Link></li>
                            <li><Link to="/products?category=2">Men</Link></li>
                            <li><Link to="/products?category=3">Accessories</Link></li>
                            <li><Link to="/outfits?section=create">Outfit Builder</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">Account</h4>
                        <ul className="footer-links">
                            <li><Link to="/profile">My Profile</Link></li>
                            <li><Link to="/orders">My Orders</Link></li>
                            <li><Link to="/favorites">Favorites</Link></li>
                            <li><Link to="/chat">Chatbot Support</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">Help</h4>
                        <ul className="footer-links">
                            <li><a href="#">Shipping & Returns</a></li>
                            <li><a href="#">Size Guide</a></li>
                            <li><a href="#">Contact Us</a></li>
                            <li><a href="#">Privacy Policy</a></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="text-sm text-faint">© 2026 Moda E-Commerce Platform. All rights reserved.</p>
                    <p className="text-sm text-faint">Final Year Project — Fashion Platform</p>
                </div>
            </div>

            <style>{`
        .footer { background: var(--clr-bg-2); border-top: 1px solid var(--clr-border); padding: var(--sp-16) 0 var(--sp-8); }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--sp-10); margin-bottom: var(--sp-12); }
        .footer-logo { display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 900; letter-spacing: 0.15em; color: var(--clr-primary); }
        .footer-social { display: flex; gap: var(--sp-3); margin-top: var(--sp-5); }
        .footer-social a { width: 38px; height: 38px; border-radius: var(--r-md); background: var(--clr-surface); border: 1px solid var(--clr-border); display: flex; align-items: center; justify-content: center; color: var(--clr-text-2); transition: all var(--tr-fast); }
        .footer-social a:hover { background: var(--clr-primary); border-color: var(--clr-primary); color: white; }
        .footer-heading { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--clr-text-3); margin-bottom: var(--sp-4); }
        .footer-links { display: flex; flex-direction: column; gap: var(--sp-3); }
        .footer-links a { font-size: 14px; color: var(--clr-text-2); transition: color var(--tr-fast); }
        .footer-links a:hover { color: var(--clr-primary); }
        .footer-bottom { border-top: 1px solid var(--clr-border); padding-top: var(--sp-6); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--sp-4); }
        @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: var(--sp-8); } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr; } .footer-bottom { flex-direction: column; text-align: center; } }
      `}</style>
        </footer>
    );
}
