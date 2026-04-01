import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { apiCall } from '../../api/client';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCategories = async () => {
        try {
            const data = await apiCall('/categories/');
            setCategories(Array.isArray(data) ? data : []);
        } catch (err) {
            alert(err.message || 'Failed to load categories');
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return categories.filter((c) => c.name.toLowerCase().includes(q));
    }, [categories, search]);

    const handleAdd = async () => {
        const trimmed = name.trim();
        if (!trimmed || saving) return;

        setSaving(true);
        try {
            const newCat = await apiCall('/categories/', { method: 'POST' }, { name: trimmed });
            setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
            setName('');
            setShowForm(false);
        } catch (err) {
            alert(err.message || 'Failed to add category');
        } finally {
            setSaving(false);
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        try {
            await apiCall(`/categories/${id}`, { method: 'DELETE' });
            setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            alert(err.message || 'Failed to delete category');
        }
    };

    return (
        <AdminLayout title="Categories">
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                    <input
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search categories"
                    />
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)} id="add-category-btn">
                    <Plus size={16} /> Add Category
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="text-center" style={{ padding: 'var(--sp-10)' }}>
                            <p className="font-semibold">No categories found</p>
                            <p className="text-muted text-sm" style={{ marginTop: 4 }}>Create independent categories like Men, Women, Kids, Sale, Sportswear.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid' }}>
                            {filtered.map((cat, index) => (
                                <div
                                    key={cat.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 'var(--sp-4)',
                                        padding: 'var(--sp-4) var(--sp-6)',
                                        borderBottom: index < filtered.length - 1 ? '1px solid var(--clr-border)' : 'none',
                                    }}
                                >
                                    <div>
                                        <div className="font-semibold">{cat.name}</div>
                                        <div className="text-xs text-faint">ID: {cat.id}</div>
                                    </div>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteCategory(cat.id)}>
                                        <Trash2 size={14} color="var(--clr-error)" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <span className="font-bold">Add Category</span>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Category Name *</label>
                                <input
                                    id="cat-name-input"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Men, Women, Kids, Sale"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button id="save-category-btn" className="btn btn-primary" onClick={handleAdd} disabled={!name.trim() || saving}>
                                {saving ? 'Adding...' : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
