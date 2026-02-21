import { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';

const STATUS_OPTIONS = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error', out_for_delivery: 'info' };

export default function AdminOrdersPage() {
    const { orders } = useApp();
    const [localOrders, setLocalOrders] = useState(orders);
    const [filter, setFilter] = useState('all');

    const filtered = filter === 'all' ? localOrders : localOrders.filter(o => o.status === filter);

    const updateStatus = (orderId, status) => {
        setLocalOrders(prev => prev.map(o => o.orderID === orderId ? { ...o, status } : o));
    };

    return (
        <AdminLayout title="Orders">
            <div className="tabs" style={{ marginBottom: 'var(--sp-6)' }}>
                {['all', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <button key={s} className={`tab-btn${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{localOrders.filter(o => o.status === s).length}</span>}
                    </button>
                ))}
            </div>

            <div className="table-wrap">
                <table>
                    <thead><tr><th>Order #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {filtered.map(o => (
                            <tr key={o.orderID}>
                                <td className="font-bold">#{o.orderID}</td>
                                <td className="text-sm text-muted">{new Date(o.order_date).toLocaleDateString()}</td>
                                <td className="text-sm">User #{o.user_id}</td>
                                <td>{o.items.length} items</td>
                                <td className="text-primary font-bold">${o.total_price.toFixed(2)}</td>
                                <td className="text-sm">{o.payment}</td>
                                <td>
                                    <select className={`badge badge-${statusColors[o.status] || 'muted'}`}
                                        value={o.status} onChange={e => updateStatus(o.orderID, e.target.value)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', color: 'inherit', fontWeight: 600, fontSize: 11 }}>
                                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                                <td>
                                    <Link to={`/orders/${o.orderID}`} className="btn btn-outline btn-sm">View</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
