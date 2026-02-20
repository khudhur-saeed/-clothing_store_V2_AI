import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useApp } from '../../context/AppContext';

const SHIPPING_STATUSES = ['processing', 'shipped', 'out_for_delivery', 'delivered'];
const statusColors = { processing: 'info', shipped: 'warning', out_for_delivery: 'info', delivered: 'success' };

export default function AdminShippingPage() {
    const { orders } = useApp();
    const [shipments, setShipments] = useState(
        orders.map(o => ({ orderId: o.orderID, ...o.shipping, total: o.total_price }))
    );
    const [tracking, setTracking] = useState({});

    const updateStatus = (orderId, status) => setShipments(prev => prev.map(s => s.orderId === orderId ? { ...s, shipping_status: status } : s));
    const saveTracking = (orderId) => {
        setShipments(prev => prev.map(s => s.orderId === orderId ? { ...s, tracking: tracking[orderId] || s.tracking, label: s.label || 'Carrier' } : s));
        delete tracking[orderId];
    };

    return (
        <AdminLayout title="Shipping">
            <div className="table-wrap">
                <table>
                    <thead><tr><th>Order #</th><th>Carrier</th><th>Tracking #</th><th>Status</th><th>Created</th><th>Est. Delivery</th><th>Update</th></tr></thead>
                    <tbody>
                        {shipments.map(s => (
                            <tr key={s.orderId}>
                                <td className="font-bold">#{s.orderId}</td>
                                <td>{s.label || <span className="text-faint">—</span>}</td>
                                <td>
                                    <div className="flex gap-2 items-center">
                                        <input className="form-input" style={{ minWidth: 160, padding: '6px 10px', fontSize: 12 }} placeholder="Enter tracking #"
                                            defaultValue={s.tracking || ''} onChange={e => setTracking(t => ({ ...t, [s.orderId]: e.target.value }))} />
                                        <button className="btn btn-outline btn-sm" onClick={() => saveTracking(s.orderId)}>Save</button>
                                    </div>
                                </td>
                                <td>
                                    <select className={`badge badge-${statusColors[s.shipping_status] || 'muted'}`}
                                        value={s.shipping_status} onChange={e => updateStatus(s.orderId, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', color: 'inherit', fontWeight: 600, fontSize: 11 }}>
                                        {SHIPPING_STATUSES.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </td>
                                <td className="text-sm text-muted">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</td>
                                <td className="text-sm text-muted">{s.estimated_delivery || '—'}</td>
                                <td>{s.shipping_status === 'delivered' ? <span className="text-success text-sm">✓ Delivered</span> : <span className="text-faint text-sm">Pending</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
