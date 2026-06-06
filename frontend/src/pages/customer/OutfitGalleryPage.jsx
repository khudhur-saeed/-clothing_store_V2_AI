import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Compass, GripVertical, Loader2, PenSquare, Plus, Save, User, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { apiCall } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useCart } from '../../context/CartContext';
import {
    createOutfit,
    deleteOutfitById,
    fetchOutfitsByType,
    toggleOutfitVisibility,
    updateOutfit,
} from '../../api/outfits';
import Tabs from '../../components/ui/Tabs';
import CommunityOutfitCard from '../../components/ui/CommunityOutfitCard';

const VALID_SECTIONS = new Set(['my', 'community', 'create']);
const DEPARTMENTS = ['Women', 'Men'];

function normalizeEnum(value) {
    if (typeof value !== 'string') return value || '';
    if (value.includes('.')) return value.split('.').pop() || value;
    return value;
}

function normalizeVariant(variant) {
    const images = Array.isArray(variant?.images)
        ? variant.images
            .map((image) => (typeof image === 'string' ? image : image?.url))
            .filter(Boolean)
        : [];

    return {
        ...variant,
        variant_id: variant?.variant_id ?? variant?.id,
        size: variant?.size || 'One Size',
        stock: Number(variant?.stock ?? 0),
        price: Number(variant?.price ?? 0),
        images,
    };
}

function buildProductPreview(product, variants = []) {
    const safeVariants = Array.isArray(variants) ? variants.map(normalizeVariant).filter(Boolean) : [];
    const primaryVariant = safeVariants.find(v => (v.stock ?? 0) > 0) || safeVariants[0] || null;
    const image = Array.isArray(primaryVariant?.images) && primaryVariant.images.length > 0
        ? primaryVariant.images[0]
        : '';

    return {
        id: product.product_id,
        product_id: product.product_id,
        name: product.name,
        price: Number(product.price) || 0,
        department: normalizeEnum(product.department),
        outfitSlot: normalizeEnum(product.outfit_slot),
        image,
        variants: safeVariants,
        primaryVariant: primaryVariant
            ? {
                ...primaryVariant,
                variant_id: primaryVariant.variant_id,
                images: Array.isArray(primaryVariant.images) ? primaryVariant.images : [],
            }
            : null,
    };
}

function LoadingPanel({ text }) {
    return (
        <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
            <Loader2 size={36} style={{ margin: '0 auto var(--sp-3)', animation: 'spin 0.9s linear infinite' }} />
            <p className="text-muted">{text}</p>
        </div>
    );
}

