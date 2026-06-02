import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Link } from 'react-router-dom';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

const STATUS_OPTIONS = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error', out_for_delivery: 'info' };

export default function AdminOrdersPage() {
    const { showToast } = useApp();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await apiCall('/orders/all');
            setOrders(data);
        } catch (err) {
            showToast('Failed to load orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const updateStatus = async (orderId, status) => {
        try {
            await apiCall(`/orders/${orderId}/status`, { method: 'PUT' }, { status });
            setOrders(prev => prev.map(o => o.orderid === orderId ? { ...o, status } : o));
            showToast('Order status updated');
        } catch (err) {
            showToast(err.message || 'Failed to update status', 'error');
        }
    };

    return (
        <AdminLayout title="Orders">
            <div className="tabs" style={{ marginBottom: 'var(--sp-6)' }}>
                {['all', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <button key={s} className={`tab-btn${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                        {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && <span className="badge badge-muted" style={{ marginLeft: 6 }}>{orders.filter(o => o.status === s).length}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <p className="text-muted">Loading orders…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <p className="font-semibold">No orders found</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>Order #</th><th>Date</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {filtered.map(o => (
                                <tr key={o.orderid}>
                                    <td className="font-bold">#{o.orderid}</td>
                                    <td className="text-sm text-muted">{o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}</td>
                                    <td className="text-sm">User #{o.user_id}</td>
                                    <td className="text-primary font-bold">${Number(o.total_price || 0).toFixed(2)}</td>
                                    <td className="text-sm">{o.payment || '—'}</td>
                                    <td>
                                        <select
                                            className={`badge badge-${statusColors[o.status] || 'muted'}`}
                                            value={o.status || 'processing'}
                                            onChange={e => updateStatus(o.orderid, e.target.value)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                color: 'inherit',
                                                fontWeight: 600,
                                                fontSize: 11,
                                                colorScheme: 'dark',
                                            }}
                                        >
                                            {STATUS_OPTIONS.map(s => (
                                                <option
                                                    key={s}
                                                    value={s}
                                                    style={{ background: '#1f1f38', color: '#f0eeff', fontWeight: 500 }}
                                                >
                                                    {s.replace(/_/g, ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td>
                                        <Link to={`/admin/orders/${o.orderid}`} className="btn btn-outline btn-sm">View</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminLayout>
    );
}
