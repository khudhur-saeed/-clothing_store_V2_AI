import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Plus, Search, Edit, Trash2, X, Check } from 'lucide-react';
import { mockProducts } from '../../data/mockData';

const PIECE_TYPES = ['top', 'bottom', 'outerwear', 'footwear', 'accessory'];
const CATEGORIES = ['Dresses', 'Tops', 'Bottoms', 'Outerwear', 'T-Shirts', 'Shirts', 'Pants', 'Bags', 'Jewelry'];

export default function AdminProductsPage() {
    const [products, setProducts] = useState(mockProducts);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', category: 'Tops', piece_type: 'top', price: '', stock: '', image: '' });
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

    const openAdd = () => { setEditId(null); setForm({ name: '', description: '', category: 'Tops', piece_type: 'top', price: '', stock: '', image: '' }); setShowForm(true); };
    const openEdit = (p) => { setEditId(p.id); setForm({ name: p.name, description: p.description, category: p.category, piece_type: p.piece_type, price: p.variants[0]?.price, stock: p.variants[0]?.stock, image: p.images[0]?.url }); setShowForm(true); };

    const handleSave = () => {
        if (!form.name) return;
        if (editId) {
            setProducts(prev => prev.map(p => p.id === editId ? { ...p, name: form.name, description: form.description, category: form.category, piece_type: form.piece_type, images: [{ url: form.image || p.images[0]?.url, is_primary: true }], variants: [{ ...p.variants[0], price: Number(form.price) || p.variants[0].price, stock: Number(form.stock) || p.variants[0].stock }] } : p));
        } else {
            const newP = { id: Date.now(), name: form.name, description: form.description, category: form.category, category_id: 5, piece_type: form.piece_type, images: [{ url: form.image || 'https://images.unsplash.com/photo-1520367445093-50dc08a59d9d?w=400', is_primary: true }], rating: 0, review_count: 0, variants: [{ id: Date.now(), color: '#1c1c1c', color_name: 'Black', size: 'M', price: Number(form.price) || 0, stock: Number(form.stock) || 0 }] };
            setProducts(prev => [newP, ...prev]);
        }
        setShowForm(false);
    };

    const handleDelete = (id) => { if (window.confirm('Delete this product?')) setProducts(prev => prev.filter(p => p.id !== id)); };

    return (
        <AdminLayout title="Products">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                    <input className="form-input" style={{ paddingLeft: 38 }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} id="product-search" />
                </div>
                <button className="btn btn-primary" onClick={openAdd} id="add-product-btn"><Plus size={16} /> Add Product</button>
            </div>

            <div className="table-wrap">
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Piece Type</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
                    <tbody>
                        {filtered.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <img src={p.images[0]?.url} alt={p.name} style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />
                                        <div>
                                            <div className="font-semibold text-sm">{p.name}</div>
                                            <div className="text-xs text-faint">{p.description?.slice(0, 40)}…</div>
                                        </div>
                                    </div>
                                </td>
                                <td><span className="badge badge-muted">{p.category}</span></td>
                                <td><span className="badge badge-primary">{p.piece_type}</span></td>
                                <td className="text-primary font-bold">${p.variants[0]?.price.toFixed(2)}</td>
                                <td>
                                    <span className={`badge ${p.variants[0]?.stock > 5 ? 'badge-success' : p.variants[0]?.stock > 0 ? 'badge-warning' : 'badge-error'}`}>
                                        {p.variants.reduce((s, v) => s + v.stock, 0)} units
                                    </span>
                                </td>
                                <td>⭐ {p.rating} ({p.review_count})</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button className="btn btn-outline btn-icon btn-sm" onClick={() => openEdit(p)} title="Edit"><Edit size={14} /></button>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(p.id)} title="Delete"><Trash2 size={14} color="var(--clr-error)" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                                <div className="form-group">
                                    <label className="form-label">Piece Type</label>
                                    <select className="form-select" value={form.piece_type} onChange={set('piece_type')}>
                                        {PIECE_TYPES.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Price ($)</label><input className="form-input" type="number" value={form.price} onChange={set('price')} placeholder="0.00" /></div>
                                <div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" value={form.stock} onChange={set('stock')} placeholder="0" /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Image URL</label><input className="form-input" value={form.image} onChange={set('image')} placeholder="https://…" /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button id="save-product-btn" className="btn btn-primary" onClick={handleSave}><Check size={14} /> {editId ? 'Update' : 'Add'} Product</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