function VariantPickerModal({ title, subtitle, items, selections, onSelect, onClose, onConfirm, busy = false }) {
    const canConfirm = items.length > 0 && items.every((item) => selections[item.id]);

    return (
        <div className="variant-modal-backdrop" onClick={busy ? undefined : onClose}>
            <div className="variant-modal" onClick={(e) => e.stopPropagation()}>
                <div className="variant-modal-header">
                    <div>
                        <h2 className="variant-modal-title">{title}</h2>
                        <p className="variant-modal-subtitle">{subtitle}</p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
                        Close
                    </button>
                </div>

                <div className="variant-modal-list">
                    {items.map((item) => {
                        const productVariants = item.variants || [];
                        const selectedVariantId = selections[item.id];
                        const selectedVariant = productVariants.find((variant) => variant.variant_id === selectedVariantId) || null;
                        const previewImage = item.image || selectedVariant?.images?.[0] || '';

                        return (
                            <div key={item.id} className="variant-modal-item">
                                <div className="variant-modal-item-media">
                                    {previewImage
                                        ? <img src={previewImage} alt={item.name} />
                                        : <div className="variant-modal-empty">No image</div>}
                                </div>

                                <div className="variant-modal-item-body">
                                    <div>
                                        <div className="variant-modal-item-name">{item.name}</div>
                                        <div className="variant-modal-item-meta">
                                            ${Number(item.price || 0).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="variant-modal-chip-grid">
                                        {productVariants.length === 0 ? (
                                            <span className="variant-modal-empty-text">No variants available</span>
                                        ) : productVariants.map((variant) => {
                                            const isSelected = selectedVariantId === variant.variant_id;
                                            const isOutOfStock = Number(variant.stock ?? 0) <= 0;
                                            return (
                                                <button
                                                    key={`${item.id}-${variant.variant_id}`}
                                                    type="button"
                                                    className={`variant-chip${isSelected ? ' is-selected' : ''}`}
                                                    onClick={() => onSelect(item.id, variant.variant_id)}
                                                    disabled={busy || isOutOfStock}
                                                >
                                                    <span>{variant.size || 'One Size'}</span>
                                                    <small>{isOutOfStock ? 'Out of stock' : `$${Number(variant.price || item.price || 0).toFixed(2)}`}</small>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {selectedVariant && (
                                        <div className="variant-modal-selected-note">
                                            Selected: {selectedVariant.size || 'One Size'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="variant-modal-footer">
                    <div className="text-sm text-muted">
                        Choose a size for every item before adding to cart.
                    </div>
                    <button className="btn btn-primary" onClick={onConfirm} disabled={!canConfirm || busy}>
                        {busy ? 'Adding...' : 'Add to Cart'}
                    </button>
                </div>
            </div>

            <style>{`
                .variant-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--sp-4);
                    background: rgba(4,4,10,0.72);
                    backdrop-filter: blur(8px);
                }
                .variant-modal {
                    width: min(920px, 100%);
                    max-height: 90vh;
                    overflow: auto;
                    border-radius: var(--r-xl);
                    border: 1px solid var(--glass-border);
                    background: var(--clr-surface);
                    box-shadow: var(--shadow-xl);
                    padding: var(--sp-5);
                    display: flex;
                    flex-direction: column;
                    gap: var(--sp-4);
                }
                .variant-modal-header,
                .variant-modal-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: var(--sp-3);
                    flex-wrap: wrap;
                }
                .variant-modal-title {
                    font-size: 22px;
                    font-weight: 800;
                    margin-bottom: 6px;
                }
                .variant-modal-subtitle {
                    color: var(--clr-text-2);
                    font-size: 13px;
                }
                .variant-modal-list {
                    display: grid;
                    gap: var(--sp-3);
                }
                .variant-modal-item {
                    display: grid;
                    grid-template-columns: 92px 1fr;
                    gap: var(--sp-3);
                    padding: var(--sp-3);
                    border: 1px solid var(--clr-border);
                    border-radius: var(--r-lg);
                    background: linear-gradient(155deg, var(--clr-surface), rgba(255,255,255,0.02));
                }
                .variant-modal-item-media {
                    border-radius: var(--r-md);
                    overflow: hidden;
                    aspect-ratio: 3 / 4;
                    background: var(--clr-surface-2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--clr-text-3);
                    font-size: 11px;
                }
                .variant-modal-item-media img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .variant-modal-item-body {
                    display: flex;
                    flex-direction: column;
                    gap: var(--sp-3);
                }
                .variant-modal-item-name {
                    font-size: 15px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }
                .variant-modal-item-meta {
                    font-size: 12px;
                    color: var(--clr-text-2);
                }
                .variant-modal-chip-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .variant-chip {
                    min-width: 84px;
                    padding: 10px 12px;
                    border-radius: var(--r-md);
                    border: 1px solid var(--clr-border);
                    background: var(--clr-bg-3);
                    color: var(--clr-text);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 2px;
                    cursor: pointer;
                    transition: all var(--tr-fast);
                }
                .variant-chip:hover:not(:disabled) {
                    border-color: var(--clr-primary);
                    transform: translateY(-1px);
                }
                .variant-chip.is-selected {
                    border-color: var(--clr-primary);
                    background: rgba(192,132,252,0.14);
                    box-shadow: 0 0 0 1px rgba(192,132,252,0.15) inset;
                }
                .variant-chip:disabled {
                    cursor: not-allowed;
                    opacity: 0.55;
                }
                .variant-chip small {
                    font-size: 10px;
                    color: var(--clr-text-3);
                }
                .variant-modal-empty-text {
                    font-size: 12px;
                    color: var(--clr-text-3);
                }
                .variant-modal-selected-note {
                    font-size: 12px;
                    color: var(--clr-success);
                    font-weight: 600;
                }
                @media (max-width: 720px) {
                    .variant-modal-item {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default function OutfitGalleryPage() {
    const { user } = useAuth();
    const { showToast } = useApp();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const sectionFromUrl = searchParams.get('section');
    const initialTab = VALID_SECTIONS.has(sectionFromUrl) ? sectionFromUrl : 'community';

    const [activeTab, setActiveTab] = useState(initialTab);

    const [myOutfits, setMyOutfits] = useState([]);
    const [communityOutfits, setCommunityOutfits] = useState([]);
    const [loadingMy, setLoadingMy] = useState(false);
    const [loadingCommunity, setLoadingCommunity] = useState(false);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [errorMy, setErrorMy] = useState('');
    const [errorCommunity, setErrorCommunity] = useState('');
    const [busyOutfitId, setBusyOutfitId] = useState(null);

    const [productMap, setProductMap] = useState({});

    const [editorMode, setEditorMode] = useState('create');
    const [editingOutfitId, setEditingOutfitId] = useState(null);
    const [editorForm, setEditorForm] = useState({
        name: '',
        description: '',
        visibility: 'private',
        department: 'Women',
    });
    const [editorItems, setEditorItems] = useState([]);
    const [catalogProductIds, setCatalogProductIds] = useState([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [savingEditor, setSavingEditor] = useState(false);
    const [draggedItemId, setDraggedItemId] = useState(null);
    const [variantPickerOpen, setVariantPickerOpen] = useState(false);
    const [variantPickerTitle, setVariantPickerTitle] = useState('');
    const [variantPickerSubtitle, setVariantPickerSubtitle] = useState('');
    const [variantPickerItems, setVariantPickerItems] = useState([]);
    const [variantSelections, setVariantSelections] = useState({});
    const [variantPickerBusy, setVariantPickerBusy] = useState(false);

    useEffect(() => {
        if (sectionFromUrl === 'create') {
            navigate('/outfits/builder', { replace: true });
        }
    }, [navigate, sectionFromUrl]);

    useEffect(() => {
        if (!VALID_SECTIONS.has(sectionFromUrl || '')) {
            setSearchParams({ section: activeTab }, { replace: true });
            return;
        }
        if (sectionFromUrl !== activeTab) {
            setActiveTab(sectionFromUrl);
        }
    }, [activeTab, sectionFromUrl, setSearchParams]);

    useEffect(() => {
        if ((activeTab === 'my' || activeTab === 'create') && !user) {
            navigate('/login', { replace: true });
        }
    }, [activeTab, user, navigate]);

    const fetchProductPreviewById = useCallback(async (productId) => {
        try {
            const [product, variants] = await Promise.all([
                apiCall(`/products/${productId}`),
                apiCall(`/products/${productId}/variants`),
            ]);
            return [productId, buildProductPreview(product, variants)];
        } catch {
            return [productId, null];
        }
    }, []);

    const ensureProductsLoaded = useCallback(async (ids) => {
        const uniqueIds = [...new Set((ids || []).filter(Boolean))];
        const missing = uniqueIds.filter(id => !(id in productMap));
        if (missing.length === 0) return;

        const fetched = await Promise.all(missing.map(fetchProductPreviewById));
        setProductMap(prev => {
            const next = { ...prev };
            fetched.forEach(([id, data]) => {
                next[id] = data;
            });
            return next;
        });
    }, [fetchProductPreviewById, productMap]);

    const loadMyOutfits = useCallback(async () => {
        if (!user) {
            setMyOutfits([]);
            return;
        }

        setLoadingMy(true);
        setErrorMy('');
        try {
            const data = await fetchOutfitsByType('my');
            setMyOutfits(data);
            await ensureProductsLoaded(data.flatMap(o => o.items || []));
        } catch (err) {
            setMyOutfits([]);
            setErrorMy(err.message || 'Failed to load your outfits');
        } finally {
            setLoadingMy(false);
        }
    }, [ensureProductsLoaded, user]);

    const loadCommunityOutfits = useCallback(async () => {
        setLoadingCommunity(true);
        setErrorCommunity('');
        try {
            const data = await fetchOutfitsByType('public');
            setCommunityOutfits(data);
            await ensureProductsLoaded(data.flatMap(o => o.items || []));
        } catch (err) {
            setCommunityOutfits([]);
            setErrorCommunity(err.message || 'Failed to load community outfits');
        } finally {
            setLoadingCommunity(false);
        }
    }, [ensureProductsLoaded]);

    const loadCatalog = useCallback(async (department) => {
        if (!user) return;
        setLoadingCatalog(true);
        try {
            const data = await apiCall('/products/', {}, { department });
            const ids = (Array.isArray(data) ? data : []).map(p => p.product_id);
            setCatalogProductIds(ids);
            await ensureProductsLoaded(ids);
        } catch {
            setCatalogProductIds([]);
            showToast('Failed to load products for outfit builder', 'error');
        } finally {
            setLoadingCatalog(false);
        }
    }, [ensureProductsLoaded, showToast, user]);

    useEffect(() => {
        if (activeTab === 'community') {
            loadCommunityOutfits();
            return;
        }
        if (activeTab === 'my') {
            loadMyOutfits();
            return;
        }
        if (activeTab === 'create') {
            loadMyOutfits();
            loadCatalog(editorForm.department);
        }
    }, [activeTab, editorForm.department, loadCatalog, loadCommunityOutfits, loadMyOutfits]);

    const filteredCatalog = useMemo(() => {
        const q = catalogSearch.trim().toLowerCase();
        return catalogProductIds
            .map(id => productMap[id])
            .filter(Boolean)
            .filter(p => (q ? p.name.toLowerCase().includes(q) : true));
    }, [catalogProductIds, catalogSearch, productMap]);

    const selectedEditorProducts = useMemo(
        () => editorItems.map(id => ({ id, product: productMap[id] || null })),
        [editorItems, productMap],
    );

    const setTab = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ section: tabId });
    };

    const resetEditorForCreate = useCallback(() => {
        setEditorMode('create');
        setEditingOutfitId(null);
        setEditorForm({
            name: '',
            description: '',
            visibility: 'private',
            department: 'Women',
        });
        setEditorItems([]);
        setCatalogSearch('');
        setDraggedItemId(null);
    }, []);

    const openEditorForCreate = useCallback(() => {
        resetEditorForCreate();
        setTab('create');
    }, [resetEditorForCreate]);

    const openEditorForEdit = useCallback((outfit) => {
        setEditorMode('edit');
        setEditingOutfitId(outfit.id);
        setEditorForm({
            name: outfit.name,
            description: outfit.description || '',
            visibility: outfit.visibility || (outfit.isPublic ? 'public' : 'private'),
            department: outfit.department || 'Women',
        });
        setEditorItems(outfit.items || []);
        setCatalogSearch('');
        setDraggedItemId(null);
        setTab('create');
        ensureProductsLoaded(outfit.items || []);
    }, [ensureProductsLoaded]);

    const handleDelete = async (outfitId) => {
        if (!window.confirm('Delete this outfit? This cannot be undone.')) return;

        setBusyOutfitId(outfitId);
        try {
            await deleteOutfitById(outfitId);
            showToast('Outfit deleted', 'success');
            setMyOutfits(prev => prev.filter(o => o.id !== outfitId));
            setCommunityOutfits(prev => prev.filter(o => o.id !== outfitId));

            if (editingOutfitId === outfitId) {
                resetEditorForCreate();
            }
        } catch (err) {
            showToast(err.message || 'Failed to delete outfit', 'error');
        } finally {
            setBusyOutfitId(null);
        }
    };

    const handleVisibilityToggle = async (outfit) => {
        const nextPublic = !outfit.isPublic;
        setBusyOutfitId(outfit.id);
        try {
            await toggleOutfitVisibility(outfit.id, nextPublic);
            setMyOutfits(prev => prev.map(o => (
                o.id === outfit.id
                    ? { ...o, isPublic: nextPublic, visibility: nextPublic ? 'public' : 'private' }
                    : o
            )));
            showToast(`Outfit is now ${nextPublic ? 'public' : 'private'}`, 'success');
            await loadCommunityOutfits();
        } catch (err) {
            showToast(err.message || 'Failed to update visibility', 'error');
        } finally {
            setBusyOutfitId(null);
        }
    };

    const handleAddSingleProductToCart = async (product) => {
        const variants = Array.isArray(product?.variants) ? product.variants : [];
        const availableVariants = variants.filter((variant) => Number(variant?.stock ?? 0) > 0);

        if (availableVariants.length === 0) {
            showToast('This product is currently unavailable', 'error');
            return;
        }

        setVariantPickerTitle('Choose a size');
        setVariantPickerSubtitle(product.name);
        setVariantPickerItems([{ ...product, variants: availableVariants }]);
        setVariantSelections({
            [product.id]: availableVariants.length === 1 ? availableVariants[0].variant_id : '',
        });
        setVariantPickerOpen(true);
    };

    const handleAddFullOutfitToCart = async (outfit) => {
        const products = (outfit.items || [])
            .map(id => productMap[id])
            .filter(Boolean)
            .map((product) => {
                const variants = Array.isArray(product.variants) ? product.variants : [];
                const availableVariants = variants.filter((variant) => Number(variant?.stock ?? 0) > 0);
                return availableVariants.length > 0 ? { ...product, variants: availableVariants } : null;
            })
            .filter(Boolean);

        if (products.length === 0) {
            showToast('No available products to add from this outfit', 'error');
            return;
        }

        const nextSelections = products.reduce((acc, product) => {
            acc[product.id] = product.variants.length === 1 ? product.variants[0].variant_id : '';
            return acc;
        }, {});

        setVariantPickerTitle(`Choose sizes for ${outfit.name}`);
        setVariantPickerSubtitle(`${products.length} item(s) ready to add`);
        setVariantPickerItems(products);
        setVariantSelections(nextSelections);
        setVariantPickerOpen(true);
    };

    const handleConfirmVariantSelection = async () => {
        if (variantPickerItems.length === 0) return;

        setVariantPickerBusy(true);
        try {
            let addedCount = 0;
            for (const product of variantPickerItems) {
                const selectedVariantId = variantSelections[product.id];
                if (!selectedVariantId) {
                    throw new Error(`Please choose a size for ${product.name}`);
                }

                const variant = (product.variants || []).find((item) => item.variant_id === selectedVariantId);
                if (!variant) {
                    throw new Error(`Selected size is no longer available for ${product.name}`);
                }

                await addToCart(product, variant, 1);
                addedCount += 1;
            }

            showToast(`Added ${addedCount} item(s) to cart`, 'success');
            setVariantPickerOpen(false);
            setVariantPickerItems([]);
            setVariantSelections({});
        } catch (err) {
            showToast(err.message || 'Not enough stock available', 'error');
        } finally {
            setVariantPickerBusy(false);
        }
    };

    const handleVariantSelectionChange = (productId, variantId) => {
        setVariantSelections((prev) => ({
            ...prev,
            [productId]: variantId,
        }));
    };

    const toggleEditorProduct = (productId) => {
        setEditorItems(prev => (
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        ));
    };

    const removeEditorProduct = (productId) => {
        setEditorItems(prev => prev.filter(id => id !== productId));
    };

    const reorderEditorItems = (draggedId, targetId) => {
        if (!draggedId || draggedId === targetId) return;

        setEditorItems(prev => {
            const fromIndex = prev.indexOf(draggedId);
            const toIndex = prev.indexOf(targetId);
            if (fromIndex === -1 || toIndex === -1) return prev;

            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
    };

    const handleSaveEditor = async () => {
        if (!editorForm.name.trim()) {
            showToast('Outfit name is required', 'error');
            return;
        }
        if (editorItems.length === 0) {
            showToast('Add at least one product to the outfit', 'error');
            return;
        }

        setSavingEditor(true);
        try {
            if (editorMode === 'create') {
                const created = await createOutfit({
                    name: editorForm.name.trim(),
                    description: editorForm.description.trim(),
                    visibility: editorForm.visibility,
                    department: editorForm.department,
                    product_ids: editorItems,
                });
                showToast('Outfit created successfully', 'success');
                setEditorMode('edit');
                setEditingOutfitId(created.id);
                setEditorForm({
                    name: created.name,
                    description: created.description || '',
                    visibility: created.visibility,
                    department: created.department || editorForm.department,
                });
                setEditorItems(created.items || editorItems);
            } else if (editingOutfitId) {
                await updateOutfit(editingOutfitId, {
                    name: editorForm.name.trim(),
                    description: editorForm.description.trim(),
                    visibility: editorForm.visibility,
                    product_ids: editorItems,
                });
                showToast('Outfit updated successfully', 'success');
            }

            await loadMyOutfits();
            await loadCommunityOutfits();
        } catch (err) {
            showToast(err.message || 'Failed to save outfit', 'error');
        } finally {
            setSavingEditor(false);
        }
    };

    const tabs = useMemo(() => ([
        { id: 'my', label: 'My Outfits', icon: <User size={16} /> },
        { id: 'community', label: 'Community Outfits', icon: <Compass size={16} /> },
        { id: 'create', label: 'Create / Edit Outfit', icon: <PenSquare size={16} /> },
    ]), []);

    return (
        <div className="page">
            <div className="container">
                <div style={{ marginBottom: 'var(--sp-8)' }}>
                    <h1 className="text-3xl font-bold" style={{ marginBottom: 8 }}>Outfits Studio</h1>
                    <p className="text-muted">
                        Build, manage, and shop outfits from one unified space.
                    </p>
                </div>

                <Tabs tabs={tabs} activeTab={activeTab} onChange={setTab} />

                {activeTab === 'my' && (
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-5)' }}>
                            <button className="btn btn-primary" onClick={openEditorForCreate}>
                                <Plus size={16} /> Create New Outfit
                            </button>
                        </div>

                        {loadingMy ? (
                            <LoadingPanel text="Loading your outfits..." />
                        ) : errorMy ? (
                            <div className="text-center" style={{ padding: 'var(--sp-14) 0' }}>
                                <p className="text-error" style={{ marginBottom: 'var(--sp-4)' }}>{errorMy}</p>
                                <button className="btn btn-ghost" onClick={loadMyOutfits}>Try Again</button>
                            </div>
                        ) : myOutfits.length === 0 ? (
                            <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                                <h2 className="text-xl font-semibold" style={{ marginBottom: 8 }}>No outfits yet</h2>
                                <p className="text-muted">Create your first outfit in the Create / Edit tab.</p>
                                <button className="btn btn-primary" style={{ marginTop: 'var(--sp-5)' }} onClick={openEditorForCreate}>
                                    Create Outfit
                                </button>
                            </div>
                        ) : (
                            <div className="community-grid">
                                {myOutfits.map(outfit => (
                                    <CommunityOutfitCard
                                        key={outfit.id}
                                        outfit={outfit}
                                        productMap={productMap}
                                        mode="my"
                                        isBusy={busyOutfitId === outfit.id}
                                        onAddFullOutfitToCart={handleAddFullOutfitToCart}
                                        onAddProductToCart={handleAddSingleProductToCart}
                                        onEdit={() => openEditorForEdit(outfit)}
                                        onDelete={() => handleDelete(outfit.id)}
                                        onToggleVisibility={() => handleVisibilityToggle(outfit)}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'community' && (
                    <section>
                        {loadingCommunity ? (
                            <LoadingPanel text="Loading community outfits..." />
                        ) : errorCommunity ? (
                            <div className="text-center" style={{ padding: 'var(--sp-14) 0' }}>
                                <p className="text-error" style={{ marginBottom: 'var(--sp-4)' }}>{errorCommunity}</p>
                                <button className="btn btn-ghost" onClick={loadCommunityOutfits}>Try Again</button>
                            </div>
                        ) : communityOutfits.length === 0 ? (
                            <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                                <h2 className="text-xl font-semibold" style={{ marginBottom: 8 }}>No public outfits yet</h2>
                                <p className="text-muted">Once outfits are shared publicly, they will appear here.</p>
                            </div>
                        ) : (
                            <div className="community-grid">
                                {communityOutfits.map(outfit => (
                                    <CommunityOutfitCard
                                        key={outfit.id}
                                        outfit={outfit}
                                        productMap={productMap}
                                        isBusy={busyOutfitId === outfit.id}
                                        onAddFullOutfitToCart={handleAddFullOutfitToCart}
                                        onAddProductToCart={handleAddSingleProductToCart}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'create' && (
                    <section className="builder-layout">
                        <div className="card card-body builder-products-pane">
                            <div className="editor-head">
                                <div>
                                    <h3 className="font-bold">Product Selection</h3>
                                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>Click Add to build your outfit instantly.</p>
                                </div>
                                <input
                                    className="form-input"
                                    style={{ maxWidth: 260 }}
                                    value={catalogSearch}
                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                    placeholder="Search products"
                                />
                            </div>

                            {loadingCatalog ? (
                                <LoadingPanel text="Loading products..." />
                            ) : filteredCatalog.length === 0 ? (
                                <p className="text-muted" style={{ padding: 'var(--sp-8) 0' }}>
                                    No products found for this department.
                                </p>
                            ) : (
                                <div className="builder-product-grid">
                                    {filteredCatalog.map(product => {
                                        const selected = editorItems.includes(product.id);
                                        return (
                                            <article key={product.id} className={`builder-product-card${selected ? ' selected' : ''}`}>
                                                <div className="builder-product-thumb">
                                                    {product.image
                                                        ? <img src={product.image} alt={product.name} />
                                                        : <span>No image</span>}
                                                </div>
                                                <div className="builder-product-meta">
                                                    <div className="font-semibold text-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {product.name}
                                                    </div>
                                                    <div className="text-xs text-primary">${product.price.toFixed(2)}</div>
                                                    <div className="text-xs text-faint">{product.outfitSlot || 'Fashion'}</div>
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${selected ? 'btn-ghost' : 'btn-primary'}`}
                                                    onClick={() => toggleEditorProduct(product.id)}
                                                >
                                                    {selected ? <Check size={14} /> : <Plus size={14} />} {selected ? 'Added' : 'Add'}
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="builder-side-col">
                            <div className="card card-body">
                                <div className="editor-head">
                                    <div>
                                        <h2 className="text-xl font-bold" style={{ marginBottom: 6 }}>
                                            {editorMode === 'create' ? 'Create Outfit' : 'Edit Outfit'}
                                        </h2>
                                        <p className="text-muted text-sm">Configure outfit details and save when ready.</p>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={openEditorForCreate}>New</button>
                                </div>

                                <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
                                    <label className="form-label">Edit Existing Outfit</label>
                                    <select
                                        className="form-select"
                                        value={editingOutfitId || ''}
                                        onChange={(e) => {
                                            const selectedId = Number(e.target.value);
                                            if (!selectedId) {
                                                openEditorForCreate();
                                                return;
                                            }
                                            const target = myOutfits.find(o => o.id === selectedId);
                                            if (target) openEditorForEdit(target);
                                        }}
                                    >
                                        <option value="">Create new outfit</option>
                                        {myOutfits.map(o => (
                                            <option key={o.id} value={o.id}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-grid" style={{ marginTop: 'var(--sp-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Name</label>
                                        <input
                                            className="form-input"
                                            value={editorForm.name}
                                            onChange={(e) => setEditorForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Weekend Minimal"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Visibility</label>
                                        <select
                                            className="form-select"
                                            value={editorForm.visibility}
                                            onChange={(e) => setEditorForm(prev => ({ ...prev, visibility: e.target.value }))}
                                        >
                                            <option value="private">Private</option>
                                            <option value="public">Public</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Department</label>
                                        <select
                                            className="form-select"
                                            value={editorForm.department}
                                            onChange={(e) => setEditorForm(prev => ({ ...prev, department: e.target.value }))}
                                            disabled={editorMode === 'edit'}
                                        >
                                            {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: 'var(--sp-4)' }}>
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-textarea"
                                        value={editorForm.description}
                                        onChange={(e) => setEditorForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe the outfit style, mood, or occasion"
                                    />
                                </div>

                                <div className="builder-save-row">
                                    <div className="text-sm text-muted">{editorItems.length} item(s) selected</div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveEditor}
                                        disabled={savingEditor || editorItems.length === 0 || !editorForm.name.trim()}
                                    >
                                        <Save size={15} />
                                        {savingEditor
                                            ? (editorMode === 'create' ? 'Creating...' : 'Saving...')
                                            : (editorMode === 'create' ? 'Create Outfit' : 'Save Changes')}
                                    </button>
                                </div>
                            </div>

                            <div className="card card-body selected-preview-pane">
                                <div className="editor-head" style={{ marginBottom: 'var(--sp-2)' }}>
                                    <div>
                                        <h3 className="font-bold">Selected Outfit</h3>
                                        <p className="text-xs text-muted" style={{ marginTop: 4 }}>Drag items to reorder. Remove anytime.</p>
                                    </div>
                                    <span className="badge badge-info">{editorItems.length} items</span>
                                </div>

                                {selectedEditorProducts.length === 0 ? (
                                    <div className="selected-empty">
                                        <p className="font-semibold">Your outfit is empty</p>
                                        <p className="text-sm text-muted">Add products from the left panel to start building.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="selected-collage">
                                            {selectedEditorProducts.slice(0, 4).map(({ id, product }, index) => (
                                                <div key={id || index} className="selected-collage-cell">
                                                    {product?.image
                                                        ? <img src={product.image} alt={product.name} />
                                                        : <span>{product ? 'No Image' : 'Missing'}</span>}
                                                    {index === 3 && selectedEditorProducts.length > 4 && (
                                                        <div className="selected-collage-more">+{selectedEditorProducts.length - 4}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="selected-list">
                                            {selectedEditorProducts.map(({ id, product }) => (
                                                <div
                                                    key={id}
                                                    className={`selected-item${draggedItemId === id ? ' dragging' : ''}`}
                                                    draggable
                                                    onDragStart={() => setDraggedItemId(id)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => {
                                                        reorderEditorItems(draggedItemId, id);
                                                        setDraggedItemId(null);
                                                    }}
                                                    onDragEnd={() => setDraggedItemId(null)}
                                                >
                                                    <div className="selected-drag"><GripVertical size={14} /></div>
                                                    <div className="selected-thumb">
                                                        {product?.image
                                                            ? <img src={product.image} alt={product.name || `Product ${id}`} />
                                                            : <span>No image</span>}
                                                    </div>
                                                    <div className="selected-meta">
                                                        <div className="font-semibold text-sm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {product?.name || `Product #${id}`}
                                                        </div>
                                                        <div className="text-xs text-primary">${Number(product?.price || 0).toFixed(2)}</div>
                                                    </div>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => removeEditorProduct(id)}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {variantPickerOpen && (
                    <VariantPickerModal
                        title={variantPickerTitle}
                        subtitle={variantPickerSubtitle}
                        items={variantPickerItems}
                        selections={variantSelections}
                        onSelect={handleVariantSelectionChange}
                        onClose={() => {
                            if (variantPickerBusy) return;
                            setVariantPickerOpen(false);
                            setVariantPickerItems([]);
                            setVariantSelections({});
                        }}
                        onConfirm={handleConfirmVariantSelection}
                        busy={variantPickerBusy}
                    />
                )}

                <style>{`
                    .community-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                        gap: var(--sp-6);
                        align-items: stretch;
                    }
                    .builder-layout {
                        display: grid;
                        grid-template-columns: 1.35fr 1fr;
                        gap: var(--sp-6);
                        align-items: start;
                    }
                    .builder-side-col {
                        display: grid;
                        gap: var(--sp-4);
                    }
                    .editor-head {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: var(--sp-3);
                    }
                    .form-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: var(--sp-3);
                    }
                    .builder-save-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: var(--sp-4);
                        gap: var(--sp-3);
                        flex-wrap: wrap;
                    }
                    .builder-product-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
                        gap: var(--sp-3);
                        margin-top: var(--sp-4);
                    }
                    .builder-product-card {
                        border: 1px solid var(--clr-border);
                        border-radius: var(--r-lg);
                        background: linear-gradient(155deg, var(--clr-surface), rgba(255,255,255,0.02));
                        padding: var(--sp-3);
                        display: flex;
                        flex-direction: column;
                        gap: var(--sp-2);
                        text-align: left;
                        transition: border-color var(--tr-fast), transform var(--tr-fast), box-shadow var(--tr-fast);
                    }
                    .builder-product-card:hover {
                        border-color: var(--clr-primary);
                        transform: translateY(-2px);
                        box-shadow: var(--shadow-md);
                    }
                    .builder-product-card.selected {
                        border-color: var(--clr-primary);
                        background: rgba(192,132,252,0.1);
                    }
                    .builder-product-thumb {
                        width: 100%;
                        height: 190px;
                        border-radius: var(--r-sm);
                        background: var(--clr-surface-2);
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                        color: var(--clr-text-3);
                        font-size: 10px;
                    }
                    .builder-product-thumb img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .builder-product-meta {
                        flex: 1;
                        min-width: 0;
                        width: 100%;
                    }
                    .selected-preview-pane {
                        min-height: 360px;
                    }
                    .selected-empty {
                        border: 1px dashed var(--clr-border-2);
                        border-radius: var(--r-lg);
                        padding: var(--sp-8);
                        text-align: center;
                        color: var(--clr-text-3);
                        background: rgba(255,255,255,0.02);
                    }
                    .selected-collage {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        grid-template-rows: 1fr 1fr;
                        gap: var(--sp-2);
                        margin-bottom: var(--sp-3);
                        aspect-ratio: 16 / 11;
                    }
                    .selected-collage-cell {
                        position: relative;
                        border-radius: var(--r-md);
                        overflow: hidden;
                        background: var(--clr-surface-2);
                        border: 1px solid var(--glass-border);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--clr-text-3);
                        font-size: 11px;
                    }
                    .selected-collage-cell img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .selected-collage-more {
                        position: absolute;
                        inset: 0;
                        background: rgba(0,0,0,0.45);
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 16px;
                    }
                    .selected-list {
                        display: grid;
                        gap: var(--sp-2);
                        max-height: 340px;
                        overflow: auto;
                    }
                    .selected-item {
                        display: grid;
                        grid-template-columns: 26px 52px 1fr auto;
                        align-items: center;
                        gap: var(--sp-2);
                        border: 1px solid var(--clr-border);
                        border-radius: var(--r-md);
                        padding: var(--sp-2);
                        background: var(--clr-surface);
                        cursor: grab;
                    }
                    .selected-item.dragging {
                        opacity: 0.55;
                        border-color: var(--clr-primary);
                    }
                    .selected-drag {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--clr-text-3);
                    }
                    .selected-thumb {
                        width: 52px;
                        height: 66px;
                        border-radius: var(--r-sm);
                        background: var(--clr-surface-2);
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--clr-text-3);
                        font-size: 10px;
                    }
                    .selected-thumb img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .selected-meta {
                        min-width: 0;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                    @media (max-width: 1160px) {
                        .builder-layout {
                            grid-template-columns: 1fr;
                        }
                    }
                    @media (max-width: 980px) {
                        .form-grid {
                            grid-template-columns: 1fr 1fr;
                        }
                    }
                    @media (max-width: 768px) {
                        .community-grid {
                            grid-template-columns: 1fr;
                            gap: var(--sp-4);
                        }
                        .form-grid {
                            grid-template-columns: 1fr;
                        }
                        .builder-product-grid {
                            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        }
                        .selected-item {
                            grid-template-columns: 20px 46px 1fr auto;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
}
