import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
    Plus, Search, Edit, Trash2, X, Check, RefreshCw,
    Package, Image as ImageIcon, ChevronDown, ChevronUp,
} from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
    'Dresses', 'Tops', 'Bottoms', 'Outerwear',
    'T-Shirts', 'Shirts', 'Pants', 'Bags', 'Jewelry', 'Accessories',
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

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

const emptyVariant = () => ({
    color: '', size: 'M', stock: '',
    imageInput: '', images: [],
    showCustomColor: false, errors: {},
});

/* ─── Validation ─────────────────────────────────────────────────────────── */
const validateProductForm = (f) => {
    const e = {};
    if (!f.name.trim()) e.name = 'Product name is required.';
    if (!f.price || Number(f.price) <= 0) e.price = 'Enter a valid price greater than $0.';
    return e;
};

const validateVariant = (v) => {
    const e = {};
    if (!v.color) e.color = 'Color is required.';
    if (v.stock === '' || Number(v.stock) < 0) e.stock = 'Stock must be 0 or more.';
    if (v.images.length === 0) e.images = 'At least one image is required.';
    return e;
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function AdminProductsPage() {
    const { showToast } = useApp();

    /* Product list */
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    /* Modal */
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);

    /* Product fields */
    const [form, setForm] = useState({ name: '', description: '', category: 'Tops', price: '', status: 'draft' });
    const [formErrors, setFormErrors] = useState({});
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    /* Variants */
    const [variants, setVariants] = useState([emptyVariant()]);

    /* ── Data ────────────────────────────────────────────────────────── */
    const fetchProducts = async () => {
        setLoading(true);
        try { setProducts(await apiCall('/products/')); }
        catch { showToast('Failed to load products', 'error'); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchProducts(); }, []);

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    /* ── Open / Close ───────────────────────────────────────────────── */
    const resetModal = () => {
        setEditId(null);
        setForm({ name: '', description: '', category: 'Tops', price: '', status: 'draft' });
        setFormErrors({});
        setVariants([emptyVariant()]);
    };

    const openAdd = () => { resetModal(); setShowForm(true); };

    const openEdit = async (p) => {
        resetModal();
        setEditId(p.product_id);
        setForm({ name: p.name, description: p.description || '', category: p.category || 'Tops', price: String(p.price), status: p.status || 'draft' });
        // Load existing variants
        try {
            const vs = await apiCall(`/products/${p.product_id}/variants`);
            if (vs.length > 0) {
                setVariants(vs.map(v => ({
                    ...emptyVariant(),
                    variantId: v.variant_id,
                    color: v.color || '',
                    size: v.size || 'M',
                    stock: String(v.stock ?? ''),
                    images: v.images || [],
                })));
            } else {
                setVariants([emptyVariant()]);
            }
        } catch { setVariants([emptyVariant()]); }
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        fetchProducts();
    };

    /* ── Variant helpers ────────────────────────────────────────────── */
    const setVField = (idx, key, value) =>
        setVariants(prev => prev.map((v, i) => i !== idx ? v : { ...v, [key]: value, errors: { ...v.errors, [key]: undefined } }));

    const addImageToVariant = (idx) => {
        const url = variants[idx].imageInput.trim();
        if (!url) return;
        setVField(idx, 'images', [...variants[idx].images, url]);
        setVField(idx, 'imageInput', '');
    };

    const removeImage = (vIdx, imgIdx) =>
        setVField(vIdx, 'images', variants[vIdx].images.filter((_, i) => i !== imgIdx));

    const addVariantRow = () => setVariants(prev => [...prev, emptyVariant()]);

    const removeVariantRow = (idx) => {
        if (variants.length === 1) { setVariants([emptyVariant()]); return; }
        setVariants(prev => prev.filter((_, i) => i !== idx));
    };

    /* ── Save (all-in-one) ──────────────────────────────────────────── */
    const handleSave = async () => {
        // 1. Validate product info
        const productErrors = validateProductForm(form);
        setFormErrors(productErrors);

        // 2. Validate each variant (skip if truly blank)
        const isBlank = v => !v.color && v.images.length === 0 && v.stock === '';
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

            // 3. Create or update product
            if (editId) {
                await apiCall(`/products/${editId}`, { method: 'PUT' }, {
                    name: form.name.trim(), description: form.description,
                    category: form.category, price: Number(form.price), status: form.status,
                });
            } else {
                const res = await apiCall('/products/', { method: 'POST' }, {
                    name: form.name.trim(), description: form.description,
                    category: form.category, price: Number(form.price), status: 'draft',
                });
                productId = res.product_id;
            }

            // 4. Save variants
            let variantsSaved = 0;
            for (const v of toSave) {
                try {
                    if (v.variantId) {
                        // update existing variant
                        await apiCall(`/products/${productId}/variants/${v.variantId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: v.color, size: v.size, stock: Number(v.stock), images: v.images }),
                        });
                    } else {
                        // create new variant
                        await apiCall(`/products/${productId}/variants`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ color: v.color, size: v.size, stock: Number(v.stock), images: v.images }),
                        });
                    }
                    variantsSaved++;
                } catch (err) { showToast(`Variant error: ${err.message}`, 'error'); }
            }

            // 5. If user chose 'active', try to set it now (backend validates variants/images)
            if (!editId && form.status === 'active' && variantsSaved > 0) {
                try {
                    await apiCall(`/products/${productId}`, { method: 'PUT' }, { status: 'active' });
                } catch (err) {
                    showToast(`Product saved, but could not activate: ${err.message}`, 'info');
                }
            }

            showToast(editId ? 'Product updated!' : `Product created with ${variantsSaved} variant(s)!`);
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

    /* ─────────────────────────────────────────────────────────────────
       RENDER
    ───────────────────────────────────────────────────────────────── */
    return (
        <AdminLayout title="Products">

            {/* ── Toolbar ── */}
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

            {/* ── Products table ── */}
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
                        <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.product_id}>
                                    <td>
                                        <div className="font-semibold text-sm">{p.name}</div>
                                        <div className="text-xs text-faint">{p.description?.slice(0, 50)}{p.description?.length > 50 ? '…' : ''}</div>
                                    </td>
                                    <td><span className="badge badge-muted">{p.category || '—'}</span></td>
                                    <td className="text-primary font-bold">${Number(p.price).toFixed(2)}</td>
                                    <td><span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-muted'}`}>{p.status || 'draft'}</span></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="btn btn-outline btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit"><Edit size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.product_id)} title="Delete"><Trash2 size={14} color="var(--clr-error)" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MODAL — Single unified form
            ═══════════════════════════════════════════════════════════ */}
            {showForm && (
                <div className="modal-overlay" onClick={closeForm}>
                    <div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: 680, width: '100%',
                            borderRadius: 'var(--r-2xl)', overflow: 'hidden',
                            display: 'flex', flexDirection: 'column', maxHeight: '92vh',
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--clr-border)', flexShrink: 0 }}>
                            <div className="flex items-center justify-between">
                                <span className="font-bold" style={{ fontSize: 17 }}>{editId ? 'Edit Product' : 'New Product'}</span>
                                <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-3)', padding: 4 }}><X size={20} /></button>
                            </div>
                        </div>

                        {/* Body — scrollable */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* ════ SECTION 1: Product Info ════ */}
                            <section>
                                <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>1</div>
                                    <span className="font-bold" style={{ fontSize: 14 }}>Product Information</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* Name */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Product Name *</label>
                                        <input id="prod-name" className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Classic Linen Blazer" style={{ borderColor: formErrors.name ? 'var(--clr-error)' : undefined }} />
                                        {formErrors.name && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.name}</p>}
                                    </div>

                                    {/* Description */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Description</label>
                                        <textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Describe the product…" style={{ minHeight: 72, resize: 'vertical' }} />
                                    </div>

                                    {/* Category + Price */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Category</label>
                                            <select className="form-select" value={form.category} onChange={set('category')}>
                                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Price (USD) *</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)', fontWeight: 600 }}>$</span>
                                                <input className="form-input" type="number" min="0.01" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" style={{ paddingLeft: 26, borderColor: formErrors.price ? 'var(--clr-error)' : undefined }} />
                                            </div>
                                            {formErrors.price && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{formErrors.price}</p>}
                                        </div>
                                    </div>

                                    {/* Status cards */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label">Status</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                            {[
                                                { value: 'draft', label: 'Draft', desc: 'Hidden from store', icon: '✏️' },
                                                { value: 'inactive', label: 'Inactive', desc: 'Temporarily hidden', icon: '⏸️' },
                                                { value: 'active', label: 'Active', desc: 'Visible in store', icon: '✅' },
                                            ].map(s => (
                                                <button key={s.value} type="button" onClick={() => setForm(f => ({ ...f, status: s.value }))}
                                                    style={{
                                                        padding: '10px 12px', borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer',
                                                        border: form.status === s.value ? '2px solid var(--clr-primary)' : '1px solid var(--clr-border)',
                                                        background: form.status === s.value ? 'rgba(99,102,241,.08)' : 'var(--clr-surface-2)',
                                                        transition: 'all 0.15s',
                                                    }}>
                                                    <div style={{ fontSize: 15, marginBottom: 3 }}>{s.icon}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: form.status === s.value ? 'var(--clr-primary)' : 'var(--clr-text)' }}>{s.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--clr-text-3)', marginTop: 2 }}>{s.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Divider */}
                            <div style={{ height: 1, background: 'var(--clr-border)' }} />

                            {/* ════ SECTION 2: Variants ════ */}
                            <section>
                                <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--clr-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>2</div>
                                        <span className="font-bold" style={{ fontSize: 14 }}>Variants <span className="text-faint" style={{ fontSize: 12, fontWeight: 400 }}>({variants.length})</span></span>
                                    </div>
                                    <button className="btn btn-outline btn-sm" onClick={addVariantRow}>
                                        <Plus size={13} /> Add Variant
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {variants.map((v, idx) => (
                                        <VariantCard
                                            key={idx}
                                            v={v} idx={idx}
                                            canRemove={variants.length > 1}
                                            onUpdate={(key, val) => setVField(idx, key, val)}
                                            onAddImage={() => addImageToVariant(idx)}
                                            onRemoveImage={(imgIdx) => removeImage(idx, imgIdx)}
                                            onRemove={() => removeVariantRow(idx)}
                                        />
                                    ))}
                                </div>

                                {/* Bottom add button (visible when there are multiple variants) */}
                                {variants.length >= 1 && (
                                    <button className="btn btn-outline btn-sm" onClick={addVariantRow} style={{ marginTop: 14, width: '100%' }}>
                                        <Plus size={13} /> Add Another Variant
                                    </button>
                                )}
                            </section>
                        </div>

                        {/* Footer */}
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

/* ─── Variant Card sub-component ─────────────────────────────────────────── */
function VariantCard({ v, idx, canRemove, onUpdate, onAddImage, onRemoveImage, onRemove }) {
    const [collapsed, setCollapsed] = useState(false);
    const isCustomColor = v.color && !PRESET_COLORS.some(c => c.hex === v.color);
    const hasErrors = Object.keys(v.errors || {}).length > 0;

    return (
        <div style={{
            border: hasErrors ? '1.5px solid var(--clr-error)' : '1px solid var(--clr-border)',
            borderRadius: 'var(--r-lg)', overflow: 'hidden',
            background: 'var(--clr-surface)',
        }}>
            {/* Card header */}
            <div
                className="flex items-center gap-3"
                style={{ padding: '10px 14px', background: 'var(--clr-surface-2)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setCollapsed(c => !c)}
            >
                {v.color && (
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: v.color, border: '1px solid var(--clr-border)', flexShrink: 0, display: 'inline-block' }} />
                )}
                <span className="font-semibold text-sm" style={{ flex: 1 }}>
                    Variant {idx + 1}
                    {(v.color || v.size) && (
                        <span className="text-faint" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                            {colorName(v.color)}{v.color && v.size ? ' · ' : ''}{v.size}
                            {v.images.length > 0 && ` · ${v.images.length} img`}
                        </span>
                    )}
                </span>
                {hasErrors && <span style={{ fontSize: 11, color: 'var(--clr-error)', fontWeight: 600 }}>⚠ Fix errors</span>}
                <div className="flex gap-1 items-center">
                    {canRemove && (
                        <button
                            onClick={e => { e.stopPropagation(); onRemove(); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--clr-text-3)', padding: 4 }}
                            title="Remove variant"
                        ><Trash2 size={13} /></button>
                    )}
                    {collapsed ? <ChevronDown size={15} color="var(--clr-text-3)" /> : <ChevronUp size={15} color="var(--clr-text-3)" />}
                </div>
            </div>

            {/* Card body */}
            {!collapsed && (
                <div style={{ padding: '16px 16px 14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px', gap: 12 }}>
                        {/* Color */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Color *</label>
                            <div style={{ position: 'relative' }}>
                                {v.color && (
                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: v.color, border: '1px solid var(--clr-border)', pointerEvents: 'none', zIndex: 1 }} />
                                )}
                                <select
                                    className="form-select"
                                    value={isCustomColor ? '__custom__' : (v.color || '')}
                                    onChange={e => {
                                        if (e.target.value === '__custom__') {
                                            onUpdate('showCustomColor', true);
                                            onUpdate('color', '');
                                        } else {
                                            onUpdate('color', e.target.value);
                                            onUpdate('showCustomColor', false);
                                        }
                                    }}
                                    style={{ paddingLeft: v.color ? 32 : 12 }}
                                >
                                    <option value="">— Select color —</option>
                                    {PRESET_COLORS.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}
                                    <option value="__custom__">🎨 Custom…</option>
                                </select>
                            </div>
                            {(v.showCustomColor || isCustomColor) && (
                                <div className="flex gap-2 items-center" style={{ marginTop: 8 }}>
                                    <input type="color" value={v.color || '#888888'} onChange={e => onUpdate('color', e.target.value)}
                                        style={{ width: 34, height: 34, padding: 2, borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)', cursor: 'pointer', background: 'none' }} />
                                    <input className="form-input" value={v.color} onChange={e => onUpdate('color', e.target.value)} placeholder="#RRGGBB" style={{ maxWidth: 110 }} />
                                </div>
                            )}
                            {v.errors?.color && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{v.errors.color}</p>}
                        </div>

                        {/* Size */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Size</label>
                            <select className="form-select" value={v.size} onChange={e => onUpdate('size', e.target.value)}>
                                {SIZES.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Stock */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Stock *</label>
                            <input className="form-input" type="number" min="0" value={v.stock} onChange={e => onUpdate('stock', e.target.value)} placeholder="0" />
                            {v.errors?.stock && <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{v.errors.stock}</p>}
                        </div>
                    </div>

                    {/* Images */}
                    <div className="form-group" style={{ margin: '14px 0 0' }}>
                        <label className="form-label"><ImageIcon size={12} style={{ display: 'inline', marginRight: 4 }} />Images *</label>
                        <div className="flex gap-2">
                            <input
                                className="form-input"
                                placeholder="Paste image URL then press Enter or click Add"
                                value={v.imageInput}
                                onChange={e => onUpdate('imageInput', e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAddImage())}
                            />
                            <button className="btn btn-outline btn-sm" onClick={onAddImage} style={{ flexShrink: 0 }}>Add</button>
                        </div>
                        {v.errors?.images
                            ? <p className="text-xs" style={{ color: 'var(--clr-error)', marginTop: 4 }}>{v.errors.images}</p>
                            : v.images.length === 0 && <p className="text-xs" style={{ marginTop: 5, color: '#b45309' }}>⚠️ Add at least one image.</p>
                        }
                        {v.images.length > 0 && (
                            <div className="flex gap-2" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                                {v.images.map((url, imgIdx) => (
                                    <div key={imgIdx} style={{ position: 'relative' }}>
                                        <img src={url} alt="" onError={e => { e.target.style.opacity = 0.3; }}
                                            style={{ width: 54, height: 64, objectFit: 'cover', borderRadius: 'var(--r-sm)', border: '1px solid var(--clr-border)', display: 'block' }} />
                                        <button onClick={() => onRemoveImage(imgIdx)}
                                            style={{ position: 'absolute', top: -6, right: -6, width: 17, height: 17, borderRadius: '50%', background: 'var(--clr-error)', border: '2px solid var(--clr-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, lineHeight: 1 }}>
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
