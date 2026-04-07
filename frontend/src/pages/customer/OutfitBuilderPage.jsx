import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, X, Eye, Lock, Trash2, Package, Sparkles, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api/client';

const PIECE_TYPES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

const normalizePieceType = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return PIECE_TYPES.find((slot) => slot.toLowerCase() === normalized) || '';
};

const getPieceType = (product) => normalizePieceType(product?.piece_type || product?.outfit_slot);

const getOutfitDateLabel = (outfit) => {
    const raw = outfit?.created_at || outfit?.createdAt;
    const parsed = raw ? new Date(raw) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date().toLocaleDateString() : parsed.toLocaleDateString();
};

export default function OutfitBuilderPage() {
    const { outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit, showToast, refreshOutfits } = useApp();
    const { user } = useAuth();
    const location = useLocation();

    const [selectedOutfitId, setSelectedOutfitId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        visibility: 'public',
        categoryId: '',
    });

    const [categories, setCategories] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [variantsByProductId, setVariantsByProductId] = useState({});

    const [currentCategoryId, setCurrentCategoryId] = useState('');
    const [outfitCategoryMap, setOutfitCategoryMap] = useState({});
    const [activeSlot, setActiveSlot] = useState(null);

    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loadingPicker, setLoadingPicker] = useState(false);
    const [savingOutfit, setSavingOutfit] = useState(false);

    const currentOutfit = useMemo(
        () => outfits.find((outfit) => outfit.outfit_id === selectedOutfitId) || null,
        [outfits, selectedOutfitId]
    );

    const productMap = useMemo(() => {
        const map = new Map();
        for (const product of [...allProducts, ...filteredProducts]) {
            if (product?.product_id != null) map.set(product.product_id, product);
        }
        return map;
    }, [allProducts, filteredProducts]);

    const outfitProducts = useMemo(() => {
        if (!currentOutfit) return [];
        return (currentOutfit.products || [])
            .map((productId) => productMap.get(productId))
            .filter(Boolean);
    }, [currentOutfit, productMap]);

    const slotProducts = useMemo(() => {
        const map = {};
        for (const product of outfitProducts) {
            const slot = getPieceType(product);
            if (slot) map[slot] = product;
        }
        return map;
    }, [outfitProducts]);

    const ensureVariantsLoaded = async (productIds) => {
        const missingIds = (productIds || []).filter((id) => id && !variantsByProductId[id]);
        if (missingIds.length === 0) return;

        const rows = await Promise.all(
            missingIds.map(async (productId) => {
                try {
                    const variants = await apiCall(`/products/${productId}/variants`);
                    return [productId, Array.isArray(variants) ? variants : []];
                } catch {
                    return [productId, []];
                }
            })
        );

        setVariantsByProductId((prev) => ({
            ...prev,
            ...Object.fromEntries(rows),
        }));
    };

    useEffect(() => {
        if (!user) return;

        const loadData = async () => {
            try {
                const [categoryRows, products] = await Promise.all([
                    apiCall('/categories/').catch(() => []),
                    apiCall('/products/'),
                ]);

                const safeCategories = (categoryRows || [])
                    .filter((row) => row && row.id != null && row.name)
                    .map((row) => ({ id: Number(row.id), name: String(row.name).trim() }))
                    .filter((row) => row.name.length > 0);

                const safeProducts = Array.isArray(products) ? products : [];

                setCategories(safeCategories);
                setAllProducts(safeProducts);

                if (safeCategories.length > 0) {
                    setCreateForm((prev) => ({
                        ...prev,
                        categoryId: prev.categoryId || String(safeCategories[0].id),
                    }));
                }

                await ensureVariantsLoaded(safeProducts.map((product) => product.product_id));
            } catch {
                showToast('Failed to load outfit builder data', 'error');
            }
        };

        loadData();
    }, [user]);

    useEffect(() => {
        if (location.state?.viewOutfitId) {
            setSelectedOutfitId(location.state.viewOutfitId);
        }
    }, [location]);

    useEffect(() => {
        if (!selectedOutfitId && outfits.length > 0) {
            setSelectedOutfitId(outfits[0].outfit_id);
        }
    }, [outfits, selectedOutfitId]);

    useEffect(() => {
        if (!currentOutfit) {
            setCurrentCategoryId('');
            setActiveSlot(null);
            setFilteredProducts([]);
            return;
        }

        const remembered = outfitCategoryMap[currentOutfit.outfit_id];
        if (remembered) {
            setCurrentCategoryId(String(remembered));
            setActiveSlot('Tops');
            setFilteredProducts([]);
            return;
        }

        const explicit = currentOutfit.target_category_id || currentOutfit.targetCategoryId || null;
        if (explicit) {
            const explicitId = String(explicit);
            setCurrentCategoryId(explicitId);
            setOutfitCategoryMap((prev) => ({ ...prev, [currentOutfit.outfit_id]: explicitId }));
            setActiveSlot('Tops');
            setFilteredProducts([]);
            return;
        }

        const firstProductId = (currentOutfit.products || [])[0];
        const firstProduct = firstProductId ? productMap.get(firstProductId) : null;
        const inferredCategoryId = firstProduct?.category_id ? String(firstProduct.category_id) : '';
        const fallbackCategoryId = categories[0] ? String(categories[0].id) : '';
        const nextCategoryId = inferredCategoryId || fallbackCategoryId;

        setCurrentCategoryId(nextCategoryId);
        if (nextCategoryId) {
            setOutfitCategoryMap((prev) => ({ ...prev, [currentOutfit.outfit_id]: nextCategoryId }));
        }

        setActiveSlot('Tops');
        setFilteredProducts([]);
    }, [currentOutfit?.outfit_id]);

    useEffect(() => {
        if (!currentOutfit || !activeSlot || !currentCategoryId) {
            setFilteredProducts([]);
            return;
        }

        let cancelled = false;

        const fetchFilteredProducts = async () => {
            setLoadingPicker(true);
            try {
                const categoryIdNum = Number(currentCategoryId);
                const pieceTypeStr = String(activeSlot).trim();

                // Build query parameters - ensure proper types
                const params = {
                    category_id: categoryIdNum,
                    piece_type: pieceTypeStr,
                };

                // Debug: Log the fetch request
                const queryString = new URLSearchParams(params).toString();
                const fullUrl = `http://localhost:8000/api/products/?${queryString}`;
                console.log('🔍 Fetching products with URL:', fullUrl);
                console.log('📋 Parameters:', { categoryIdNum, pieceTypeStr });

                const products = await apiCall('/products/', {}, params);

                if (cancelled) return;

                console.log('✅ Products received:', products);
                const safeProducts = Array.isArray(products) ? products : [];
                setFilteredProducts(safeProducts);
                await ensureVariantsLoaded(safeProducts.map((product) => product.product_id));
            } catch (err) {
                if (!cancelled) {
                    console.error('❌ Fetch error:', err);
                    setFilteredProducts([]);
                    showToast('Failed to load products for selected category and slot', 'error');
                }
            } finally {
                if (!cancelled) setLoadingPicker(false);
            }
        };

        fetchFilteredProducts();

        return () => {
            cancelled = true;
        };
    }, [currentOutfit?.outfit_id, currentCategoryId, activeSlot]);

    const handleCategoryChange = (nextCategoryId) => {
        if (!currentOutfit) return;

        setCurrentCategoryId(nextCategoryId);
        setOutfitCategoryMap((prev) => ({
            ...prev,
            [currentOutfit.outfit_id]: nextCategoryId,
        }));
        setActiveSlot('Tops');
        setFilteredProducts([]);
    };

    const handleAddToActiveSlot = (product) => {
        if (!currentOutfit || !activeSlot) return;

        const productPieceType = getPieceType(product);
        if (!productPieceType || productPieceType.toLowerCase() !== activeSlot.toLowerCase()) {
            showToast('Selected product does not match the active slot.', 'error');
            return;
        }

        const existing = slotProducts[activeSlot];
        addToOutfit(
            currentOutfit.outfit_id,
            product.product_id,
            activeSlot,
            existing?.product_id || null
        );

        if (existing && existing.product_id !== product.product_id) {
            showToast(`${activeSlot} replaced successfully`, 'success');
        } else if (!existing) {
            showToast(`${activeSlot} added`, 'success');
        } else {
            showToast(`${activeSlot} already selected`, 'info');
        }
    };

    const handleCreateOutfit = () => {
        if (!createForm.name.trim()) {
            showToast('Outfit name is required', 'error');
            return;
        }

        if (!createForm.categoryId) {
            showToast('Category is required', 'error');
            return;
        }

        const categoryId = String(createForm.categoryId);
        const createdOutfit = createOutfit({
            name: createForm.name.trim(),
            description: createForm.description,
            visibility: createForm.visibility,
            target_category_id: Number(categoryId),
            targetCategoryId: Number(categoryId),
        });

        if (createdOutfit?.outfit_id) {
            setSelectedOutfitId(createdOutfit.outfit_id);
            setCurrentCategoryId(categoryId);
            setOutfitCategoryMap((prev) => ({
                ...prev,
                [createdOutfit.outfit_id]: categoryId,
            }));
            setActiveSlot('Tops');
            setFilteredProducts([]);
        }

        setCreateForm({
            name: '',
            description: '',
            visibility: 'public',
            categoryId: categories[0] ? String(categories[0].id) : '',
        });
        setShowCreateModal(false);
    };

    const handleSaveOutfit = async () => {
        if (!currentOutfit) return;
        if ((currentOutfit.products || []).length === 0) {
            showToast('Add at least one product before saving', 'error');
            return;
        }

        setSavingOutfit(true);
        try {
            // Build clean product_ids array - only valid product IDs
            const productIds = (currentOutfit.products || []).filter(id => id != null && id !== '');

            const payload = {
                name: currentOutfit.name,
                description: currentOutfit.description || '',
                visibility: currentOutfit.visibility || 'private',
                category_id: currentCategoryId ? Number(currentCategoryId) : null,
                product_ids: productIds,
            };

            console.log('📤 Saving outfit with payload:', payload);

            let result;
            if (currentOutfit.isSaved) {
                console.log(`🔄 Updating outfit ${currentOutfit.outfit_id}`);
                result = await apiCall(`/outfits/${currentOutfit.outfit_id}`, { method: 'PUT' }, payload);
            } else {
                console.log('✨ Creating new outfit');
                result = await apiCall('/outfits/', { method: 'POST' }, payload);
            }

            console.log('✅ Save response:', result);
            await refreshOutfits();

            if (result?.outfit_id) {
                setSelectedOutfitId(result.outfit_id);
                if (currentCategoryId) {
                    setOutfitCategoryMap((prev) => ({
                        ...prev,
                        [result.outfit_id]: currentCategoryId,
                    }));
                }
            }

            showToast('Outfit saved successfully', 'success');
        } catch (err) {
            console.error('❌ Save error:', err);
            showToast(err.message || 'Failed to save outfit', 'error');
        } finally {
            setSavingOutfit(false);
        }
    };

    if (!user) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--clr-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)' }}>
                <div style={{ maxWidth: '36rem', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--clr-text)', marginBottom: 'var(--sp-2)' }}>Sign in to build outfits</h2>
                    <p style={{ color: 'var(--clr-text-2)', marginBottom: 'var(--sp-8)' }}>Create slot-based looks in your account.</p>
                    <Link
                        to="/login"
                        className="btn btn-primary btn-lg"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--clr-bg)' }}>
            <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '32px 24px', paddingBottom: '40px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--clr-text)', marginBottom: 'var(--sp-3)' }}>Outfit Builder</h1>
                        <p style={{ fontSize: '14px', color: 'var(--clr-text-2)' }}>Craft your perfect outfit, one slot at a time. Add pieces strategically to build cohesive looks.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                        style={{ flexShrink: 0 }}
                    >
                        <Plus size={16} />
                        New Outfit
                    </button>
                </div>

                <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-sm)', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-4)' }}>My Outfits</div>
                    {outfits.length === 0 ? (
                        <div style={{ borderRadius: 'var(--r-lg)', border: '2px dashed var(--clr-border-2)', background: 'rgba(255,255,255,0.02)', padding: 'var(--sp-6)', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: 'var(--clr-text-2)', marginBottom: 'var(--sp-4)' }}>No outfits yet. Create your first one.</p>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-primary"
                            >
                                <Plus size={14} />
                                Create Outfit
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)' }}>
                            {outfits.map((outfit) => (
                                <button
                                    key={outfit.outfit_id}
                                    type="button"
                                    onClick={() => setSelectedOutfitId(outfit.outfit_id)}
                                    style={{
                                        background: 'var(--clr-surface-2)',
                                        border: `1.5px solid ${selectedOutfitId === outfit.outfit_id ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                                        borderRadius: 'var(--r-xl)',
                                        padding: 'var(--sp-4)',
                                        textAlign: 'left',
                                        transition: 'all var(--tr-fast)',
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = selectedOutfitId === outfit.outfit_id ? 'var(--clr-primary)' : 'var(--clr-border)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: 'var(--sp-2)' }}>{outfit.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-3)' }}>
                                                {(outfit.products || []).length} item{(outfit.products || []).length !== 1 ? 's' : ''} • {getOutfitDateLabel(outfit)}
                                            </div>
                                            <div className="badge badge-muted" style={{ fontSize: '10px' }}>
                                                {outfit.visibility === 'public' ? <Eye size={10} /> : <Lock size={10} />}
                                                {(outfit.visibility || 'private').charAt(0).toUpperCase() + (outfit.visibility || 'private').slice(1)}
                                            </div>
                                        </div>
                                        <button
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--clr-text-3)',
                                                padding: 'var(--sp-2)',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                transition: 'color var(--tr-fast)',
                                            }}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                deleteOutfit(outfit.outfit_id);
                                                if (selectedOutfitId === outfit.outfit_id) {
                                                    setSelectedOutfitId(null);
                                                    setActiveSlot(null);
                                                    setFilteredProducts([]);
                                                }
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--clr-error)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--clr-text-3)'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {!currentOutfit ? (
                    <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', padding: '40px var(--sp-6)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                        <Package size={40} style={{ color: 'var(--clr-text-3)', margin: '0 auto', marginBottom: 'var(--sp-4)' }} />
                        <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: 'var(--sp-2)' }}>Select an outfit to start</p>
                        <p style={{ fontSize: '14px', color: 'var(--clr-text-2)', marginBottom: 'var(--sp-6)' }}>Pick an existing outfit or create a new one to begin building your look.</p>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={16} />
                            Create New Outfit
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', '@media (min-width: 1024px)': { gridTemplateColumns: '1fr 1.2fr' } }}>
                        <section style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ marginBottom: 'var(--sp-4)' }}>
                                <h2 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Product Selection</h2>
                                <p style={{ fontSize: '14px', color: 'var(--clr-text-2)' }}>
                                    {activeSlot ? `Browse ${activeSlot.toLowerCase()} in the current category` : 'Click a slot button to load products'}
                                </p>
                            </div>

                            {activeSlot && (
                                <div className="badge badge-primary" style={{ marginBottom: 'var(--sp-4)' }}>
                                    <span style={{ fontSize: '11px' }}>Active Slot: {activeSlot}</span>
                                </div>
                            )}

                            {!currentCategoryId ? (
                                <div style={{ borderRadius: 'var(--r-lg)', border: '2px dashed var(--clr-border-2)', padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--clr-text-3)' }}>
                                    <p style={{ fontSize: '13px' }}>Select a category first from the right panel.</p>
                                </div>
                            ) : !activeSlot ? (
                                <div style={{ borderRadius: 'var(--r-lg)', border: '2px dashed var(--clr-border-2)', padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--clr-text-3)' }}>
                                    <p style={{ fontSize: '13px' }}>Click a slot button to load products.</p>
                                </div>
                            ) : loadingPicker ? (
                                <div style={{ borderRadius: 'var(--r-lg)', border: '2px dashed var(--clr-border-2)', padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--clr-text-2)' }}>
                                    <p style={{ fontSize: '13px' }}>Loading {activeSlot.toLowerCase()} products...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <div style={{ borderRadius: 'var(--r-lg)', border: '2px dashed var(--clr-border-2)', background: 'rgba(251, 191, 36, 0.04)', padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--clr-warning)' }}>
                                    <p style={{ fontSize: '13px' }}>No products found for this category and slot.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: 'var(--sp-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
                                    {filteredProducts.map((product) => {
                                        const variant = variantsByProductId[product.product_id]?.[0];
                                        const image = variant?.images?.[0];
                                        const slotName = getPieceType(product) || activeSlot;
                                        const isCurrent = slotProducts[activeSlot]?.product_id === product.product_id;

                                        return (
                                            <div key={product.product_id} style={{ background: 'var(--clr-surface-2)', borderRadius: 'var(--r-lg)', border: '1px solid var(--clr-border)', overflow: 'hidden', transition: 'all var(--tr-fast)' }}>
                                                <div style={{ aspectRatio: '3/4', background: 'var(--clr-bg-2)', overflow: 'hidden' }}>
                                                    {image ? (
                                                        <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--clr-text-3)' }}>
                                                            <Package size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: 'var(--sp-3)' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: 'var(--sp-2)', lineHeight: '1.4', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>${Number(product.price || 0).toFixed(2)}</div>
                                                    <div className="badge badge-primary" style={{ marginBottom: 'var(--sp-3)', fontSize: '10px', display: 'inline-flex' }}>
                                                        <span>{slotName}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddToActiveSlot(product)}
                                                        className={isCurrent ? 'btn btn-sm' : 'btn btn-primary btn-sm'}
                                                        style={{ width: '100%', justifyContent: 'center', background: isCurrent ? 'var(--clr-success)' : undefined }}
                                                        disabled={isCurrent}
                                                    >
                                                        {isCurrent ? 'In Slot' : `Use`}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
                            <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--sp-4)' }}>
                                    <div>
                                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: 'var(--sp-1)' }}>{currentOutfit.name}</h2>
                                        <p style={{ fontSize: '13px', color: 'var(--clr-text-2)' }}>Slot-based outfit workspace</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSaveOutfit}
                                        disabled={savingOutfit}
                                        className="btn btn-primary btn-sm"
                                    >
                                        <Save size={14} />
                                        {savingOutfit ? 'Saving...' : 'Save'}
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Category</label>
                                        <select
                                            value={currentCategoryId}
                                            onChange={(event) => handleCategoryChange(event.target.value)}
                                            style={{
                                                width: '100%',
                                                background: 'var(--clr-bg-2)',
                                                border: '1.5px solid var(--clr-border)',
                                                borderRadius: 'var(--r-md)',
                                                padding: '10px 12px',
                                                color: 'var(--clr-text)',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all var(--tr-fast)',
                                            }}
                                        >
                                            <option value="">Select category</option>
                                            {categories.map((category) => (
                                                <option key={category.id} value={category.id}>{category.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Active Slot</label>
                                        <div style={{ display: 'flex', alignItems: 'center', height: '42px', background: 'var(--clr-bg-2)', border: '1.5px solid var(--clr-border)', borderRadius: 'var(--r-md)', padding: '10px 12px', color: 'var(--clr-text-2)', fontSize: '13px' }}>
                                            {activeSlot || 'None selected'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', padding: 'var(--sp-6)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)' }}>Outfit Slots</h3>
                                    <div className="badge badge-muted" style={{ gap: '4px' }}>
                                        <Sparkles size={11} />
                                        <span style={{ fontSize: '10px' }}>One per slot</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                                    {PIECE_TYPES.map((slot) => {
                                        const selectedProduct = slotProducts[slot] || null;
                                        const variant = selectedProduct ? variantsByProductId[selectedProduct.product_id]?.[0] : null;
                                        const image = variant?.images?.[0];
                                        const isActive = activeSlot === slot;

                                        return (
                                            <div
                                                key={slot}
                                                style={{
                                                    borderRadius: 'var(--r-lg)',
                                                    border: `2px ${isActive ? 'solid' : 'dashed'} ${isActive ? 'var(--clr-primary)' : 'var(--clr-border-2)'}`,
                                                    background: `${isActive ? 'rgba(192, 132, 252, 0.05)' : 'transparent'}`,
                                                    padding: 'var(--sp-3)',
                                                    transition: 'all var(--tr-fast)',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!selectedProduct) {
                                                        e.currentTarget.style.borderStyle = 'solid';
                                                        e.currentTarget.style.borderColor = 'var(--clr-primary)';
                                                        e.currentTarget.style.background = 'rgba(192, 132, 252, 0.05)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive && !selectedProduct) {
                                                        e.currentTarget.style.borderStyle = 'dashed';
                                                        e.currentTarget.style.borderColor = 'var(--clr-border-2)';
                                                        e.currentTarget.style.background = 'transparent';
                                                    }
                                                }}
                                            >
                                                <div className="badge badge-primary" style={{ marginBottom: 'var(--sp-2)', display: 'inline-flex', fontSize: '10px' }}>
                                                    {slot}
                                                </div>

                                                {selectedProduct ? (
                                                    <>
                                                        <div style={{ aspectRatio: '1/1', overflow: 'hidden', borderRadius: 'var(--r-md)', border: '1px solid var(--clr-border)', background: 'var(--clr-bg-2)', marginBottom: 'var(--sp-2)' }}>
                                                            {image ? (
                                                                <img src={image} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--clr-text-3)' }}>
                                                                    <Package size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clr-text)', marginBottom: 'var(--sp-2)', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{selectedProduct.name}</p>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActiveSlot(slot)}
                                                                className="btn btn-sm btn-ghost"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                Change
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromOutfit(currentOutfit.outfit_id, selectedProduct.product_id)}
                                                                className="btn btn-sm btn-danger"
                                                                style={{ fontSize: '11px' }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveSlot(slot)}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '120px',
                                                            width: '100%',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--clr-text-2)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            gap: 'var(--sp-2)',
                                                            transition: 'color var(--tr-fast)',
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--clr-primary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--clr-text-2)'}
                                                    >
                                                        <Plus size={20} />
                                                        <span>Add {slot}</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 'var(--sp-4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreateModal(false)}>
                    <div style={{ background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--shadow-xl)', maxWidth: '480px', width: '100%' }} onClick={(event) => event.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--clr-border)', padding: 'var(--sp-5)', paddingBottom: 'var(--sp-4)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--clr-text)' }}>Create Outfit</h3>
                            <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-3)', cursor: 'pointer', padding: 'var(--sp-2)', fontSize: '18px', transition: 'color var(--tr-fast)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--clr-text)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--clr-text-3)'}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Outfit Name</label>
                                <input
                                    value={createForm.name}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                    placeholder="e.g. Weekend Vibes"
                                    style={{
                                        width: '100%',
                                        background: 'var(--clr-bg-2)',
                                        border: '1.5px solid var(--clr-border)',
                                        borderRadius: 'var(--r-md)',
                                        padding: 'var(--sp-3) var(--sp-4)',
                                        color: 'var(--clr-text)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        transition: 'all var(--tr-fast)',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Category</label>
                                <select
                                    value={createForm.categoryId}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                                    style={{
                                        width: '100%',
                                        background: 'var(--clr-bg-2)',
                                        border: '1.5px solid var(--clr-border)',
                                        borderRadius: 'var(--r-md)',
                                        padding: 'var(--sp-3) var(--sp-4)',
                                        color: 'var(--clr-text)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        transition: 'all var(--tr-fast)',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
                                >
                                    <option value="">Select category</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Description (Optional)</label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                                    rows={3}
                                    placeholder="Add notes about this outfit..."
                                    style={{
                                        width: '100%',
                                        background: 'var(--clr-bg-2)',
                                        border: '1.5px solid var(--clr-border)',
                                        borderRadius: 'var(--r-md)',
                                        padding: 'var(--sp-3) var(--sp-4)',
                                        color: 'var(--clr-text)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        outline: 'none',
                                        transition: 'all var(--tr-fast)',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)', marginBottom: 'var(--sp-2)' }}>Visibility</label>
                                <select
                                    value={createForm.visibility}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, visibility: event.target.value }))}
                                    style={{
                                        width: '100%',
                                        background: 'var(--clr-bg-2)',
                                        border: '1.5px solid var(--clr-border)',
                                        borderRadius: 'var(--r-md)',
                                        padding: 'var(--sp-3) var(--sp-4)',
                                        color: 'var(--clr-text)',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        transition: 'all var(--tr-fast)',
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--clr-primary)'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--clr-border)'}
                                >
                                    <option value="public">Public (Others can see)</option>
                                    <option value="private">Private (Only you)</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', borderTop: '1px solid var(--clr-border)', padding: 'var(--sp-5)', paddingTop: 'var(--sp-4)' }}>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="btn btn-ghost"
                                style={{ fontSize: '13px' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateOutfit}
                                disabled={!createForm.name.trim() || !createForm.categoryId}
                                className="btn btn-primary"
                                style={{ fontSize: '13px' }}
                            >
                                <Plus size={14} />
                                Create Outfit
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
