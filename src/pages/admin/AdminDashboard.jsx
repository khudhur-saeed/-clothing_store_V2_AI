import AdminLayout from '../../components/layout/AdminLayout';
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { mockProducts } from '../../data/mockData';
import { Link } from 'react-router-dom';

const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success' };

export default function AdminDashboard() {
    const { orders } = useApp();
    const totalRevenue = orders.reduce((s, o) => s + o.total_price, 0);
    const pending = orders.filter(o => o.status === 'processing').length;
    const lowStock = mockProducts.filter(p => p.variants.some(v => v.stock < 5));

    const stats = [
        { icon: DollarSign, label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, sub: 'All time', color: 'var(--clr-success)' },
        { icon: ShoppingCart, label: 'Total Orders', value: orders.length, sub: `${pending} pending`, color: 'var(--clr-primary)' },
        { icon: Package, label: 'Products', value: mockProducts.length, sub: `${lowStock.length} low stock`, color: 'var(--clr-warning)' },
        { icon: Users, label: 'Customers', value: '128', sub: '12 new this week', color: 'var(--clr-info)' },
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="flex-col" style={{ gap: 'var(--sp-8)' }}>
                {/* KPIs */}
                <div className="grid-4 grid" style={{ gap: 'var(--sp-5)' }}>
                    {stats.map(({ icon: Icon, label, value, sub, color }) => (
                        <div key={label} className="card card-body" style={{ borderLeft: `3px solid ${color}` }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
                                <span className="text-sm text-muted font-medium uppercase" style={{ letterSpacing: '0.06em', fontSize: 11 }}>{label}</span>
                                <Icon size={18} color={color} />
                            </div>
                            <div className="text-3xl font-bold" style={{ marginBottom: 4 }}>{value}</div>
                            <div className="text-xs text-faint">{sub}</div>
                        </div>
                    ))}
                </div>

                {/* Recent orders */}
                <div className="card">
                    <div className="flex items-center justify-between" style={{ padding: 'var(--sp-5) var(--sp-6)', borderBottom: '1px solid var(--clr-border)' }}>
                        <h2 className="font-bold">Recent Orders</h2>
                        <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All</Link>
                    </div>
                    <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {orders.slice(0, 5).map(o => (
                                    <tr key={o.orderID}>
                                        <td className="font-semibold">#{o.orderID}</td>
                                        <td className="text-sm text-muted">{new Date(o.order_date).toLocaleDateString()}</td>
                                        <td>{o.items.length} items</td>
                                        <td className="text-primary font-bold">${o.total_price.toFixed(2)}</td>
                                        <td><span className={`badge badge-${statusColors[o.status] || 'muted'}`}>{o.status}</span></td>
                                        <td><Link to={`/orders/${o.orderID}`} className="btn btn-ghost btn-sm">View</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Low stock */}
                {lowStock.length > 0 && (
                    <div className="card">
                        <div className="flex items-center gap-2" style={{ padding: 'var(--sp-5) var(--sp-6)', borderBottom: '1px solid var(--clr-border)' }}>
                            <AlertCircle size={18} color="var(--clr-warning)" />
                            <h2 className="font-bold">Low Stock Alert</h2>
                            <span className="badge badge-warning" style={{ marginLeft: 'auto' }}>{lowStock.length} products</span>
                        </div>
                        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead><tr><th>Product</th><th>Category</th><th>Piece Type</th><th>Min Stock</th></tr></thead>
                                <tbody>
                                    {lowStock.map(p => (
                                        <tr key={p.id}>
                                            <td className="font-medium">{p.name}</td>
                                            <td>{p.category}</td>
                                            <td><span className="badge badge-muted">{p.piece_type}</span></td>
                                            <td><span className="text-warning font-bold">{Math.min(...p.variants.map(v => v.stock))}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
