import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';
import { mockProducts } from '../../data/mockData';

export default function FavoritesPage() {
    const { favorites, toggleFavorite, showToast } = useApp();
    const { addToCart } = useCart();

    const favProducts = mockProducts.filter(p => favorites.includes(p.id));

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
                    {favProducts.map(product => {
                        const variant = product.variants[0];
                        const img = product.images.find(i => i.is_primary)?.url || product.images[0]?.url;
                        return (
                            <div key={product.id} className="product-card animate-fadeIn" id={`fav-product-${product.id}`}>
                                <Link to={`/products/${product.id}`}>
                                    <div className="product-card__img">
                                        <img src={img} alt={product.name} loading="lazy" />
                                    </div>
                                </Link>
                                <div className="product-card__body">
                                    <div className="text-xs text-faint uppercase" style={{ marginBottom: 4 }}>{product.category}</div>
                                    <Link to={`/products/${product.id}`}>
                                        <div className="product-card__name">{product.name}</div>
                                    </Link>
                                    <div className="product-card__price">${variant?.price.toFixed(2)}</div>
                                    <div className="flex gap-2" style={{ marginTop: 'var(--sp-3)' }}>
                                        <button className="btn btn-primary btn-sm flex-1" id={`fav-add-cart-${product.id}`}
                                            onClick={() => { addToCart(product, variant, 1); showToast(`${product.name} added to cart!`); }}>
                                            <ShoppingBag size={13} /> Add to Cart
                                        </button>
                                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => { toggleFavorite(product.id); showToast('Removed from favorites', 'info'); }} aria-label="Remove from favorites">
                                            <Trash2 size={13} color="var(--clr-error)" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
