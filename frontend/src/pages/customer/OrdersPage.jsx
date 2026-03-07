import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api/client';

const STATUS_FILTERS = ['All', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
const STATUS_KEYS = ['all', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusColors = { processing: 'info', shipped: 'warning', out_for_delivery: 'info', delivered: 'success', cancelled: 'error' };

export default function OrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const load = async () => {
            try {
                const data = await apiCall('/orders/');
                setOrders(Array.isArray(data) ? data : []);
            } catch {
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user]);

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Please sign in to view orders</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const filtered = filter === 'all'
        ? orders
        : orders.filter(o => (o.status || 'processing') === filter);

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 860 }}>
                <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--sp-6)' }}>My Orders</h1>

                {/* ── Filter pills ── */}
                <div className="orders-filters" style={{ marginBottom: 'var(--sp-6)' }}>
                    {STATUS_FILTERS.map((label, i) => {
                        const key = STATUS_KEYS[i];
                        const count = key === 'all' ? orders.length
                            : orders.filter(o => (o.status || 'processing') === key).length;
                        return (
                            <button
                                key={key}
                                className={`filter-pill${filter === key ? ' active' : ''}`}
                                onClick={() => setFilter(key)}
                            >
                                {label}
                                {count > 0 && (
                                    <span className={`badge badge-${filter === key ? 'primary' : 'muted'}`} style={{ marginLeft: 6, fontSize: 10 }}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Orders list ── */}
                {loading ? (
                    <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                        <p className="text-muted">Loading your orders…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                        <Package size={48} color="var(--clr-text-3)" style={{ margin: '0 auto 16px' }} />
                        <p className="font-semibold" style={{ marginBottom: 8 }}>
                            {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
                        </p>
                        {filter === 'all' && (
                            <Link to="/products" className="btn btn-primary" style={{ marginTop: 8 }}>
                                Start Shopping
                            </Link>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                        {filtered.map(order => {
                            const status = order.status || 'processing';
                            const color = statusColors[status] || 'muted';
                            const date = order.order_date
                                ? new Date(order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                                : '—';
                            return (
                                <Link
                                    to={`/orders/${order.orderid}`}
                                    key={order.orderid}
                                    className="order-card card animate-fadeIn"
                                    id={`order-${order.orderid}`}
                                >
                                    <div className="order-card__top">
                                        <div>
                                            <div className="text-xs text-faint uppercase" style={{ marginBottom: 2 }}>
                                                Order #{order.orderid}
                                            </div>
                                            <div className="font-semibold">{date}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`badge badge-${color}`}>
                                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                                            </span>
                                            <div className="text-right">
                                                <div className="font-bold text-primary">
                                                    ${Number(order.total_price || 0).toFixed(2)}
                                                </div>
                                                <div className="text-xs text-faint">{order.payment || '—'}</div>
                                            </div>
                                            <ChevronRight size={18} color="var(--clr-text-3)" />
                                        </div>
                                    </div>
                                    <div className="order-card__footer">
                                        <span className="text-xs text-faint">Click to view order details</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
        .orders-filters { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-pill {
            padding: 6px 16px; border-radius: var(--r-full);
            border: 1px solid var(--clr-border);
            background: var(--clr-surface); color: var(--clr-text);
            font-size: 13px; font-weight: 500; cursor: pointer;
            transition: all 0.2s; display: flex; align-items: center;
        }
        .filter-pill:hover { border-color: var(--clr-primary); color: var(--clr-primary); }
        .filter-pill.active {
            background: var(--clr-primary); border-color: var(--clr-primary);
            color: #fff;
        }
        .order-card { display: block; text-decoration: none; color: inherit; cursor: pointer; }
        .order-card:hover { border-color: var(--clr-primary); }
        .order-card__top {
            display: flex; align-items: center; justify-content: space-between;
            padding: var(--sp-5); border-bottom: 1px solid var(--clr-border);
        }
        .order-card__footer { padding: 8px var(--sp-5); }
        @media (max-width: 600px) {
            .orders-filters { gap: 6px; }
            .filter-pill { padding: 5px 12px; font-size: 12px; }
            .order-card__top { flex-wrap: wrap; gap: 8px; }
        }
      `}</style>
        </div>
    );
}
