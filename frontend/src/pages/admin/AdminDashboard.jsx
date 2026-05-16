import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { ShoppingCart, Package, Users, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiCall } from '../../api/client';

const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error' };

export default function AdminDashboard() {
    const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, products: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const [orders, products] = await Promise.all([
                apiCall('/orders/all').catch(() => []),
                apiCall('/products/').catch(() => []),
            ]);
            const revenue = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
            const pending = orders.filter(o => o.status === 'processing').length;
            setStats({ revenue, orders: orders.length, pending, products: products.length });
            setRecentOrders(orders.slice(0, 5));
        } catch { /* ignore */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchStats(); }, []);

    const statCards = [
        { icon: DollarSign, label: 'Total Revenue', value: `$${stats.revenue.toFixed(2)}`, sub: 'All time', color: 'var(--clr-success)' },
        { icon: ShoppingCart, label: 'Total Orders', value: stats.orders, sub: `${stats.pending} pending`, color: 'var(--clr-primary)' },
        { icon: Package, label: 'Products', value: stats.products, sub: 'In catalog', color: 'var(--clr-warning)' },
        { icon: Users, label: 'Store Status', value: stats.products > 0 ? '🟢 Live' : '🟡 Setup', sub: stats.products > 0 ? 'Accepting orders' : 'Add products to start', color: 'var(--clr-info)' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="flex-col" style={{ gap: 'var(--sp-8)' }}>
                <div className="flex justify-end">
                    <button className="btn btn-outline btn-sm" onClick={fetchStats}><RefreshCw size={14} /> Refresh</button>
                </div>

                {/* KPIs */}
                <div className="grid-4 grid" style={{ gap: 'var(--sp-5)' }}>
                    {statCards.map(({ icon: Icon, label, value, sub, color }) => (
                        <div key={label} className="card card-body" style={{ borderLeft: `3px solid ${color}` }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
                                <span className="text-sm text-muted font-medium uppercase" style={{ letterSpacing: '0.06em', fontSize: 11 }}>{label}</span>
                                <Icon size={18} color={color} />
                            </div>
                            <div className="text-3xl font-bold" style={{ marginBottom: 4 }}>{loading ? '…' : value}</div>
                            <div className="text-xs text-faint">{sub}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="card card-body">
                    <h2 className="font-bold" style={{ marginBottom: 16 }}>Quick Actions</h2>
                    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                        <Link to="/admin/products" className="btn btn-primary"><Package size={15} /> Add Products</Link>
                        <Link to="/admin/homepage" className="btn btn-outline">🏠 Edit Homepage</Link>
                        <Link to="/admin/coupons" className="btn btn-outline">🏷️ Manage Coupons</Link>
                        <Link to="/admin/orders" className="btn btn-outline">📦 View Orders</Link>
                    </div>
                </div>

                {/* Recent orders */}
                {recentOrders.length > 0 && (
                    <div className="card">
                        <div className="flex items-center justify-between" style={{ padding: 'var(--sp-5) var(--sp-6)', borderBottom: '1px solid var(--clr-border)' }}>
                            <h2 className="font-bold">Recent Orders</h2>
                            <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All</Link>
                        </div>
                        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead><tr><th>Order #</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                                <tbody>
                                    {recentOrders.map(o => (
                                        <tr key={o.orderid}>
                                            <td className="font-semibold">#{o.orderid}</td>
                                            <td className="text-sm text-muted">{new Date(o.order_date).toLocaleDateString()}</td>
                                            <td className="text-primary font-bold">${Number(o.total_price).toFixed(2)}</td>
                                            <td><span className={`badge badge-${statusColors[o.status] || 'muted'}`}>{o.status}</span></td>
                                            <td><Link to={`/orders/${o.orderid}`} className="btn btn-ghost btn-sm">View</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!loading && recentOrders.length === 0 && (
                    <div className="card card-body text-center" style={{ padding: 'var(--sp-12) 0' }}>
                        <p className="text-2xl" style={{ marginBottom: 12 }}>🛍️</p>
                        <p className="font-semibold">No orders yet</p>
                        <p className="text-muted text-sm" style={{ marginTop: 6 }}>Orders will appear here when customers start buying</p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
