import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    ShoppingBag, Heart, User, Search, Menu, X, ChevronDown, LogOut, Settings, Package, MessageCircle, Shirt, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { apiCall } from '../../api/client';

export default function Header() {
    const { user, logout, isAdmin } = useAuth();
    const { cartCount } = useCart();
    const { favorites } = useApp();
    const { theme, toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [outfitMenuOpen, setOutfitMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [scrolled, setScrolled] = useState(false);
    const searchRef = useRef(null);
    const outfitMenuRef = useRef(null);

    // No static category nav — search navigates to catalog page

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => { setMenuOpen(false); setUserMenuOpen(false); setOutfitMenuOpen(false); }, [location]);

    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const data = await apiCall('/products/', {}, { search: searchQuery });
                const topResults = data.slice(0, 5);
                const withImages = await Promise.all(topResults.map(async (p) => {
                    let image = '';
                    try {
                        const variants = await apiCall(`/products/${p.product_id}/variants`);
                        for (const variant of variants || []) {
                            const imgs = variant?.images;
                            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]) {
                                image = imgs[0];
                                break;
                            }
                            if (typeof imgs === 'string' && imgs.trim()) {
                                image = imgs.split(',').map((s) => s.trim()).find(Boolean) || '';
                                if (image) break;
                            }
                        }
                    } catch {
                        image = '';
                    }

                    return {
                        id: p.product_id,
                        name: p.name,
                        category: p.category || '',
                        price: Number(p.price) || 0,
                        image,
                    };
                }));

                if (!cancelled) {
                    setSearchResults(withImages);
                }
            } catch {
                if (!cancelled) setSearchResults([]);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [searchQuery]);

    useEffect(() => {
        const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        const handler = (e) => {
            if (outfitMenuRef.current && !outfitMenuRef.current.contains(e.target)) {
                setOutfitMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <header className={`header${scrolled ? ' scrolled' : ''}`}>
            <div className="container header-inner">
                {/* Logo */}
                <Link to="/" className="header-logo">
                    <Shirt size={22} />
                    <span>MODA</span>
                </Link>

                {/* Nav — just link to products and outfits */}
                <nav className="header-nav desktop-only">
                    <Link to="/products" className="nav-link">All Products</Link>
                    <div className="outfit-nav-wrap" ref={outfitMenuRef}>
                        <button className="nav-link outfit-nav-btn" onClick={() => setOutfitMenuOpen(v => !v)}>
                            Outfits <ChevronDown size={14} className={outfitMenuOpen ? 'rotated' : ''} />
                        </button>
                        {outfitMenuOpen && (
                            <div className="outfit-nav-dropdown animate-slideUp">
                                <Link to="/outfits?section=my" className="dropdown-item">My Outfits</Link>
                                <Link to="/outfits?section=community" className="dropdown-item">Community Outfits</Link>
                                <Link to="/outfits/builder" className="dropdown-item">Create / Edit Outfit</Link>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Actions */}
                <div className="header-actions">
                    {/* Search */}
                    <div className="search-wrap" ref={searchRef}>
                        <button className="icon-btn" onClick={() => { setSearchOpen(v => !v); }} aria-label="Search">
                            <Search size={20} />
                        </button>
                        {searchOpen && (
                            <div className="search-dropdown animate-slideUp">
                                <input
                                    autoFocus className="form-input" placeholder="Search products…"
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && searchQuery) { navigate(`/products?q=${searchQuery}`); setSearchOpen(false); } }}
                                />
                                {searchResults.length > 0 && (
                                    <ul className="search-results">
                                        {searchResults.map(p => (
                                            <li key={p.id}>
                                                <Link to={`/products/${p.id}`} className="search-result-item" onClick={() => setSearchOpen(false)}>
                                                    {p.image
                                                        ? <img src={p.image} alt={p.name} />
                                                        : <div style={{ width: 40, height: 48, borderRadius: 'var(--r-sm)', background: 'var(--clr-surface-2)', flexShrink: 0 }} />}
                                                    <div>
                                                        <div className="font-medium text-sm">{p.name}</div>
                                                        <div className="text-xs text-faint">{p.category}</div>
                                                    </div>
                                                    <div className="text-sm text-primary font-semibold">${p.price.toFixed(2)}</div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Favorites */}
                    <Link to="/favorites" className="icon-btn" aria-label="Favorites">
                        <Heart size={20} />
                        {favorites.length > 0 && <span className="icon-badge">{favorites.length}</span>}
                    </Link>

                    {/* Cart */}
                    <Link to="/cart" className="icon-btn" aria-label="Cart">
                        <ShoppingBag size={20} />
                        {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
                    </Link>

                    {/* Chat */}
                    <Link to="/chat" className="icon-btn desktop-only" aria-label="Chatbot">
                        <MessageCircle size={20} />
                    </Link>

                    {/* Theme Toggle */}
                    <button
                        className="icon-btn theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        id="theme-toggle-btn"
                        title={isDark ? 'Light mode' : 'Dark mode'}
                    >
                        {isDark
                            ? <Sun size={19} className="theme-icon sun" />
                            : <Moon size={19} className="theme-icon moon" />
                        }
                    </button>

                    {/* User */}
                    {user ? (
                        <div className="user-menu-wrap">
                            <button className="user-btn" onClick={() => setUserMenuOpen(v => !v)} id="user-menu-btn">
                                <div className="user-avatar">{user.first_name[0]}{user.last_name[0]}</div>
                                <ChevronDown size={14} className={userMenuOpen ? 'rotated' : ''} />
                            </button>
                            {userMenuOpen && (
                                <div className="user-dropdown animate-slideUp">
                                    <div className="user-dropdown-header">
                                        <div className="font-semibold">{user.first_name} {user.last_name}</div>
                                        <div className="text-xs text-faint">{user.email}</div>
                                    </div>
                                    <div className="user-dropdown-body">
                                        {isAdmin && <Link to="/admin" className="dropdown-item"><Settings size={15} /> Admin Panel</Link>}
                                        <Link to="/profile" className="dropdown-item"><User size={15} /> My Profile</Link>
                                        <Link to="/orders" className="dropdown-item"><Package size={15} /> My Orders</Link>
                                        <Link to="/chat" className="dropdown-item"><MessageCircle size={15} /> Chatbot</Link>
                                        <button className="dropdown-item text-error" onClick={() => { logout(); navigate('/'); }}>
                                            <LogOut size={15} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
                    )}

                    {/* Mobile hamburger */}
                    <button className="icon-btn mobile-only" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            {menuOpen && (
                <div className="mobile-nav animate-slideUp">
                    <Link to="/products" className="mobile-nav-link">All Products</Link>
                    <Link to="/outfits?section=my" className="mobile-nav-link">My Outfits</Link>
                    <Link to="/outfits?section=community" className="mobile-nav-link">Community Outfits</Link>
                    <Link to="/outfits/builder" className="mobile-nav-link">Create / Edit Outfit</Link>
                    <Link to="/chat" className="mobile-nav-link">Chatbot</Link>
                    {user && <Link to="/profile" className="mobile-nav-link">My Profile</Link>}
                    {user && <Link to="/orders" className="mobile-nav-link">My Orders</Link>}
                </div>
            )}

            <style>{`
        .header {
          position: sticky; top: 0; z-index: 100; height: var(--header-h);
          background: var(--header-bg); backdrop-filter: blur(24px) saturate(1.4);
          border-bottom: 1px solid transparent; transition: all var(--tr-med);
        }
        .header.scrolled { border-bottom-color: var(--clr-border); box-shadow: var(--shadow-md); }
        .header-inner { display: flex; align-items: center; justify-content: space-between; height: 100%; gap: var(--sp-5); }
        .header-logo { display: flex; align-items: center; gap: 9px; font-size: 21px; font-weight: 900; letter-spacing: 0.16em; color: var(--clr-primary); flex-shrink: 0; transition: opacity var(--tr-fast); }
        .header-logo:hover { opacity: 0.85; }
        .header-nav { display: flex; align-items: center; gap: var(--sp-5); flex: 1; justify-content: center; }
        .nav-link { font-size: 12px; font-weight: 600; color: var(--clr-text-2); transition: color var(--tr-fast); letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 2px; border-bottom: 2px solid transparent; }
        .nav-link:hover { color: var(--clr-primary); border-bottom-color: var(--clr-primary); }
                .outfit-nav-wrap { position: relative; }
                .outfit-nav-btn { display: flex; align-items: center; gap: 4px; background: transparent; border: none; cursor: pointer; }
                .outfit-nav-dropdown {
                    position: absolute;
                    top: calc(100% + 10px);
                    left: 0;
                    min-width: 190px;
                    background: var(--clr-surface);
                    border: 1px solid var(--clr-border-2);
                    border-radius: var(--r-lg);
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                    z-index: 210;
                }
        .header-actions { display: flex; align-items: center; gap: var(--sp-2); flex-shrink: 0; }
        .icon-btn { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: var(--r-md); color: var(--clr-text-2); transition: all var(--tr-fast); }
        .icon-btn:hover { background: var(--clr-surface-2); color: var(--clr-text); }
        .icon-badge { position: absolute; top: 2px; right: 2px; min-width: 18px; height: 18px; background: var(--clr-primary); color: white; border-radius: 9px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
        .theme-toggle-btn { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .theme-toggle-btn:hover { background: var(--clr-surface-2); transform: rotate(20deg) scale(1.1); }
        .theme-icon { transition: all 0.4s ease; }
        .sun  { color: #f59e0b; }
        .moon { color: var(--clr-primary); }
        .search-wrap { position: relative; }
        .search-dropdown { position: absolute; top: calc(100% + 8px); right: -100px; width: 340px; background: var(--clr-surface); border: 1px solid var(--clr-border-2); border-radius: var(--r-lg); padding: var(--sp-3); box-shadow: var(--shadow-lg); z-index: 200; }
        .search-results { margin-top: var(--sp-2); }
        .search-result-item { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3); border-radius: var(--r-sm); transition: background var(--tr-fast); }
        .search-result-item:hover { background: var(--clr-surface-2); }
        .search-result-item img { width: 40px; height: 48px; object-fit: cover; border-radius: var(--r-sm); flex-shrink: 0; }
        .search-result-item > div:nth-child(2) { flex: 1; }
        .user-menu-wrap { position: relative; }
        .user-btn { display: flex; align-items: center; gap: 6px; background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-full); padding: 4px 10px 4px 4px; cursor: pointer; transition: all var(--tr-fast); }
        .user-btn:hover { border-color: var(--clr-primary); box-shadow: 0 0 0 2px rgba(168,85,247,0.15); }
        .user-btn .rotated { transform: rotate(180deg); transition: transform var(--tr-fast); }
        .rotated { transform: rotate(180deg); transition: transform var(--tr-fast); }
        .user-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent)); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; }
        .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: var(--clr-surface); border: 1px solid var(--clr-border-2); border-radius: var(--r-lg); box-shadow: var(--shadow-lg); overflow: hidden; z-index: 200; }
        .user-dropdown-header { padding: var(--sp-4) var(--sp-4) var(--sp-3); border-bottom: 1px solid var(--clr-border); }
        .user-dropdown-body { padding: var(--sp-2) 0; }
        .dropdown-item { display: flex; align-items: center; gap: var(--sp-3); padding: 10px var(--sp-4); font-size: 14px; color: var(--clr-text-2); cursor: pointer; transition: all var(--tr-fast); width: 100%; text-align: left; border-radius: 0; }
        .dropdown-item:hover { background: var(--clr-surface-2); color: var(--clr-primary); padding-left: 20px; }
        .mobile-nav { position: absolute; top: var(--header-h); left: 0; right: 0; background: var(--clr-surface); border-bottom: 1px solid var(--clr-border); padding: var(--sp-3); display: flex; flex-direction: column; gap: 0; box-shadow: var(--shadow-lg); }
        .mobile-nav-link { display: block; padding: 13px var(--sp-4); font-size: 15px; font-weight: 500; border-bottom: 1px solid var(--clr-border); color: var(--clr-text-2); transition: color var(--tr-fast), padding-left var(--tr-fast); }
        .mobile-nav-link:last-child { border-bottom: none; }
        .mobile-nav-link:hover { color: var(--clr-primary); padding-left: 24px; }
        .desktop-only { display: flex; }
        .mobile-only { display: none; }
        @media (max-width: 768px) { .desktop-only { display: none; } .mobile-only { display: flex; } }
      `}</style>
        </header>
    );
}
