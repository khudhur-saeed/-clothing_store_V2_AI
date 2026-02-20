import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingBag, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';

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
    const fav = isFavorite(product.id);
    const primaryVariant = product.variants[0];
    const primaryImage = product.images.find(i => i.is_primary)?.url || product.images[0]?.url;

    const handleAddToCart = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (primaryVariant && primaryVariant.stock > 0) {
            addToCart(product, primaryVariant, 1);
            showToast(`${product.name} added to cart!`);
        }
    };

    const handleToggleFav = (e) => {
        e.preventDefault(); e.stopPropagation();
        toggleFavorite(product.id);
        showToast(fav ? 'Removed from favorites' : 'Added to favorites', fav ? 'info' : 'success');
    };

    return (
        <Link to={`/products/${product.id}`} className="product-card animate-fadeIn" id={`product-card-${product.id}`}>
            <div className="product-card__img">
                <img src={primaryImage} alt={product.name} loading="lazy" />
                <div className="product-card__overlay">
                    <button className="btn btn-primary btn-sm" style={{ backdropFilter: 'blur(8px)' }} onClick={handleAddToCart} id={`add-to-cart-${product.id}`}>
                        <ShoppingBag size={14} /> Add to Cart
                    </button>
                </div>
                <div className="product-card__badge">
                    <span className="badge badge-primary">{product.piece_type}</span>
                </div>
            </div>
            <button className={`product-card__fav${fav ? ' active' : ''}`} onClick={handleToggleFav} aria-label="Toggle favorite" id={`fav-btn-${product.id}`}>
                <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
            </button>
            <div className="product-card__body">
                <div className="text-xs text-faint uppercase" style={{ marginBottom: 4, letterSpacing: '0.08em' }}>{product.category}</div>
                <div className="product-card__name">{product.name}</div>
                <StarRating rating={product.rating} count={product.review_count} />
                <div className="flex items-center" style={{ marginTop: 8 }}>
                    <span className="product-card__price">${primaryVariant?.price.toFixed(2)}</span>
                </div>
            </div>
        </Link>
    );
}
