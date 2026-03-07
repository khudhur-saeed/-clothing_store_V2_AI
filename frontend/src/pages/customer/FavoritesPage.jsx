import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';
import { apiCall } from '../../api/client';

export default function FavoritesPage() {
    const { toggleFavorite, showToast, favorites } = useApp();
    const { addToCart } = useCart();
    const [favProducts, setFavProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) { setLoading(false); return; }
        try {
            const favs = await apiCall('/favorites/');
            const products = await Promise.all(
                favs.map(async f => {
                    const p = await apiCall(`/products/${f.product_id}`).catch(() => null);
                    if (!p) return null;
                    // Fetch first variant to get an image
                    let image = '';
                    try {
                        const variants = await apiCall(`/products/${f.product_id}/variants`);
                        const imgs = variants?.[0]?.images;
                        image = Array.isArray(imgs) ? (imgs[0] || '') : (imgs || '');
                    } catch { /* no image */ }
                    return { id: p.product_id, name: p.name, category: p.category || '', price: Number(p.price) || 0, image };
                })
            );
            setFavProducts(products.filter(Boolean));
        } catch { setFavProducts([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFavorites(); }, []);

    // Re-fetch when favorites list changes (after toggle)
    useEffect(() => { fetchFavorites(); }, [favorites.length]);

    const handleRemove = async (productId) => {
        await toggleFavorite(productId);
        setFavProducts(prev => prev.filter(p => p.id !== productId));
        showToast('Removed from favorites', 'info');
    };

    if (loading) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="text-muted">Loading favorites…</p>
        </div>
    );

    if (favProducts.length === 0) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>💜</div>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Your wishlist is empty</h2>
            <p className="text-muted">Save your favorite pieces here to find them easily later.</p>
            <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: 28 }}>Discover Products <ArrowRight size={18} /></Link>
        </div>
    );

    return (
        <div className="page">
            <div className="container">
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-8)' }}>
                    <h1 className="text-3xl font-bold">Favorites <Heart size={28} fill="var(--clr-primary)" color="var(--clr-primary)" style={{ display: 'inline', verticalAlign: 'middle' }} /></h1>
                    <span className="text-muted">{favProducts.length} items</span>
                </div>

                <div className="grid-4 grid" style={{ gap: 'var(--sp-6)' }}>
                    {favProducts.map(product => (
                        <div key={product.id} className="product-card animate-fadeIn" id={`fav-product-${product.id}`}>
                            <Link to={`/products/${product.id}`}>
                                <div className="product-card__img" style={{ background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                                    {product.image
                                        ? <img src={product.image} alt={product.name} loading="lazy" />
                                        : <Heart size={40} color="var(--clr-border)" />}
                                </div>
                            </Link>
                            <div className="product-card__body">
                                <div className="text-xs text-faint uppercase" style={{ marginBottom: 4 }}>{product.category}</div>
                                <Link to={`/products/${product.id}`}>
                                    <div className="product-card__name">{product.name}</div>
                                </Link>
                                <div className="product-card__price">${product.price.toFixed(2)}</div>
                                <div className="flex gap-2" style={{ marginTop: 'var(--sp-3)' }}>
                                    <Link to={`/products/${product.id}`} className="btn btn-primary btn-sm flex-1">
                                        <ShoppingBag size={13} /> View Product
                                    </Link>
                                    <button className="btn btn-outline btn-icon btn-sm" onClick={() => handleRemove(product.id)} aria-label="Remove from favorites">
                                        <Trash2 size={13} color="var(--clr-error)" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
