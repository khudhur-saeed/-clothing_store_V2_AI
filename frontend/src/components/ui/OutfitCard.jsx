import { Eye, Lock, Trash2, Edit2, Users, Heart, ShoppingBag, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

function getCoverImage(product) {
    if (!product) return '';
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length > 0) {
        const first = product.images[0];
        return typeof first === 'string' ? first : first?.url || '';
    }
    return '';
}

export default function OutfitCard({
    outfit,
    productMap = {},
    onDelete,
    onEdit,
    onToggleVisibility,
    onAddFullOutfitToCart,
    onAddProductToCart,
    showDeleteButton = false,
    showEditButton = false,
    showVisibilityToggle = false,
    showCommunityActions = false,
    isBusy = false,
}) {
    const itemIds = outfit.items || outfit.products || [];
    const items = itemIds.map((id) => ({ id, product: productMap[id] || null }));

    const createdAt = outfit.createdAt || outfit.created_at;
    const formattedDate = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'Unknown date';

    const visibilityPublic = outfit.isPublic || outfit.visibility === 'public';

    return (
        <article className="outfit-card" style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--r-xl)',
            padding: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-4)',
        }}>
            <header>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{outfit.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--clr-text-3)' }}>
                    {outfit.department && (
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{outfit.department}</span>
                    )}
                    <span>•</span>
                    <span>{itemIds.length} items</span>
                    <span>•</span>
                    <span>{formattedDate}</span>
                </div>
                {outfit.description && (
                    <p style={{ marginTop: 8, color: 'var(--clr-text-2)', fontSize: 13, lineHeight: 1.5 }}>
                        {outfit.description}
                    </p>
                )}
            </header>

            <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                {items.length === 0 && (
                    <div style={{
                        padding: 'var(--sp-3)',
                        border: '1px dashed var(--clr-border)',
                        borderRadius: 'var(--r-md)',
                        color: 'var(--clr-text-3)',
                        fontSize: 12,
                    }}>
                        No products in this outfit.
                    </div>
                )}
                {items.map(({ id, product }) => {
                    const image = getCoverImage(product);
                    return (
                        <div key={id} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: 'var(--sp-2)',
                            alignItems: 'center',
                            padding: 'var(--sp-2)',
                            borderRadius: 'var(--r-md)',
                            background: 'var(--clr-surface)',
                            border: '1px solid var(--clr-border)',
                        }}>
                            {product ? (
                                <Link to={`/products/${product.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                        width: 46,
                                        height: 58,
                                        borderRadius: 'var(--r-sm)',
                                        overflow: 'hidden',
                                        background: 'var(--clr-surface-2)',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {image
                                            ? <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <span style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>No image</span>}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {product.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--clr-primary)', fontWeight: 600 }}>
                                            ${Number(product.price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--clr-text-3)' }}>Product #{id} is unavailable</div>
                            )}

                            {showCommunityActions && product && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => onAddProductToCart && onAddProductToCart(product)}
                                    disabled={isBusy || !product.primaryVariant}
                                >
                                    <Plus size={13} /> Add
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--clr-text-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {visibilityPublic ? <Eye size={13} /> : <Lock size={13} />}
                    <span>{visibilityPublic ? 'Public' : 'Private'}</span>
                </div>
                {outfit.creator?.name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={13} />
                        <span>{outfit.creator.name}</span>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Heart size={13} />
                    <span>{outfit.likes || 0} reactions</span>
                </div>
            </div>

            {showCommunityActions && (
                <button
                    className="btn btn-primary"
                    onClick={() => onAddFullOutfitToCart && onAddFullOutfitToCart(outfit)}
                    disabled={isBusy || itemIds.length === 0}
                >
                    <ShoppingBag size={15} /> Add Full Outfit to Cart
                </button>
            )}

            {(showVisibilityToggle || showEditButton || showDeleteButton) && (
                <div style={{
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: 'var(--sp-3)',
                    display: 'flex',
                    gap: 'var(--sp-2)',
                    flexWrap: 'wrap',
                }}>
                    {showEditButton && (
                        <button className="btn btn-ghost btn-sm" onClick={onEdit} disabled={isBusy}>
                            <Edit2 size={13} /> Edit
                        </button>
                    )}
                    {showVisibilityToggle && (
                        <button className="btn btn-ghost btn-sm" onClick={onToggleVisibility} disabled={isBusy}>
                            {visibilityPublic ? <Lock size={13} /> : <Eye size={13} />}
                            {visibilityPublic ? 'Make Private' : 'Make Public'}
                        </button>
                    )}
                    {showDeleteButton && (
                        <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={isBusy}>
                            <Trash2 size={13} /> Delete
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
