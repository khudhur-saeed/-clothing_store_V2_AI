import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    Plus, Search, Edit, Trash2, X, Check, RefreshCw,
    Package, Image as ImageIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const PIECE_TYPES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];

const PRESET_COLORS = [
    { name: 'Black', hex: '#111111' }, { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy', hex: '#1E3A5F' }, { name: 'Grey', hex: '#9CA3AF' },
    { name: 'Beige', hex: '#E8D5B0' }, { name: 'Brown', hex: '#92400E' },
    { name: 'Red', hex: '#DC2626' }, { name: 'Pink', hex: '#F472B6' },
    { name: 'Burgundy', hex: '#800020' }, { name: 'Orange', hex: '#F97316' },
    { name: 'Yellow', hex: '#FBBF24' }, { name: 'Olive', hex: '#6B7C3A' },
    { name: 'Green', hex: '#16A34A' }, { name: 'Mint', hex: '#6EE7B7' },
    { name: 'Teal', hex: '#0D9488' }, { name: 'Blue', hex: '#2563EB' },
    { name: 'Sky Blue', hex: '#38BDF8' }, { name: 'Purple', hex: '#9333EA' },
    { name: 'Lavender', hex: '#C4B5FD' }, { name: 'Gold', hex: '#D4AF37' },
];

const colorName = (hex) => PRESET_COLORS.find(c => c.hex?.toLowerCase() === hex?.toLowerCase())?.name || hex || '—';
const normalizePieceType = (value) => String(value || '').trim();
const normalizeProductStatus = (value) => (String(value).toLowerCase() === 'active' ? 'active' : 'inactive');
const normalizeImages = (images) => Array.isArray(images) ? images.filter(Boolean) : [];

// Empty variant = Color with its size options (NESTED STRUCTURE)
const emptyVariant = () => ({
    color: '', images: [], imageInput: '', showCustomColor: false, errors: {},
    sizeOptions: [],
});

// Empty size option for the nested table
const emptySizeOption = () => ({ size: 'M', stock: '', price: '', sizeErrors: {} });

const groupFlatVariantsByColor = (rows, fallbackPrice = '') => {
    const grouped = new Map();

    (rows || []).forEach((row) => {
        const colorKey = row.color || '';

        if (!grouped.has(colorKey)) {
            grouped.set(colorKey, {
                color: colorKey,
                images: normalizeImages(row.images),
                imageInput: '',
                showCustomColor: false,
                errors: {},
                sizeOptions: [],
            });
        }

        const group = grouped.get(colorKey);

        if (group.images.length === 0) {
            group.images = normalizeImages(row.images);
        }

        group.sizeOptions.push({
            variantId: row.variant_id,
            size: row.size || 'M',
            stock: String(row.stock ?? 0),
            price: String(fallbackPrice ?? ''),
            sizeErrors: {},
        });
    });

    return Array.from(grouped.values());
};

/* ─── Validation ─────────────────────────────────────────────────────────── */
const validateProductForm = (f) => {
    const e = {};
    if (!f.name.trim()) e.name = 'Product name is required.';
    if (!f.categoryId) e.categoryId = 'Category is required.';
    if (!f.pieceType) e.pieceType = 'Piece type is required.';
    if (!f.price || Number(f.price) <= 0) e.price = 'Enter a valid price greater than $0.';
    return e;
};

const validateVariant = (v) => {
    const e = {};
    if (!v.color) e.color = 'Color is required.';
    if (v.images.length === 0) e.images = 'At least one image is required.';
    if (!v.sizeOptions || v.sizeOptions.length === 0) e.sizeOptions = 'Add at least one size option.';
    
    v.sizeOptions.forEach((so, idx) => {
        const soErrors = {};
        if (!so.size) soErrors.size = 'Size is required.';
        if (so.stock === '' || Number(so.stock) < 0) soErrors.stock = 'Stock must be ≥ 0.';
        if (so.price === '' || Number(so.price) <= 0) soErrors.price = 'Price must be > $0.';
        if (Object.keys(soErrors).length > 0) {
            if (!e.sizeOptions) e.sizeOptions = [];
            e.sizeOptions[idx] = soErrors;
        }
    });
    
    return e;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function AdminProductsPage() {
    const { showToast } = useApp();

    const [products, setProducts] = useState([]);
    const [categoryOptions, setCategoryOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({ name: '', description: '', categoryId: '', pieceType: 'Tops', price: '', status: 'inactive' });
    const [formErrors, setFormErrors] = useState({});
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const [variants, setVariants] = useState([emptyVariant()]);
    const [loadedVariantIds, setLoadedVariantIds] = useState([]);

    const fetchProducts = async () => {
        setLoading(true);
        try { setProducts(await apiCall('/products/')); }
        catch { showToast('Failed to load products', 'error'); }
        finally { setLoading(false); }
    };

    const fetchCategories = async () => {
        try {
            const rows = await apiCall('/categories/');
            const options = (rows || [])
                .filter(c => c && c.id != null && c.name)
                .map(c => ({ id: c.id, name: c.name.trim() }))
                .filter(c => c.name.length > 0);

            if (options.length > 0) {
                setCategoryOptions(options);
                setForm(prev => ({
                    ...prev,
                    categoryId: options.some(c => String(c.id) === String(prev.categoryId))
                        ? prev.categoryId
                        : String(options[0].id)
                }));
            } else {
                setCategoryOptions([]);
                showToast('No categories found. Please create categories first.', 'error');
            }
        } catch {
            setCategoryOptions([]);
            showToast('Failed to load categories', 'error');
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase()) ||
        normalizePieceType(p.piece_type || p.outfit_slot).toLowerCase().includes(search.toLowerCase())
    );

    const resetModal = () => {
        setEditId(null);
        setForm({
            name: '', description: '', categoryId: categoryOptions[0] ? String(categoryOptions[0].id) : '',
            pieceType: 'Tops', price: '', status: 'inactive'
        });
        setFormErrors({});
        setVariants([emptyVariant()]);
        setLoadedVariantIds([]);
    };

    const openAdd = () => { resetModal(); setShowForm(true); };

    const openEdit = async (p) => {
        resetModal();
        setEditId(p.product_id);
        const fallbackCategory = categoryOptions.find(c => c.name === p.category);
        setForm({
            name: p.name, description: p.description || '',
            categoryId: String(p.category_id ?? fallbackCategory?.id ?? ''),
            pieceType: normalizePieceType(p.piece_type || p.outfit_slot) || 'Tops',
            price: String(p.price), status: normalizeProductStatus(p.status)
        });
        try {
            const vs = await apiCall(`/products/${p.product_id}/variants`);
            if (vs.length > 0) {
                setVariants(groupFlatVariantsByColor(vs, p.price));
                setLoadedVariantIds(vs.map(v => v.variant_id).filter(Boolean));
            } else {
                setVariants([emptyVariant()]);
                setLoadedVariantIds([]);
            }
        } catch {
            setVariants([emptyVariant()]);
            setLoadedVariantIds([]);
        }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        fetchProducts();
    };

    const setVField = (idx, key, value) =>
        setVariants(prev => prev.map((v, i) => i !== idx ? v : { ...v, [key]: value, errors: { ...v.errors, [key]: undefined } }));

    const setSizeOptionField = (vIdx, soIdx, key, value) =>
        setVariants(prev => prev.map((v, i) => {
            if (i !== vIdx) return v;
            const newSizeOptions = [...v.sizeOptions];
            newSizeOptions[soIdx] = { ...newSizeOptions[soIdx], [key]: value, sizeErrors: { ...newSizeOptions[soIdx].sizeErrors, [key]: undefined } };
            return { ...v, sizeOptions: newSizeOptions };
        }));

    const addImageToVariant = (idx) => {
        const url = variants[idx].imageInput.trim();
        if (!url) return;
        setVField(idx, 'images', [...variants[idx].images, url]);
        setVField(idx, 'imageInput', '');
    };

    const removeImage = (vIdx, imgIdx) =>
        setVField(vIdx, 'images', variants[vIdx].images.filter((_, i) => i !== imgIdx));

    const addSizeOptionToVariant = (vIdx) => {
        setVariants(prev => prev.map((v, i) => {
            if (i !== vIdx) return v;
            return { ...v, sizeOptions: [...v.sizeOptions, emptySizeOption()] };
        }));
    };

    const removeSizeOptionFromVariant = (vIdx, soIdx) => {
        setVariants(prev => prev.map((v, i) => {
            if (i !== vIdx) return v;
            if (v.sizeOptions.length === 1) return v;
            return { ...v, sizeOptions: v.sizeOptions.filter((_, idx) => idx !== soIdx) };
        }));
    };

    const addVariantRow = () => setVariants(prev => [...prev, emptyVariant()]);

    const removeVariantRow = (idx) => {
        if (variants.length === 1) { setVariants([emptyVariant()]); return; }
        setVariants(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        const productErrors = validateProductForm(form);
        setFormErrors(productErrors);

        const isBlank = v => !v.color && v.images.length === 0 && v.sizeOptions.length === 0;
        const toSave = variants.filter(v => !isBlank(v));

        let variantErrors = false;
        const validatedVariants = variants.map(v => {
            if (isBlank(v)) return v;
            const e = validateVariant(v);
            if (Object.keys(e).length > 0) variantErrors = true;
            return { ...v, errors: e };
        });
        setVariants(validatedVariants);

        if (Object.keys(productErrors).length > 0 || variantErrors) {
            showToast('Please fix the errors highlighted below.', 'error');
            return;
        }

        setSaving(true);
        try {
            let productId = editId;

            if (editId) {
                await apiCall(`/products/${editId}`, { method: 'PUT' }, {
                    name: form.name.trim(), description: form.description,
                    category_id: Number(form.categoryId), piece_type: form.pieceType,
                    price: Number(form.price), status: form.status,
                });
            } else {
                const res = await apiCall('/products/', { method: 'POST' }, {
                    name: form.name.trim(), description: form.description,
                    category_id: Number(form.categoryId), piece_type: form.pieceType,
                    price: Number(form.price), status: 'inactive',
                });
                productId = res.product_id;
            }

            let variantsSaved = 0;
            const persistedVariantIds = [];
            for (const v of toSave) {
                for (const so of v.sizeOptions) {
                    try {
                        const variantPayload = {
                            color: v.color,
                            size: so.size,
                            stock: Number(so.stock),
                            images: v.images,
                        };

                        if (so.variantId) {
                            await apiCall(`/products/${productId}/variants/${so.variantId}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(variantPayload),
                            });
                            persistedVariantIds.push(so.variantId);
                        } else {
                            const created = await apiCall(`/products/${productId}/variants`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(variantPayload),
                            });
                            if (created?.variant_id) persistedVariantIds.push(created.variant_id);
                        }
                        variantsSaved++;
                    } catch (err) {
                        showToast(`Variant error: ${err.message}`, 'error');
                    }
                }
            }

            if (editId) {
                const removedVariantIds = loadedVariantIds.filter(id => !persistedVariantIds.includes(id));
                for (const removedId of removedVariantIds) {
                    try {
                        await apiCall(`/products/${productId}/variants/${removedId}`, { method: 'DELETE' });
                    } catch (err) {
                        showToast(`Could not delete removed variant #${removedId}: ${err.message}`, 'error');
                    }
                }
            }

            if (!editId && form.status === 'active' && variantsSaved > 0) {
                try {
                    await apiCall(`/products/${productId}`, { method: 'PUT' }, { status: 'active' });
                } catch (err) {
                    showToast(`Product saved, but could not activate: ${err.message}`, 'info');
                }
            }

            showToast(editId ? 'Product updated!' : `Product created with ${variantsSaved} color variant(s)!`);
            closeForm();
        } catch (err) {
            showToast(err.message || 'Failed to save product', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this product? This cannot be undone.')) return;
        try {
            await apiCall(`/products/${id}`, { method: 'DELETE' });
            setProducts(prev => prev.filter(p => p.product_id !== id));
            showToast('Product deleted');
        } catch (err) { showToast(err.message, 'error'); }
    };

    return (
        <AdminLayout title="Products">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                    <input className="form-input" style={{ paddingLeft: 38 }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={fetchProducts}><RefreshCw size={14} /></button>
                    <button className="btn btn-primary" onClick={openAdd} id="add-product-btn"><Plus size={16} /> Add Product</button>
                </div>
            </div>

            {loading ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}><p className="text-muted">Loading…</p></div>
            ) : filtered.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <Package size={48} color="var(--clr-border)" style={{ margin: '0 auto 16px' }} />
                    <p className="font-semibold">No products yet</p>
                    <p className="text-muted text-sm" style={{ marginTop: 6 }}>Add your first product to get started</p>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openAdd}>Add Product</button>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Product</th><th>Category</th><th>Piece Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(p => {
                                const productStatus = normalizeProductStatus(p.status);
                                return <tr key={p.product_id}>
                                    <td>
                                        <div className="font-semibold text-sm">{p.name}</div>
                                        <div className="text-xs text-faint">{p.description?.slice(0, 50)}{p.description?.length > 50 ? '…' : ''}</div>
                                    </td>
                                    <td><span className="badge badge-muted">{p.category || '—'}</span></td>
                                    <td><span className="badge badge-muted">{normalizePieceType(p.piece_type || p.outfit_slot) || '—'}</span></td>
                                    <td className="text-primary font-bold">${Number(p.price).toFixed(2)}</td>
                                    <td><span className={`badge ${productStatus === 'active' ? 'badge-success' : 'badge-muted'}`}>{productStatus}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-outline btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit"><Edit size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.product_id)} title="Delete"><Trash2 size={14} color="var(--clr-error)" /></button>
                                        </div>
                                    </td>
                                </tr>;
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={closeForm}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, width: '100%', borderRadius: 'var(--r-2xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
                        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
                            <div className="flex items-center justify-between">
                                <span className="font-bold" style={{ fontSize: 17 }}>{editId ? 'Edit Product' : 'New Product'}</span>
                                <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-3)', padding: 4 }}><X size={20} /></button>
                            </div>
                        </div>

                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <section>
                                <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>1</div>
                                    <span className="font-bold" style={{ fontSize: 14 }}>Product Information</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Product Name *</label>
                                        <input id="prod-name" className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Classic Linen Blazer" style={{ borderColor: formErrors.name ? 'var(--clr-error)' : undefined }} />
                                        {formErrors.name && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.name}</p>}
                                    </div>

                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Description</label>
                                        <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Describe the product…" style={{ minHeight: 72, resize: 'vertical' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Category *</label>
                                            <select className="form-select" value={form.categoryId} onChange={set('categoryId')} style={{ borderColor: formErrors.categoryId ? 'var(--clr-error)' : undefined }}>
                                                <option value="">Select a category</option>
                                                {categoryOptions.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                                            </select>
                                            {formErrors.categoryId && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.categoryId}</p>}
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Piece Type *</label>
                                            <select className="form-select" value={form.pieceType} onChange={set('pieceType')} style={{ borderColor: formErrors.pieceType ? 'var(--clr-error)' : undefined }}>
                                                {PIECE_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            {formErrors.pieceType && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.pieceType}</p>}
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Base Price (USD) *</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)', fontWeight: 600 }}>$</span>
                                                <input className="form-input" type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" style={{ paddingLeft: 26, borderColor: formErrors.price ? 'var(--clr-error)' : undefined }} />
                                            </div>
                                            {formErrors.price && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.price}</p>}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Status</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                            {[
                                                { value: 'inactive', label: 'Inactive', desc: 'Temporarily hidden', icon: '⏸️' },
                                                { value: 'active', label: 'Active', desc: 'Visible in store', icon: '✅' },
                                            ].map(s => (
                                                <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, status: s.value }))} style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer', border: form.status === s.value ? '2px solid var(--clr-primary)' : '1px solid var(--clr-border)', background: form.status === s.value ? 'rgba(99,102,241,.08)' : 'var(--clr-surface-2)', transition: 'all 0.15s' }}>
                                                    <div style={{ fontSize: 15, marginBottom: 3 }}>{s.icon}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: form.status === s.value ? 'var(--clr-primary)' : 'var(--clr-text)' }}>{s.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--clr-text-3)', marginTop: 2 }}>{s.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div style={{ height: 1, background: 'var(--clr-border)' }} />

                            <section>
                                <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>2</div>
                                        <span className="font-bold" style={{ fontSize: 14 }}>Color Variants <span className="text-faint" style={{ fontSize: 12, fontWeight: 400 }}>({variants.length})</span></span>
                                    </div>
                                    <button className="btn btn-outline btn-sm" onClick={addVariantRow}>
                                        <Plus size={13} /> Add Color
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {variants.map((v, idx) => (
                                        <VariantCard key={idx} v={v} vIdx={idx} canRemove={variants.length > 1} onUpdate={(key, val) => setVField(idx, key, val)} onAddImage={() => addImageToVariant(idx)} onRemoveImage={(imgIdx) => removeImage(idx, imgIdx)} onRemove={() => removeVariantRow(idx)} onAddSizeOption={() => addSizeOptionToVariant(idx)} onRemoveSizeOption={(soIdx) => removeSizeOptionFromVariant(idx, soIdx)} onUpdateSizeOption={(soIdx, key, val) => setSizeOptionField(idx, soIdx, key, val)} />
                                    ))}
                                </div>

                                {variants.length >= 1 && (
                                    <button className="btn btn-outline btn-sm" onClick={addVariantRow} style={{ marginTop: 14, width: '100%' }}>
                                        <Plus size={13} /> Add Another Color
                                    </button>
                                )}
                            </section>
                        </div>

                        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
                            <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                            <button id="save-product-btn" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 140 }}>
                                <Check size={14} /> {saving ? 'Saving…' : (editId ? 'Update Product' : 'Create Product')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

function VariantCard({ v, vIdx, canRemove, onUpdate, onAddImage, onRemoveImage, onRemove, onAddSizeOption, onRemoveSizeOption, onUpdateSizeOption }) {
    const [collapsed, setCollapsed] = useState(false);
    const isCustomColor = v.color && !PRESET_COLORS.some(c => c.hex === v.color);
    const hasErrors = Object.keys(v.errors || {}).length > 0;

    return (
        <div style={{ border: hasErrors ? '1.5px solid var(--clr-error)' : '1px solid var(--clr-border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: 'var(--clr-surface)' }}>
            <div className="flex items-center gap-3" style={{ padding: '10px 14px', background: 'var(--clr-surface-2)', cursor: 'pointer', userSelect: 'none' }} onClick={() => setCollapsed(c => !c)}>
                {v.color && <span style={{ width: 14, height: 14, borderRadius: '50%', background: v.color, border: '1px solid var(--clr-border)', flexShrink: 0, display: 'inline-block' }} />}
                <span className="font-semibold text-sm" style={{ flex: 1 }}>
                    Color Variant {vIdx + 1}
                    {v.color && (
                        <span className="text-faint" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                            {colorName(v.color)}{v.sizeOptions.length > 0 && ` · ${v.sizeOptions.length} size(s)`}
                            {v.images.length > 0 && ` · ${v.images.length} img(s)`}
                        </span>
                    )}
                </span>
                {hasErrors && <span style={{ fontSize: 11, color: 'var(--clr-error)', fontWeight: 600 }}>⚠ Fix errors</span>}
                <div className="flex gap-1 items-center">
                    {canRemove && (
                        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-3)', padding: 4 }} title="Remove color variant">
                            <Trash2 size={13} />
                        </button>
                    )}
                    {collapsed ? <ChevronDown size={15} color="var(--clr-text-3)" /> : <ChevronUp size={15} color="var(--clr-text-3)" />}
                </div>
            </div>

            {!collapsed && (
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Color *</label>
                            <div style={{ position: 'relative' }}>
                                {v.color && (
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: v.color, border: '1px solid var(--clr-border)', pointerEvents: 'none', zIndex: 1 }} />
                                )}
                                <select className="form-select" value={isCustomColor ? '__custom__' : (v.color || '')} onChange={e => { if (e.target.value === '__custom__') { onUpdate('showCustomColor', true); onUpdate('color', ''); } else { onUpdate('color', e.target.value); onUpdate('showCustomColor', false); } }} style={{ paddingLeft: v.color ? 32 : 12 }}>
                                    <option value="">— Select color —</option>
                                    {PRESET_COLORS.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}
                                    <option value="__custom__">🎨 Custom…</option>
                                </select>
                            </div>
                            {(v.showCustomColor || isCustomColor) && (
                                <div className="flex gap-2 items-center" style={{ marginTop: 8 }}>
                                    <input type="color" value={v.color || '#888888'} onChange={e => onUpdate('color', e.target.value)} style={{ width: 34, height: 34, padding: 2, borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)', cursor: 'pointer', background: 'none' }} />
                                    <input className="form-input" value={v.color} onChange={e => onUpdate('color', e.target.value)} placeholder="#RRGGBB" style={{ maxWidth: 110 }} />
                                </div>
                            )}
                            {v.errors?.color && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{v.errors.color}</p>}
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                                <label className="form-label">Size Options *</label>
                                <button className="btn btn-outline btn-sm" onClick={onAddSizeOption}>
                                    <Plus size={12} /> Add Size
                                </button>
                            </div>

                            {v.sizeOptions && v.sizeOptions.length > 0 ? (
                                <div style={{ border: '1px solid var(--clr-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'var(--clr-surface-2)', borderBottom: '1px solid var(--clr-border)' }}>
                                            <tr>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Size</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Stock</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Price ($)</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: 12, fontWeight: 600, width: 40 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {v.sizeOptions.map((so, soIdx) => (
                                                <tr key={soIdx} style={{ borderBottom: soIdx < v.sizeOptions.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <select className="form-select" value={so.size} onChange={e => onUpdateSizeOption(soIdx, 'size', e.target.value)} style={{ borderColor: so.sizeErrors?.size ? 'var(--clr-error)' : undefined }}>
                                                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'].map(s => <option key={s}>{s}</option>)}
                                                        </select>
                                                        {so.sizeErrors?.size && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 2 }}>{so.sizeErrors.size}</p>}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <input className="form-input" type="number" min="0" value={so.stock} onChange={e => onUpdateSizeOption(soIdx, 'stock', e.target.value)} placeholder="0" style={{ borderColor: so.sizeErrors?.stock ? 'var(--clr-error)' : undefined }} />
                                                        {so.sizeErrors?.stock && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 2 }}>{so.sizeErrors.stock}</p>}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: 'var(--clr-text-3)' }}>$</span>
                                                            <input className="form-input" type="number" min="0.01" step="0.01" value={so.price} onChange={e => onUpdateSizeOption(soIdx, 'price', e.target.value)} placeholder="0.00" style={{ paddingLeft: 20, borderColor: so.sizeErrors?.price ? 'var(--clr-error)' : undefined }} />
                                                            {so.sizeErrors?.price && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 2 }}>{so.sizeErrors.price}</p>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        {v.sizeOptions.length > 1 && (
                                                            <button onClick={() => onRemoveSizeOption(soIdx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-3)', padding: 4 }} title="Remove size">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '12px', textAlign: 'center', background: 'var(--clr-surface-2)', borderRadius: 'var(--r-md)', color: 'var(--clr-text-3)', fontSize: 12 }}>
                                    No size options yet. Click "+ Add Size" to add one.
                                </div>
                            )}
                            {v.errors?.sizeOptions && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 6 }}>{v.errors.sizeOptions}</p>}
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label"><ImageIcon size={12} style={{ display: 'inline', marginRight: 4 }} />Color Images *</label>
                            <div className="flex gap-2">
                                <input className="form-input" placeholder="Paste image URL then press Enter or click Add" value={v.imageInput} onChange={e => onUpdate('imageInput', e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddImage())} />
                                <button className="btn btn-outline btn-sm" onClick={onAddImage} style={{ flexShrink: 0 }}>Add</button>
                            </div>
                            {v.errors?.images ? <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{v.errors.images}</p> : v.images.length === 0 && <p className="text-xs" style={{ marginTop: 5, color: '#b45309' }}>⚠️ Add at least one image.</p> }
                            {v.images.length > 0 && (
                                <div className="flex gap-2" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                                    {v.images.map((url, imgIdx) => (
                                        <div key={imgIdx} style={{ position: 'relative' }}>
                                            <img src={url} alt="" onError={e => { e.target.style.opacity = 0.3; }} style={{ width: 54, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)', display: 'block' }} />
                                            <button onClick={() => onRemoveImage(imgIdx)} style={{ position: 'absolute', top: -6, right: -6, width: 17, height: 17, borderRadius: '50%', background: 'var(--clr-error)', border: '2px solid var(--clr-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, lineHeight: 1 }}>
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
