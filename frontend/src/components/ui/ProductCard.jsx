import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, StarIcon, ShoppingBag, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';
import TryOnModal from './TryOnModal';
import { isTryOnEligible } from '../../utils/tryOnCategories';

function StarRating({ rating, count }) {
    return (
        <div className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--clr-text-3)' }}>
            <div className="stars">
                {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={`star${i <= Math.round(rating) ? ' filled' : ''}`}>★</span>
                ))}
            </div>
            <span>({count})</span>
        </div>
    );
}

export default function ProductCard({ product }) {
    const { isFavorite, toggleFavorite, showToast } = useApp();
    const { addToCart } = useCart();
    const [tryOnOpen, setTryOnOpen] = useState(false);

    const fav = isFavorite(product.id);
    const primaryVariant = product.variants[0];
    const tryOnEnabled = isTryOnEligible(product.category, product.piece_type || product.outfit_slot);
    const primaryImage = product.images.find(i => i.is_primary)?.url || product.images[0]?.url;
    const displayPrice = Number(primaryVariant?.price ?? product.price ?? 0).toFixed(2);

    const handleAddToCart = async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!primaryVariant || primaryVariant.stock <= 0) {
            showToast('This variant is out of stock', 'error');
            return;
        }
        try {
            await addToCart(product, primaryVariant, 1);
            showToast(`${product.name} added to cart!`);
        } catch (err) {
            showToast(err.message || 'Not enough stock available', 'error');
        }
    };

    const handleToggleFav = (e) => {
        e.preventDefault(); e.stopPropagation();
        toggleFavorite(product.id);
        showToast(fav ? 'Removed from favorites' : 'Added to favorites', fav ? 'info' : 'success');
    };

    const handleTryOn = (e) => {
        e.preventDefault(); e.stopPropagation();
        setTryOnOpen(true);
    };

    return (
        <>
            <Link to={`/products/${product.id}`} className="product-card animate-fadeIn" id={`product-card-${product.id}`}>
                <div className="product-card__img">
                    <img src={primaryImage} alt={product.name} loading="lazy" />

                    {/* Overlay with action buttons */}
                    <div className="product-card__overlay">
                        <button
                            className="btn btn-primary btn-sm"
                            style={{ backdropFilter: 'blur(8px)' }}
                            onClick={handleAddToCart}
                            id={`add-to-cart-${product.id}`}>
                            <ShoppingBag size={14} /> Add to Cart
                        </button>
                        {tryOnEnabled && (
                            <button
                                className="tryon-card-btn"
                                onClick={handleTryOn}
                                id={`try-on-${product.id}`}
                                title="Virtual Try-On with AI">
                                <Sparkles size={13} /> Try On
                            </button>
                        )}
                    </div>

                    <div className="product-card__badge">
                        <span className="badge badge-primary">{product.piece_type}</span>
                    </div>
                </div>

                {/* Favorite button */}
                <button
                    className={`product-card__fav${fav ? ' active' : ''}`}
                    onClick={handleToggleFav}
                    aria-label="Toggle favorite"
                    id={`fav-btn-${product.id}`}>
                    <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
                </button>

                <div className="product-card__body">
                    <div className="text-xs text-faint uppercase" style={{ marginBottom: 4, letterSpacing: '0.08em' }}>{product.category}</div>
                    <div className="product-card__name">{product.name}</div>
                    <StarRating rating={product.rating} count={product.review_count} />
                    <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                        <span className="product-card__price">${displayPrice}</span>
                        {/* Mini Try-On button — only for eligible categories */}
                        {tryOnEnabled && (
                            <button
                                className="tryon-mini-btn"
                                onClick={handleTryOn}
                                id={`try-on-mini-${product.id}`}
                                title="Try on with AI">
                                <Sparkles size={11} /> Try On
                            </button>
                        )}
                    </div>
                </div>
            </Link>

            {/* Try-On Modal */}
            {tryOnOpen && (
                <TryOnModal
                    product={product}
                    onClose={() => setTryOnOpen(false)}
                />
            )}

            <style>{`
                .product-card__overlay { flex-direction: column; gap: 8px; }
                .tryon-card-btn {
                    display: flex; align-items: center; gap: 5px;
                    background: rgba(192,132,252,0.2); backdrop-filter: blur(8px);
                    border: 1px solid rgba(192,132,252,0.5); color: white;
                    padding: 7px 14px; border-radius: var(--r-full);
                    font-size: 12px; font-weight: 600; cursor: pointer;
                    transition: all var(--tr-fast);
                }
                .tryon-card-btn:hover { background: rgba(192,132,252,0.4); transform: scale(1.04); }
                .tryon-mini-btn {
                    display: flex; align-items: center; gap: 4px;
                    background: transparent; border: 1px solid rgba(192,132,252,0.4);
                    color: var(--clr-primary); padding: 3px 9px; border-radius: var(--r-full);
                    font-size: 10px; font-weight: 700; cursor: pointer;
                    transition: all var(--tr-fast); white-space: nowrap;
                }
                .tryon-mini-btn:hover { background: rgba(192,132,252,0.1); border-color: var(--clr-primary); }
            `}</style>
        </>
    );
}
