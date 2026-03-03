import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Plus, Search, Edit, Trash2, X, Check, RefreshCw, Package } from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

const CATEGORIES = ['Dresses', 'Tops', 'Bottoms', 'Outerwear', 'T-Shirts', 'Shirts', 'Pants', 'Bags', 'Jewelry', 'Accessories'];

export default function AdminProductsPage() {
    const { showToast } = useApp();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', category: 'Tops', price: '', status: 'active' });
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await apiCall('/products/');
            setProducts(data);
        } catch (err) { showToast('Failed to load products', 'error'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProducts(); }, []);

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => {
        setEditId(null);
        setForm({ name: '', description: '', category: 'Tops', price: '', status: 'active' });
        setShowForm(true);
    };

    const openEdit = (p) => {
        setEditId(p.product_id);
        setForm({ name: p.name, description: p.description || '', category: p.category || 'Tops', price: p.price, status: p.status || 'active' });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.price) { showToast('Name and price are required', 'error'); return; }
        setSaving(true);
        try {
            if (editId) {
                await apiCall(`/products/${editId}`, { method: 'PUT' }, {
                    name: form.name,
                    description: form.description,
                    category: form.category,
                    price: Number(form.price),
                    status: form.status,
                });
                showToast('Product updated!');
            } else {
                await apiCall('/products/', { method: 'POST' }, {
                    name: form.name,
                    description: form.description,
                    category: form.category,
                    price: Number(form.price),
                    status: form.status,
                });
                showToast('Product created!');
            }
            setShowForm(false);
            await fetchProducts();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSaving(false); }
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
                    <input className="form-input" style={{ paddingLeft: 38 }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} id="product-search" />
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={fetchProducts}><RefreshCw size={14} /></button>
                    <button className="btn btn-primary" onClick={openAdd} id="add-product-btn"><Plus size={16} /> Add Product</button>
                </div>
            </div>

            {loading ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <p className="text-muted">Loading products…</p>
                </div>
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
                                        <div>
                                            <div className="font-semibold text-sm">{p.name}</div>
                                            <div className="text-xs text-faint">{p.description?.slice(0, 50)}{p.description?.length > 50 ? '…' : ''}</div>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-muted">{p.category || '—'}</span></td>
                                    <td className="text-primary font-bold">${Number(p.price).toFixed(2)}</td>
                                    <td>
                                        <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                                            {p.status || 'active'}
                                        </span>
                                    </td>
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

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <span className="font-bold">{editId ? 'Edit Product' : 'Add Product'}</span>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex-col" style={{ gap: 14 }}>
                            <div className="form-group"><label className="form-label">Name *</label><input id="prod-name" className="form-input" value={form.name} onChange={set('name')} placeholder="Product name" /></div>
                            <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={set('description')} placeholder="Product description" style={{ minHeight: 80 }} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={form.category} onChange={set('category')}>
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Price ($) *</label><input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" /></div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={form.status} onChange={set('status')}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                            <p className="text-xs text-faint">💡 After saving, go to the product to add variants (size/color/stock/images)</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button id="save-product-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                                <Check size={14} /> {saving ? 'Saving…' : (editId ? 'Update' : 'Add')} Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
