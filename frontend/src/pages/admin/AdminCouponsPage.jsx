import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Plus, Tag, X, Check, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

export default function AdminCouponsPage() {
    const { showToast } = useApp();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ code: '', discount: '', expiration_date: '', min_order_amount: '', usage_limit: '100', is_active: true });
    const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const data = await apiCall('/coupons/');
            setCoupons(data);
        } catch { setCoupons([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleAdd = async () => {
        if (!form.code || !form.discount) { showToast('Code and discount are required', 'error'); return; }
        setSaving(true);
        try {
            await apiCall('/coupons/', { method: 'POST' }, {
                coupon_code: form.code.toUpperCase(),
                discount: Number(form.discount),
                expiration_date: form.expiration_date || null,
                min_order_amount: Number(form.min_order_amount) || 0,
                usage_limit: Number(form.usage_limit) || 100,
                is_active: form.is_active,
            });
            showToast('Coupon created!');
            setShowForm(false);
            setForm({ code: '', discount: '', expiration_date: '', min_order_amount: '', usage_limit: '100', is_active: true });
            await fetchCoupons();
        } catch (err) { showToast(err.message, 'error'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (code, current) => {
        try {
            await apiCall(`/coupons/${code}`, { method: 'PUT' }, { is_active: !current });
            setCoupons(prev => prev.map(c => c.coupon_code === code ? { ...c, is_active: !current } : c));
        } catch (err) { showToast(err.message, 'error'); }
    };

    const deleteCoupon = async (code) => {
        if (!window.confirm(`Delete coupon ${code}?`)) return;
        try {
            await apiCall(`/coupons/${code}`, { method: 'DELETE' });
            setCoupons(prev => prev.filter(c => c.coupon_code !== code));
            showToast('Coupon deleted');
        } catch (err) { showToast(err.message, 'error'); }
    };

    return (
        <AdminLayout title="Coupons">
            <div className="flex justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                <div className="text-muted text-sm">{coupons.length} coupons · {coupons.filter(c => c.is_active).length} active</div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={fetchCoupons}><RefreshCw size={14} /></button>
                    <button className="btn btn-primary" onClick={() => setShowForm(true)} id="create-coupon-btn"><Plus size={16} /> Create Coupon</button>
                </div>
            </div>

            {loading ? (
                <p className="text-center text-muted" style={{ padding: 'var(--sp-10) 0' }}>Loading coupons…</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Code</th><th>Discount</th><th>Min. Order</th><th>Expires</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {coupons.map(c => (
                                <tr key={c.coupon_code}>
                                    <td><span className="font-bold font-mono" style={{ background: 'var(--clr-surface-2)', padding: '3px 8px', borderRadius: 4, fontSize: 13 }}>{c.coupon_code}</span></td>
                                    <td><span className="text-success font-bold">{c.discount}%</span></td>
                                    <td>${c.min_order_amount}</td>
                                    <td className="text-sm text-muted">{c.expiration_date || '—'}</td>
                                    <td>
                                        <div className="text-sm">{c.used_count} / {c.usage_limit}</div>
                                        <div style={{ height: 4, background: 'var(--clr-border)', borderRadius: 2, marginTop: 4, width: 80 }}>
                                            <div style={{ height: '100%', background: 'var(--clr-primary)', borderRadius: 2, width: `${Math.min(100, (c.used_count / c.usage_limit) * 100)}%` }} />
                                        </div>
                                    </td>
                                    <td>
                                        <button onClick={() => toggleActive(c.coupon_code, c.is_active)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {c.is_active ? <ToggleRight size={22} color="var(--clr-success)" /> : <ToggleLeft size={22} color="var(--clr-text-3)" />}
                                            <span className={`text-sm ${c.is_active ? 'text-success' : 'text-faint'}`}>{c.is_active ? 'Active' : 'Disabled'}</span>
                                        </button>
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteCoupon(c.coupon_code)}>
                                            <X size={14} color="var(--clr-error)" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="font-bold"><Tag size={16} /> Create Coupon</span>
                            <button onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex-col" style={{ gap: 14 }}>
                            <div className="form-group"><label className="form-label">Coupon Code *</label><input id="coupon-code-input" className="form-input" value={form.code} onChange={set('code')} placeholder="e.g. SUMMER25" style={{ textTransform: 'uppercase' }} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group"><label className="form-label">Discount (%) *</label><input className="form-input" type="number" value={form.discount} onChange={set('discount')} placeholder="10" /></div>
                                <div className="form-group"><label className="form-label">Min. Order ($)</label><input className="form-input" type="number" value={form.min_order_amount} onChange={set('min_order_amount')} placeholder="0" /></div>
                                <div className="form-group"><label className="form-label">Expiry Date</label><input className="form-input" type="date" value={form.expiration_date} onChange={set('expiration_date')} /></div>
                                <div className="form-group"><label className="form-label">Usage Limit</label><input className="form-input" type="number" value={form.usage_limit} onChange={set('usage_limit')} /></div>
                            </div>
                            <label className="checkbox-label"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active immediately</label>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                            <button id="save-coupon-btn" className="btn btn-primary" onClick={handleAdd} disabled={saving}><Check size={14} /> {saving ? 'Saving…' : 'Create Coupon'}</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
