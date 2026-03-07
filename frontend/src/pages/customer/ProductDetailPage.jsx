import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Star, ChevronRight, Check, Minus, Plus } from 'lucide-react';
import { useProduct, useReviews, submitReview } from '../../api/products';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/ui/ProductCard';

function StarRating({ rating, interactive, onRate }) {
    const [hover, setHover] = useState(0);
    return (
        <div className="stars" style={{ fontSize: 20 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <span key={i} className={`star${i <= (hover || rating) ? ' filled' : ''}`}
                    style={{ cursor: interactive ? 'pointer' : 'default', fontSize: 20 }}
                    onClick={() => interactive && onRate && onRate(i)}
                    onMouseEnter={() => interactive && setHover(i)}
                    onMouseLeave={() => interactive && setHover(0)}>★</span>
            ))}
        </div>
    );
}

export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { product, loading: productLoading } = useProduct(id);
    const { reviews, refetch: refetchReviews } = useReviews(id);

    const { addToCart } = useCart();
    const { isFavorite, toggleFavorite, showToast } = useApp();
    const { user } = useAuth();

    const [activeImg, setActiveImg] = useState(0);
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState(null);
    const [qty, setQty] = useState(1);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [related, setRelated] = useState([]);

    // Fetch related products whenever the loaded product changes
    // MUST be before any early returns (React rules of hooks)
    useEffect(() => {
        if (!product) return;
        const fetchRelated = async () => {
            try {
                const data = await apiCall('/products/', {}, { category: product.category });
                const others = data.filter(p => p.product_id !== product.product_id).slice(0, 4);
                const withVariants = await Promise.all(
                    others.map(async p => {
                        try {
                            const vs = await apiCall(`/products/${p.product_id}/variants`);
                            const imgs = vs.flatMap(v => (v.images || []));
                            return { ...p, id: p.product_id, images: imgs.length ? imgs.map(u => ({ url: u })) : [], rating: 0, variants: vs };
                        } catch { return { ...p, id: p.product_id, images: [], rating: 0, variants: [] }; }
                    })
                );
                setRelated(withVariants);
            } catch { /* ignore */ }
        };
        fetchRelated();
    }, [product?.id]);

    if (productLoading) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="text-2xl">Loading...</p>
        </div>
    );

    if (!product) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="text-2xl" style={{ marginBottom: 8 }}>😢 Product not found</p>
            <Link to="/products" className="btn btn-primary">Back to Catalog</Link>
        </div>
    );

    const colors = [...new Map(product.variants.map(v => [v.color, v])).values()];
    const sizesForColor = selectedColor
        ? product.variants.filter(v => v.color === selectedColor).map(v => v.size)
        : product.variants.map(v => v.size);

    const activeVariant = product.variants.find(
        v => (selectedColor ? v.color === selectedColor : true) && (selectedSize ? v.size === selectedSize : true)
    ) || product.variants[0];

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : product.rating;

    const handleAddToCart = () => {
        if (!selectedSize && product.variants.length > 1) { showToast('Please select a size', 'error'); return; }
        addToCart(product, activeVariant, qty);
        showToast(`${product.name} added to cart!`);
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!reviewRating) { showToast('Please select a rating', 'error'); return; }
        try {
            await submitReview(id, { rating: reviewRating, comment: reviewText });
            await refetchReviews();
            setReviewText(''); setReviewRating(0);
            showToast('Review submitted! Thank you.');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div className="page">
            <div className="container">
                <div className="breadcrumb">
                    <Link to="/">Home</Link> <ChevronRight size={13} /> <Link to="/products">Products</Link> <ChevronRight size={13} /> <span>{product.name}</span>
                </div>

                {/* Main detail grid */}
                <div className="pd-grid">
                    {/* Images */}
                    <div className="pd-images">
                        <div className="pd-main-img">
                            <img src={product.images[activeImg]?.url} alt={product.name} />
                            <button className={`product-card__fav${isFavorite(product.id) ? ' active' : ''}`}
                                style={{ top: 16, right: 16, width: 42, height: 42 }}
                                onClick={() => { toggleFavorite(product.id); showToast(isFavorite(product.id) ? 'Removed from favorites' : 'Added to favorites'); }}
                                id="detail-fav-btn">
                                <Heart size={18} fill={isFavorite(product.id) ? 'currentColor' : 'none'} />
                            </button>
                        </div>
                        {product.images.length > 1 && (
                            <div className="pd-thumbs">
                                {product.images.map((img, i) => (
                                    <button key={i} className={`pd-thumb${activeImg === i ? ' active' : ''}`} onClick={() => setActiveImg(i)}>
                                        <img src={img.url} alt={`View ${i + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="pd-info">
                        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                            <span className="badge badge-primary">{product.piece_type}</span>
                            <span className="badge badge-muted">{product.category}</span>
                        </div>
                        <h1 className="text-3xl font-bold" style={{ lineHeight: 1.2, marginBottom: 12 }}>{product.name}</h1>

                        <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
                            <StarRating rating={Number(avgRating)} />
                            <span className="text-sm text-muted">{avgRating} ({reviews.length} reviews)</span>
                        </div>

                        <div className="pd-price">
                            <span className="text-3xl font-bold text-primary">${activeVariant?.price.toFixed(2)}</span>
                            {activeVariant?.stock < 5 && activeVariant?.stock > 0 && (
                                <span className="badge badge-warning" style={{ marginLeft: 12 }}>Only {activeVariant.stock} left!</span>
                            )}
                            {activeVariant?.stock === 0 && <span className="badge badge-error" style={{ marginLeft: 12 }}>Out of Stock</span>}
                        </div>

                        <p className="text-muted" style={{ lineHeight: 1.8, marginBottom: 28, fontSize: 15 }}>{product.description}</p>

                        {/* Color */}
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label">Color{selectedColor ? `: ${colors.find(c => c.color === selectedColor)?.color_name}` : ''}</label>
                            <div className="swatches">
                                {colors.map(v => (
                                    <button key={v.color} className={`swatch${selectedColor === v.color ? ' active' : ''}`}
                                        style={{ background: v.color }} title={v.color_name}
                                        onClick={() => { setSelectedColor(c => c === v.color ? null : v.color); setSelectedSize(null); }} />
                                ))}
                            </div>
                        </div>

                        {/* Size */}
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">Size</label>
                            <div className="size-btns">
                                {[...new Set(sizesForColor)].map(s => {
                                    const variant = product.variants.find(v => v.size === s && (selectedColor ? v.color === selectedColor : true));
                                    return (
                                        <button key={s} className={`size-btn${selectedSize === s ? ' active' : ''}${!variant || variant.stock === 0 ? ' out-of-stock' : ''}`}
                                            disabled={!variant || variant.stock === 0}
                                            onClick={() => setSelectedSize(sz => sz === s ? null : s)}>{s}</button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Qty + Cart */}
                        <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
                            <div className="qty-stepper">
                                <button onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={14} /></button>
                                <span>{qty}</span>
                                <button onClick={() => setQty(q => Math.min(activeVariant?.stock || 1, q + 1))}><Plus size={14} /></button>
                            </div>
                            <button id="detail-add-cart" className="btn btn-primary btn-lg flex-1" onClick={handleAddToCart} disabled={activeVariant?.stock === 0}>
                                <ShoppingBag size={18} /> Add to Cart
                            </button>
                        </div>

                        {/* Stock */}
                        <div className="flex items-center gap-2 text-sm text-muted">
                            {activeVariant?.stock > 0 ? <><Check size={15} color="var(--clr-success)" /> In Stock — Ships in 2-4 days</> : 'Currently out of stock'}
                        </div>
                    </div>
                </div>

                {/* Reviews */}
                <div className="divider" style={{ margin: 'var(--sp-16) 0 var(--sp-10)' }} />
                <div className="reviews-section">
                    <h2 className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-8)' }}>Customer Reviews</h2>
                    <div className="reviews-grid">
                        <div>
                            {/* Review summary */}
                            <div className="review-summary card card-body" style={{ marginBottom: 'var(--sp-6)' }}>
                                <div className="text-5xl font-bold text-primary text-center">{avgRating}</div>
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}><StarRating rating={Number(avgRating)} /></div>
                                <div className="text-center text-muted text-sm">{reviews.length} reviews</div>
                            </div>
                            {/* Write review */}
                            {user ? (
                                <form onSubmit={handleSubmitReview} className="card card-body flex-col" style={{ gap: 14 }}>
                                    <div className="font-semibold">Write a Review</div>
                                    <div className="form-group">
                                        <label className="form-label">Rating</label>
                                        <StarRating rating={reviewRating} interactive onRate={setReviewRating} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Comment</label>
                                        <textarea className="form-textarea" placeholder="Share your experience…" value={reviewText} onChange={e => setReviewText(e.target.value)} required />
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" id="submit-review-btn">Submit Review</button>
                                </form>
                            ) : (
                                <div className="card card-body text-center">
                                    <p className="text-muted text-sm">You must be signed in to write a review.</p>
                                    <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Sign In</Link>
                                </div>
                            )}
                        </div>
                        <div className="flex-col" style={{ gap: 'var(--sp-4)' }}>
                            {reviews.length === 0 && <p className="text-muted">No reviews yet. Be the first!</p>}
                            {reviews.map(r => (
                                <div key={r.id} className="card card-body">
                                    <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                                        <div className="flex items-center gap-3">
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white' }}>{r.user_name[0]}</div>
                                            <div><div className="font-semibold text-sm">{r.user_name}</div><div className="text-xs text-faint">{r.review_date}</div></div>
                                        </div>
                                        <StarRating rating={r.rating} />
                                    </div>
                                    <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>{r.comment}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Related */}
                {related.length > 0 && (
                    <div style={{ marginTop: 'var(--sp-16)' }}>
                        <h2 className="text-2xl font-bold" style={{ marginBottom: 'var(--sp-8)' }}>You May Also Like</h2>
                        <div className="grid-4 grid" style={{ gap: 'var(--sp-5)' }}>
                            {related.map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        .pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-16); align-items: start; margin-bottom: var(--sp-12); }
        .pd-images { position: sticky; top: calc(var(--header-h) + 16px); }
        .pd-main-img { border-radius: var(--r-xl); overflow: hidden; position: relative; background: var(--clr-surface); aspect-ratio: 3/4; }
        .pd-main-img img { width: 100%; height: 100%; object-fit: cover; }
        .pd-thumbs { display: flex; gap: var(--sp-3); margin-top: var(--sp-4); }
        .pd-thumb { width: 72px; aspect-ratio: 3/4; border-radius: var(--r-md); overflow: hidden; border: 2px solid transparent; cursor: pointer; transition: border-color var(--tr-fast); }
        .pd-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pd-thumb.active { border-color: var(--clr-primary); }
        .pd-price { margin-bottom: 20px; }
        .reviews-grid { display: grid; grid-template-columns: 280px 1fr; gap: var(--sp-8); }
        @media (max-width: 900px) { .pd-grid { grid-template-columns: 1fr; } .pd-images { position: static; } .reviews-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
