import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Star, ChevronRight, Check, Minus, Plus } from 'lucide-react';
import { useProduct, useReviews, submitReview } from '../../api/products';
import { apiCall } from '../../api/client';
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

function normalizeImages(images) {
    if (!images) return [];
    if (Array.isArray(images)) {
        return images
            .map((img) => (typeof img === 'string' ? img : img?.url))
            .filter(Boolean)
            .map((url) => ({ url }));
    }
    return [];
}

function normalizeColorVariants(variants, fallbackPrice) {
    const grouped = new Map();

    (variants || []).forEach((variant) => {
        const color = variant?.color || '#888888';
        const colorName = variant?.color_name || variant?.color || 'Default';

        if (!grouped.has(color)) {
            grouped.set(color, {
                color,
                color_name: colorName,
                images: normalizeImages(variant?.images),
                sizeOptions: [],
            });
        }

        const group = grouped.get(color);
        const nestedOptions = Array.isArray(variant?.size_options) ? variant.size_options : null;

        if (nestedOptions && nestedOptions.length) {
            nestedOptions.forEach((option, index) => {
                group.sizeOptions.push({
                    key: `${variant?.variant_id || color}-${option?.size || index}`,
                    size: option?.size || 'One Size',
                    stock: Number(option?.stock ?? 0),
                    price: Number(option?.price ?? variant?.price ?? fallbackPrice ?? 0),
                    variant_id: option?.size_option_id || variant?.variant_id || variant?.id,
                });
            });
        } else {
            group.sizeOptions.push({
                key: `${variant?.variant_id || color}-${variant?.size || 'One Size'}`,
                size: variant?.size || 'One Size',
                stock: Number(variant?.stock ?? 0),
                price: Number(variant?.price ?? fallbackPrice ?? 0),
                variant_id: variant?.variant_id || variant?.id,
            });
        }

        if (!group.images.length) {
            group.images = normalizeImages(variant?.images);
        }
    });

    return Array.from(grouped.values()).map((group) => {
        const seen = new Set();
        const deduped = [];
        group.sizeOptions.forEach((option) => {
            const token = String(option.size || '').toLowerCase();
            if (seen.has(token)) return;
            seen.add(token);
            deduped.push(option);
        });
        return { ...group, sizeOptions: deduped };
    });
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

    const colorVariants = useMemo(
        () => normalizeColorVariants(product?.variants || [], product?.price || 0),
        [product?.variants, product?.price]
    );

    useEffect(() => {
        if (!colorVariants.length) return;
        if (!selectedColor || !colorVariants.some((variant) => variant.color === selectedColor)) {
            setSelectedColor(colorVariants[0].color);
            setSelectedSize(null);
        }
    }, [colorVariants, selectedColor]);

    useEffect(() => {
        if (!selectedColor) return;
        const group = colorVariants.find((variant) => variant.color === selectedColor);
        if (!group) return;
        if (selectedSize && !group.sizeOptions.some((option) => option.size === selectedSize)) {
            setSelectedSize(null);
        }
    }, [selectedColor, selectedSize, colorVariants]);

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

    const colors = colorVariants;
    const selectedColorGroup = colors.find((variant) => variant.color === selectedColor) || colors[0] || null;
    const sizesForColor = selectedColorGroup?.sizeOptions || [];

    const activeSizeOption =
        sizesForColor.find((option) => option.size === selectedSize) ||
        null;

    const activeVariant = activeSizeOption
        ? {
            color: selectedColorGroup?.color,
            color_name: selectedColorGroup?.color_name,
            size: activeSizeOption.size,
            stock: activeSizeOption.stock,
            price: activeSizeOption.price,
            variant_id: activeSizeOption.variant_id,
            images: selectedColorGroup?.images || [],
        }
        : null;

    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : (product.rating || 0);

    const handleAddToCart = async () => {
        if (!selectedSize) { showToast('Please select a size', 'error'); return; }
        if (!activeVariant || activeVariant.stock <= 0) { showToast('This variant is out of stock', 'error'); return; }
        try {
            await addToCart(product, activeVariant, qty);
            showToast(`${product.name} added to cart!`);
            setQty(1);
        } catch (err) {
            showToast(err.message || 'Not enough stock available', 'error');
        }
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
                            <span className="text-3xl font-bold text-primary">${Number(activeVariant?.price ?? product.price ?? 0).toFixed(2)}</span>
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
                            {!selectedSize && sizesForColor.length > 0 && (
                                <p className="text-xs" style={{ marginBottom: 8, color: 'var(--clr-error)' }}>
                                    Please choose a size before adding to cart.
                                </p>
                            )}
                            <div className="pd-size-grid flex gap-3 flex-wrap">
                                {sizesForColor.length === 0 && (
                                    <span className="text-sm text-muted">No sizes available for this color.</span>
                                )}

                                {sizesForColor.map((option) => {
                                    const isOutOfStock = option?.stock == null || Number(option.stock) <= 0;
                                    const isSelected = selectedSize === option.size;

                                    return (
                                        <button
                                            key={option.key}
                                            type="button"
                                            disabled={isOutOfStock}
                                            onClick={() => setSelectedSize(option.size)}
                                            className={`pd-size-chip${isSelected ? ' is-selected' : ''}${isOutOfStock ? ' is-disabled' : ''}`}
                                            style={isOutOfStock ? {
                                                backgroundImage: 'linear-gradient(to top right, transparent calc(50% - 1px), #9ca3af calc(50%), transparent calc(50% + 1px))',
                                            } : undefined}
                                            aria-label={`Size ${option.size}${isOutOfStock ? ' unavailable' : ''}`}
                                        >
                                            <span>{option.size}</span>
                                        </button>
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
                            {!selectedSize
                                ? 'Please select a size to check stock'
                                : activeVariant?.stock > 0
                                    ? <><Check size={15} color="var(--clr-success)" /> In Stock — Ships in 2-4 days</>
                                    : 'Currently out of stock'}
                        </div>
                    </div>
                </div>

                {/* Reviews */}
                <section className="pd-lower">
                    <div className="pd-lower-head">
                        <h2 className="text-2xl font-bold">Customer Reviews</h2>
                        <span className="text-sm text-muted">{reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
                    </div>

                    <div className="pd-lower-grid">
                        <div className="pd-panel-col">
                            <div className="pd-clean-card pd-score-card">
                                <div className="pd-score-value">{avgRating}</div>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
                                    <StarRating rating={Number(avgRating)} />
                                </div>
                                <div className="text-sm" style={{ color: '#6B7280' }}>Based on {reviews.length} customer review{reviews.length === 1 ? '' : 's'}</div>
                            </div>

                            {user ? (
                                <form onSubmit={handleSubmitReview} className="pd-clean-card pd-review-form">
                                    <div className="pd-card-title">Write a Review</div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Rating</label>
                                        <StarRating rating={reviewRating} interactive onRate={setReviewRating} />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Comment</label>
                                        <textarea className="form-textarea" placeholder="Share your experience..." value={reviewText} onChange={e => setReviewText(e.target.value)} required />
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" id="submit-review-btn">Submit Review</button>
                                </form>
                            ) : (
                                <div className="pd-clean-card pd-signin-card text-center">
                                    <div className="pd-card-title">Want to leave a review?</div>
                                    <p className="text-sm" style={{ color: '#6B7280' }}>You must be signed in to write a review.</p>
                                    <Link to="/login" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Sign In</Link>
                                </div>
                            )}
                        </div>

                        <div className="pd-reviews-list">
                            {reviews.length === 0 && (
                                <div className="pd-clean-card">
                                    <p className="text-sm" style={{ color: '#6B7280' }}>No reviews yet. Be the first to share your opinion.</p>
                                </div>
                            )}

                            {reviews.map(r => (
                                <div key={r.id} className="pd-clean-card pd-review-item">
                                    <div className="pd-review-top">
                                        <div className="flex items-center gap-3">
                                            <div className="pd-avatar">{r.user_name?.[0] || 'U'}</div>
                                            <div>
                                                <div className="font-semibold text-sm" style={{ color: '#111827' }}>{r.user_name}</div>
                                                <div className="text-xs" style={{ color: '#9CA3AF' }}>{r.review_date}</div>
                                            </div>
                                        </div>
                                        <StarRating rating={r.rating} />
                                    </div>
                                    <p className="pd-review-text">{r.comment}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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
                .pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-16); align-items: start; margin-bottom: var(--sp-16); }
        .pd-images { position: sticky; top: calc(var(--header-h) + 16px); }
        .pd-main-img { border-radius: var(--r-xl); overflow: hidden; position: relative; background: var(--clr-surface); aspect-ratio: 3/4; }
        .pd-main-img img { width: 100%; height: 100%; object-fit: cover; }
        .pd-thumbs { display: flex; gap: var(--sp-3); margin-top: var(--sp-4); }
        .pd-thumb { width: 72px; aspect-ratio: 3/4; border-radius: var(--r-md); overflow: hidden; border: 2px solid transparent; cursor: pointer; transition: border-color var(--tr-fast); }
        .pd-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pd-thumb.active { border-color: var(--clr-primary); }
        .pd-price { margin-bottom: 20px; }

                .pd-lower { margin-top: var(--sp-10); padding-top: var(--sp-8); border-top: 1px solid var(--clr-border); }
                .pd-lower-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: var(--sp-6); }
                .pd-lower-grid { display: grid; grid-template-columns: 320px 1fr; gap: var(--sp-8); align-items: start; }
                .pd-panel-col { display: grid; gap: var(--sp-4); }

                .pd-clean-card {
                    background: #FFFFFF;
                    border: 1px solid #E5E7EB;
                    border-radius: 16px;
                    padding: 18px;
                    box-shadow: 0 8px 24px rgba(17, 24, 39, 0.06);
                }

                .pd-score-card { text-align: center; }
                .pd-score-value { font-size: 2.5rem; line-height: 1; font-weight: 800; color: #6D28D9; margin-bottom: 10px; }
                .pd-card-title { font-weight: 700; color: #111827; margin-bottom: 8px; }
                .pd-review-form { display: grid; gap: 14px; }
                .pd-signin-card { display: grid; gap: 8px; }

                .pd-reviews-list { display: grid; gap: var(--sp-4); }
                .pd-review-item { padding: 16px 18px; }
                .pd-review-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
                .pd-avatar {
                    width: 38px;
                    height: 38px;
                    border-radius: 9999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 13px;
                    background: linear-gradient(135deg, #8B5CF6, #C084FC);
                    color: #FFFFFF;
                    flex-shrink: 0;
                }
                .pd-review-text { font-size: 0.92rem; line-height: 1.75; color: #4B5563; }

                .pd-size-grid { margin-top: 8px; }
                .pd-size-chip {
                    min-width: 68px;
                    height: 44px;
                    padding: 0 14px;
                    border-radius: 12px;
                    border: 1px solid var(--clr-border-2);
                    background-color: var(--glass-bg-heavy);
                    color: var(--clr-text);
                    font-size: 0.9rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--tr-fast);
                    position: relative;
                    overflow: hidden;
                }

                .pd-size-chip:hover {
                    border-color: var(--clr-primary);
                    box-shadow: var(--shadow-glow-sm);
                    transform: translateY(-1px);
                }

                .pd-size-chip.is-selected {
                    background: var(--grad-primary);
                    border-color: var(--clr-primary);
                    color: var(--clr-text-inv);
                    box-shadow: var(--shadow-glow-sm);
                }

                .pd-size-chip.is-disabled {
                    cursor: not-allowed;
                    opacity: 0.55;
                    color: var(--clr-text-3);
                    border-color: var(--clr-border);
                    background-color: var(--clr-surface-2);
                    box-shadow: none;
                    transform: none;
                }

                @media (max-width: 900px) {
                    .pd-grid { grid-template-columns: 1fr; }
                    .pd-images { position: static; }
                    .pd-lower-grid { grid-template-columns: 1fr; }
                }
      `}</style>
        </div>
    );
}
