import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error' };
const statusLabels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function OrdersPage() {
    const { orders } = useApp();
    const { user } = useAuth();
    const [filter, setFilter] = useState('all');

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Please sign in to view orders</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 860 }}>
                <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--sp-6)' }}>My Orders</h1>

                <div className="tabs" style={{ marginBottom: 'var(--sp-6)' }}>
                    {['all', 'processing', 'shipped', 'delivered'].map(s => (
                        <button key={s} className={`tab-btn${filter === s ? ' active' : ''}`} onClick={() => setFilter(s)}>
                            {s === 'all' ? 'All Orders' : statusLabels[s]}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                        <Package size={48} color="var(--clr-text-3)" style={{ margin: '0 auto 16px' }} />
                        <p className="font-semibold">No orders found</p>
                        <Link to="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Start Shopping</Link>
                    </div>
                ) : (
                    <div className="flex-col" style={{ gap: 'var(--sp-4)' }}>
                        {filtered.map(order => (
                            <Link to={`/orders/${order.orderID}`} key={order.orderID} className="order-card card animate-fadeIn" id={`order-${order.orderID}`}>
                                <div className="order-card__top">
                                    <div>
                                        <div className="text-xs text-faint uppercase" style={{ marginBottom: 2 }}>Order #{order.orderID}</div>
                                        <div className="font-semibold">{new Date(order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`badge badge-${statusColors[order.status] || 'muted'}`}>{statusLabels[order.status] || order.status}</span>
                                        <div className="text-right">
                                            <div className="font-bold text-primary">${order.total_price.toFixed(2)}</div>
                                            <div className="text-xs text-faint">{order.payment}</div>
                                        </div>
                                        <ChevronRight size={18} color="var(--clr-text-3)" />
                                    </div>
                                </div>
                                <div className="order-card__items">
                                    {order.items.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <img src={item.image} alt={item.product_name} style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />
                                            <div className="text-xs">
                                                <div className="font-medium">{item.product_name}</div>
                                                <div className="text-faint">{item.color} · {item.size} · ×{item.quantity}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && <div className="text-xs text-faint" style={{ alignSelf: 'flex-end' }}>+{order.items.length - 3} more</div>}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
            <style>{`
        .order-card { display: block; text-decoration: none; color: inherit; }
        .order-card:hover { border-color: var(--clr-primary); }
        .order-card__top { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-5); border-bottom: 1px solid var(--clr-border); }
        .order-card__items { display: flex; gap: var(--sp-4); padding: var(--sp-4) var(--sp-5); overflow-x: auto; flex-wrap: wrap; }
      `}</style>
        </div>
    );
}
