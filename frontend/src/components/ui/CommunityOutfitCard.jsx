import { useMemo, useState } from 'react';
import { Edit2, Eye, Globe, Heart, Lock, ShoppingBag, Trash2, UserRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';

function getProductImage(product) {
    if (!product) return '';
    if (product.image) return product.image;
    if (Array.isArray(product.images) && product.images.length > 0) {
        const first = product.images[0];
        return typeof first === 'string' ? first : first?.url || '';
    }
    return '';
}

export default function CommunityOutfitCard({
    outfit,
    productMap = {},
    onAddFullOutfitToCart,
    onAddProductToCart,
    onEdit,
    onDelete,
    onToggleVisibility,
    mode = 'community',
    isBusy = false,
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const isMyOutfit = mode === 'my';
    const visibilityPublic = outfit.isPublic || outfit.visibility === 'public';

    const itemIds = outfit.items || outfit.products || [];
    const previewItems = itemIds.slice(0, 4).map((id) => ({ id, product: productMap[id] || null }));

    const detailedItems = useMemo(
        () => itemIds.map((id) => ({ id, product: productMap[id] || null })),
        [itemIds, productMap],
    );

    const createdAt = outfit.createdAt || outfit.created_at;
    const formattedDate = createdAt
        ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    return (
        <>
            <article style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--r-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 420,
            }}>
                {/* ── Card Image Area ── */}
                <div style={{
                    position: 'relative',
                    aspectRatio: outfit.generated_image_url ? '3 / 4' : '4 / 3',
                    background: outfit.generated_image_url
                        ? 'linear-gradient(145deg, #f8f8fa, #ececf1)'
                        : 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
                    overflow: 'hidden',
                    cursor: outfit.generated_image_url ? 'zoom-in' : 'default',
                }}
                    onClick={() => outfit.generated_image_url && setLightboxOpen(true)}
                >
                    {outfit.generated_image_url ? (
                        /* AI-generated mannequin image — full portrait, nothing cropped */
                        <img
                            src={outfit.generated_image_url}
                            alt={`AI outfit preview for ${outfit.name}`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                    ) : (
                        /* Fallback: 2×2 product grid */
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gridTemplateRows: '1fr 1fr',
                            gap: 'var(--sp-2)',
                            padding: 'var(--sp-3)',
                            height: '100%',
                            boxSizing: 'border-box',
                        }}>
                            {[0, 1, 2, 3].map((idx) => {
                                const data = previewItems[idx];
                                const image = getProductImage(data?.product);
                                return (
                                    <div key={idx} style={{
                                        borderRadius: 'var(--r-md)',
                                        overflow: 'hidden',
                                        background: 'var(--clr-surface-2)',
                                        position: 'relative',
                                        border: '1px solid var(--glass-border)',
                                    }}>
                                        {image ? (
                                            <img
                                                src={image}
                                                alt={data?.product?.name || `Outfit item ${idx + 1}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--clr-text-3)', fontSize: 11, fontWeight: 600,
                                            }}>
                                                {data ? 'No Image' : 'Empty'}
                                            </div>
                                        )}
                                        {idx === 3 && itemIds.length > 4 && (
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                background: 'rgba(0,0,0,0.42)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '0.04em',
                                            }}>
                                                +{itemIds.length - 4}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Public / Private badge — top left */}
                    <div style={{
                        position: 'absolute', top: 'var(--sp-3)', left: 'var(--sp-3)',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 11, fontWeight: 700, color: '#fff',
                        padding: '6px 10px', borderRadius: 'var(--r-full)',
                        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
                    }}>
                        {visibilityPublic ? <Globe size={12} /> : <Lock size={12} />}
                        {visibilityPublic ? 'Public' : 'Private'}
                    </div>

                    {/* AI Preview badge + expand hint — top right */}
                    {outfit.generated_image_url && (
                        <div style={{
                            position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 10, fontWeight: 700, color: '#fff',
                            padding: '5px 9px', borderRadius: 'var(--r-full)',
                            background: 'linear-gradient(135deg, rgba(124,58,237,0.85), rgba(192,38,211,0.85))',
                            backdropFilter: 'blur(8px)',
                        }}>
                            ✨ AI Preview
                        </div>
                    )}
                </div>


                <div style={{
                    padding: 'var(--sp-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--sp-3)',
                    flex: 1,
                }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>
                            {outfit.name}
                        </h3>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            alignItems: 'center',
                            fontSize: 12,
                            color: 'var(--clr-text-2)',
                        }}>
                            <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {outfit.department || 'Unspecified'}
                            </span>
                            <span>•</span>
                            <span>{itemIds.length} products</span>
                            {formattedDate && (<><span>•</span><span>{formattedDate}</span></>)}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: 'var(--clr-text-3)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <UserRound size={13} />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isMyOutfit ? 'You' : (outfit.creator?.name || 'Community member')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                            <Heart size={13} />
                            <span>{outfit.likes || 0}</span>
                        </div>
                    </div>

                    {isMyOutfit && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            width: 'fit-content',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 'var(--r-full)',
                            padding: '5px 10px',
                            background: visibilityPublic ? 'rgba(52,211,153,0.16)' : 'rgba(148,163,184,0.2)',
                            color: visibilityPublic ? 'var(--clr-success)' : 'var(--clr-text-2)',
                        }}>
                            {visibilityPublic ? <Eye size={12} /> : <Lock size={12} />}
                            {visibilityPublic ? 'Public' : 'Private'}
                        </div>
                    )}

                    <div style={{
                        marginTop: 'auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--sp-2)',
                    }}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onAddFullOutfitToCart && onAddFullOutfitToCart(outfit)}
                            disabled={isBusy || itemIds.length === 0}
                        >
                            <ShoppingBag size={14} /> Choose Sizes
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDetailsOpen(true)}
                        >
                            <Eye size={14} /> View Outfit Details
                        </button>
                    </div>

                    {isMyOutfit && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: 'var(--sp-2)',
                        }}>
                            <button className="btn btn-ghost btn-sm" onClick={onEdit} disabled={isBusy}>
                                <Edit2 size={13} /> Edit
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={onToggleVisibility} disabled={isBusy}>
                                {visibilityPublic ? <Lock size={13} /> : <Eye size={13} />}
                                {visibilityPublic ? 'Private' : 'Public'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={isBusy}>
                                <Trash2 size={13} /> Delete
                            </button>
                        </div>
                    )}
                </div>
            </article>

            {detailsOpen && (
                <div
                    onClick={() => setDetailsOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(4,4,10,0.68)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 400,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--sp-4)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: 'min(1040px, 100%)',
                            maxHeight: '92vh',
                            overflow: 'auto',
                            borderRadius: 'var(--r-xl)',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--clr-surface)',
                            boxShadow: 'var(--shadow-xl)',
                            padding: 'var(--sp-5)',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 'var(--sp-4)',
                            alignItems: 'flex-start',
                            marginBottom: 'var(--sp-4)',
                        }}>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{outfit.name}</h2>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 10,
                                    alignItems: 'center',
                                    fontSize: 13,
                                    color: 'var(--clr-text-2)',
                                }}>
                                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{outfit.department || 'Unspecified'}</span>
                                    <span>•</span>
                                    <span>{itemIds.length} products</span>
                                    <span>•</span>
                                    <span>{isMyOutfit ? 'You' : (outfit.creator?.name || 'Community member')}</span>
                                    <span>•</span>
                                    <span>{outfit.likes || 0} reactions</span>
                                    <span>•</span>
                                    <span>{visibilityPublic ? 'Public' : 'Private'}</span>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setDetailsOpen(false)}>
                                <X size={15} /> Close
                            </button>
                        </div>

                        <div className="community-details-grid">
                            {detailedItems.map(({ id, product }) => {
                                const image = getProductImage(product);
                                const available = !!product?.primaryVariant;

                                return (
                                    <div key={id} className="community-detail-item">
                                        {product ? (
                                            <Link to={`/products/${product.id}`} onClick={() => setDetailsOpen(false)}>
                                                <div className="community-detail-thumb">
                                                    {image
                                                        ? <img src={image} alt={product.name} />
                                                        : <div className="community-thumb-empty">No Image</div>}
                                                </div>
                                                <div style={{ marginTop: 10 }}>
                                                    <div className="community-detail-name">{product.name}</div>
                                                    <div className="community-detail-price">${Number(product.price || 0).toFixed(2)}</div>
                                                </div>
                                            </Link>
                                        ) : (
                                            <div style={{ padding: 'var(--sp-4)', color: 'var(--clr-text-3)', fontSize: 12 }}>
                                                Product #{id} is unavailable.
                                            </div>
                                        )}

                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => product && onAddProductToCart && onAddProductToCart(product)}
                                            disabled={!available}
                                            style={{ width: '100%', marginTop: 10 }}
                                        >
                                            <ShoppingBag size={14} /> Choose Size
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{
                            marginTop: 'var(--sp-5)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 'var(--sp-3)',
                            borderTop: '1px solid var(--glass-border)',
                            paddingTop: 'var(--sp-4)',
                        }}>
                            <button className="btn btn-primary" onClick={() => onAddFullOutfitToCart && onAddFullOutfitToCart(outfit)}>
                                <ShoppingBag size={15} /> Choose Sizes & Add
                            </button>
                            <button className="btn btn-ghost" onClick={() => setDetailsOpen(false)}>
                                Close Details
                            </button>
                        </div>
                    </div>

                    <style>{`
                        .community-details-grid {
                            display: grid;
                            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
                            gap: var(--sp-3);
                        }
                        .community-detail-item {
                            border: 1px solid var(--clr-border);
                            border-radius: var(--r-lg);
                            background: var(--glass-bg);
                            padding: var(--sp-2);
                        }
                        .community-detail-thumb {
                            border-radius: var(--r-md);
                            overflow: hidden;
                            background: var(--clr-surface-2);
                            aspect-ratio: 3 / 4;
                        }
                        .community-detail-thumb img {
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }
                        .community-thumb-empty {
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 11px;
                            color: var(--clr-text-3);
                        }
                        .community-detail-name {
                            font-size: 13px;
                            font-weight: 600;
                            color: var(--clr-text);
                            line-height: 1.4;
                        }
                        .community-detail-price {
                            margin-top: 4px;
                            font-size: 12px;
                            color: var(--clr-primary);
                            font-weight: 700;
                        }
                        @media (max-width: 640px) {
                            .community-details-grid {
                                grid-template-columns: repeat(2, minmax(0, 1fr));
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Fullscreen AI Image Lightbox ── */}
            {lightboxOpen && outfit.generated_image_url && (
                <div
                    onClick={() => setLightboxOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(4,4,10,0.90)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => setLightboxOpen(false)}
                        style={{
                            position: 'absolute', top: 20, right: 20,
                            background: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            width: 44, height: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                    >
                        <X size={20} />
                    </button>

                    {/* Label */}
                    <div style={{
                        position: 'absolute', top: 20, left: 20,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        padding: '6px 14px', borderRadius: '999px',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(192,38,211,0.9))',
                        backdropFilter: 'blur(8px)',
                    }}>
                        ✨ AI Outfit Preview — {outfit.name}
                    </div>

                    {/* Full image — stop click from closing */}
                    <img
                        src={outfit.generated_image_url}
                        alt={`Full AI outfit preview for ${outfit.name}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '90vh',
                            objectFit: 'contain',
                            borderRadius: '16px',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                            display: 'block',
                        }}
                    />
                </div>
            )}
        </>
    );
}
