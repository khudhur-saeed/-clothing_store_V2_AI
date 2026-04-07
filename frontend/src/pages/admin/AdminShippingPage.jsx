import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

const SHIPPING_STATUSES = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusColors = { processing: 'info', shipped: 'warning', out_for_delivery: 'info', delivered: 'success', cancelled: 'error' };

export default function AdminShippingPage() {
    const { showToast } = useApp();
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingOrderId, setSavingOrderId] = useState(null);
    const [drafts, setDrafts] = useState({});

    const toDateTimeLocalValue = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d}T${h}:${min}`;
    };

    const fetchShipments = async () => {
        setLoading(true);
        try {
            const data = await apiCall('/shipping/');
            setShipments(Array.isArray(data) ? data : []);
        } catch (err) {
            showToast(err.message || 'Failed to load shipping data', 'error');
            setShipments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    const setDraftField = (orderId, key, value) => {
        setDrafts(prev => ({
            ...prev,
            [orderId]: {
                ...(prev[orderId] || {}),
                [key]: value,
            },
        }));
    };

    const saveShipment = async (orderId, explicitPayload = null) => {
        const current = shipments.find(s => s.orderid === orderId);
        if (!current) return;

        const rowDraft = drafts[orderId] || {};
        const payload = explicitPayload || {
            label: rowDraft.label ?? current.label ?? 'Carrier',
            tracking_number: rowDraft.tracking_number ?? current.tracking_number ?? '',
            estimated_delivery: rowDraft.estimated_delivery === ''
                ? null
                : (rowDraft.estimated_delivery ?? (current.estimated_delivery ? toDateTimeLocalValue(current.estimated_delivery) : null)),
            shipping_status: rowDraft.shipping_status ?? current.shipping_status ?? 'processing',
        };

        setSavingOrderId(orderId);
        try {
            const updated = await apiCall(`/shipping/${orderId}`, { method: 'PUT' }, payload);
            setShipments(prev => prev.map(s => s.orderid === orderId ? updated : s));
            setDrafts(prev => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            });
            showToast('Shipping updated');
        } catch (err) {
            showToast(err.message || 'Failed to update shipping', 'error');
        } finally {
            setSavingOrderId(null);
        }
    };

    const updateStatus = async (orderId, status) => {
        setDraftField(orderId, 'shipping_status', status);
        await saveShipment(orderId, { shipping_status: status });
    };

    return (
        <AdminLayout title="Shipping">
            {loading ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <p className="text-muted">Loading shipping data...</p>
                </div>
            ) : shipments.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <p className="font-semibold">No shipping records found</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Order #</th><th>Carrier</th><th>Tracking #</th><th>Status</th><th>Created</th><th>Est. Delivery</th><th>Update</th></tr></thead>
                        <tbody>
                            {shipments.map(s => {
                                const rowDraft = drafts[s.orderid] || {};
                                const rowSaving = savingOrderId === s.orderid;
                                return (
                                    <tr key={s.orderid}>
                                        <td className="font-bold">#{s.orderid}</td>
                                        <td>
                                            <input
                                                className="form-input"
                                                style={{ minWidth: 120, padding: '6px 10px', fontSize: 12 }}
                                                value={rowDraft.label ?? (s.label || 'Carrier')}
                                                onChange={e => setDraftField(s.orderid, 'label', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className="form-input"
                                                style={{ minWidth: 160, padding: '6px 10px', fontSize: 12 }}
                                                placeholder="Enter tracking #"
                                                value={rowDraft.tracking_number ?? (s.tracking_number || '')}
                                                onChange={e => setDraftField(s.orderid, 'tracking_number', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <select className={`badge badge-${statusColors[(rowDraft.shipping_status ?? s.shipping_status)] || 'muted'}`}
                                                value={rowDraft.shipping_status ?? s.shipping_status ?? 'processing'}
                                                onChange={e => updateStatus(s.orderid, e.target.value)}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', color: 'inherit', fontWeight: 600, fontSize: 11 }}>
                                                {SHIPPING_STATUSES.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                                            </select>
                                        </td>
                                        <td className="text-sm text-muted">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <input
                                                type="datetime-local"
                                                className="form-input"
                                                style={{ minWidth: 180, padding: '6px 10px', fontSize: 12 }}
                                                value={rowDraft.estimated_delivery ?? (s.estimated_delivery ? toDateTimeLocalValue(s.estimated_delivery) : '')}
                                                onChange={e => setDraftField(s.orderid, 'estimated_delivery', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <button className="btn btn-outline btn-sm" onClick={() => saveShipment(s.orderid)} disabled={rowSaving}>
                                                {rowSaving ? 'Saving...' : 'Save'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminLayout>
    );
}
