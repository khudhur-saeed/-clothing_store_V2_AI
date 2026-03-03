import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Plus, X, ChevronRight, FolderTree } from 'lucide-react';

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ name: '', parent_id: '' });
    const [showForm, setShowForm] = useState(false);

    const parents = categories.filter(c => !c.parent_id);

    const handleAdd = () => {
        if (!form.name) return;
        setCategories(prev => [...prev, { id: Date.now(), name: form.name, parent_id: form.parent_id ? Number(form.parent_id) : null }]);
        setForm({ name: '', parent_id: '' }); setShowForm(false);
    };

    const deleteCategory = (id) => {
        setCategories(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    };

    return (
        <AdminLayout title="Categories">
            <div className="flex justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                <div className="text-muted text-sm">{categories.length} categories · {parents.length} top-level</div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)} id="add-category-btn"><Plus size={16} /> Add Category</button>
            </div>

            <div className="card">
                {parents.map((parent, pi) => {
                    const children = categories.filter(c => c.parent_id === parent.id);
                    return (
                        <div key={parent.id} style={{ borderBottom: pi < parents.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
                            <div className="cat-row" style={{ padding: 'var(--sp-4) var(--sp-6)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                                <FolderTree size={16} color="var(--clr-primary)" />
                                <span className="font-bold">{parent.name}</span>
                                {children.length > 0 && <span className="badge badge-muted">{children.length} sub</span>}
                                <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={() => deleteCategory(parent.id)}>
                                    <X size={13} color="var(--clr-error)" />
                                </button>
                            </div>
                            {children.map((child, ci) => (
                                <div key={child.id} style={{ padding: 'var(--sp-3) var(--sp-6) var(--sp-3) var(--sp-12)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', background: 'var(--clr-bg-3)', borderTop: '1px solid var(--clr-border)' }}>
                                    <ChevronRight size={14} color="var(--clr-text-3)" />
                                    <span className="text-sm text-muted">{child.name}</span>
                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ marginLeft: 'auto' }} onClick={() => deleteCategory(child.id)}>
                                        <X size={12} color="var(--clr-error)" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <span className="font-bold">Add Category</span>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex-col" style={{ gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Category Name *</label>
                                <input id="cat-name-input" className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Swimwear" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Parent Category (optional)</label>
                                <select className="form-select" value={form.parent_id} onChange={e => setForm(p => ({ ...p, parent_id: e.target.value }))}>
                                    <option value="">None (Top-level)</option>
                                    {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button id="save-category-btn" className="btn btn-primary" onClick={handleAdd} disabled={!form.name}>Add Category</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
