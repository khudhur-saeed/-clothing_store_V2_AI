import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, MapPin, CreditCard, FileText, ArrowLeft } from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

const trackingSteps = [
    { key: 'processing', label: 'Order Placed', desc: 'Your order is being processed' },
    { key: 'shipped', label: 'Shipped', desc: 'Your order is on the way' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Your order is out for delivery' },
    { key: 'delivered', label: 'Delivered', desc: 'Your order has been delivered' },
];
const shippingOrder = ['processing', 'shipped', 'out_for_delivery', 'delivered'];
const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error' };
const statusLabels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function OrderDetailPage() {
    const { id } = useParams();
    const { addresses } = useApp();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await apiCall(`/orders/${id}`);
                setOrder(data);
            } catch (err) {
                setError(err.message || 'Failed to load order');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="text-2xl">Loading order…</p>
        </div>
    );

    if (error || !order) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <Package size={48} color="var(--clr-text-3)" style={{ margin: '0 auto 16px' }} />
            <p className="font-semibold" style={{ marginBottom: 8 }}>{error || 'Order not found'}</p>
            <Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>My Orders</Link>
        </div>
    );

    const trackIdx = shippingOrder.indexOf(order.status || 'processing');
    const activeTrkIdx = trackIdx === -1 ? 0 : trackIdx;
    const totalPrice = Number(order.total_price) || 0;
    const subtotal = order.items ? order.items.reduce((sum, item) => sum + (Number(item.unit_price) * item.quantity), 0) : 0;
    const discount = subtotal - totalPrice;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 920 }}>
                <Link to="/orders" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-6)' }}>
                    <ArrowLeft size={15} /> All Orders
                </Link>

                <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 'var(--sp-8)' }}>
                    <div>
                        <h1 className="text-2xl font-bold">Order #{order.orderid}</h1>
                        <p className="text-sm text-muted">
                            {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`badge badge-${statusColors[order.status] || 'muted'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                            {statusLabels[order.status] || order.status || 'Processing'}
                        </span>
                        <Link to={`/orders/${order.orderid}/invoice`} className="btn btn-outline btn-sm" id="view-invoice-btn">
                            <FileText size={14} /> Invoice
                        </Link>
                    </div>
                </div>

                <div className="detail-grid">
                    <div className="flex-col" style={{ gap: 'var(--sp-6)' }}>
                        {/* Items */}
                        <div className="card">
                            <div className="card-body" style={{ paddingBottom: 'var(--sp-3)' }}>
                                <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)' }}>Items Ordered</h3>
                                {(!order.items || order.items.length === 0) ? (
                                    <p className="text-muted text-sm">No items found for this order.</p>
                                ) : order.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', paddingBottom: 'var(--sp-4)', borderBottom: i < order.items.length - 1 ? '1px solid var(--clr-border)' : 'none', marginBottom: i < order.items.length - 1 ? 'var(--sp-4)' : 0 }}>
                                        {item.image
                                            ? <img src={item.image} alt={item.product_name} style={{ width: 64, height: 76, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
                                            : <div style={{ width: 64, height: 76, borderRadius: 'var(--r-md)', background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={22} color="var(--clr-text-3)" /></div>
                                        }
                                        <div style={{ flex: 1 }}>
                                            <Link to={`/products/${item.product_id}`} className="font-semibold">{item.product_name}</Link>
                                            <div className="text-sm text-muted">{item.color}{item.size ? ` · Size ${item.size}` : ''}</div>
                                            <div className="text-sm">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-primary">${(Number(item.unit_price) * item.quantity).toFixed(2)}</div>
                                            <div className="text-xs text-faint">${Number(item.unit_price).toFixed(2)} each</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: 'var(--sp-4) var(--sp-6)', background: 'var(--clr-bg-3)', borderTop: '1px solid var(--clr-border)' }}>
                                <div className="flex justify-between font-bold">
                                    <span>Total</span><span className="text-primary">${totalPrice.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping tracking */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
                                <Truck size={18} color="var(--clr-primary)" />
                                <h3 className="font-bold">Shipping Tracking</h3>
                            </div>
                            <div className="timeline">
                                {trackingSteps.map((step, i) => {
                                    const isDone = i <= activeTrkIdx;
                                    const isActive = i === activeTrkIdx;
                                    return (
                                        <div key={step.key} className="timeline-item">
                                            <div className="timeline-line">
                                                <div className={`timeline-dot${isDone ? ' done' : ''}${isActive ? ' active' : ''}`} />
                                                {i < trackingSteps.length - 1 && <div className={`timeline-connector${isDone ? ' done' : ''}`} />}
                                            </div>
                                            <div className="timeline-content">
                                                <h4 style={{ color: isDone ? 'var(--clr-text)' : 'var(--clr-text-3)' }}>{step.label}</h4>
                                                <p>{isDone ? step.desc : '—'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex-col" style={{ gap: 'var(--sp-6)' }}>
                        {/* Delivery address */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-4)' }}>
                                <MapPin size={16} color="var(--clr-primary)" />
                                <h3 className="font-bold">Delivery Address</h3>
                            </div>
                            <div className="text-sm">
                                {(() => {
                                    if (!order.address_id) return <span className="text-muted">No address recorded</span>;
                                    const addr = addresses.find(a => a.address_id === order.address_id);
                                    if (addr) {
                                        return (
                                            <>
                                                <div className="font-semibold" style={{ display: 'block', color: 'var(--clr-text)', marginBottom: 4 }}>
                                                    {addr.title ? `${addr.title} - ` : ''}{addr.street}
                                                </div>
                                                <div className="text-muted">
                                                    {addr.city}, {addr.country} {addr.zip_code}
                                                </div>
                                            </>
                                        );
                                    }
                                    return <span className="text-muted">Address #{order.address_id}</span>;
                                })()}
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-4)' }}>
                                <CreditCard size={16} color="var(--clr-primary)" />
                                <h3 className="font-bold">Payment</h3>
                            </div>
                            <p className="text-sm font-semibold">{order.payment || '—'}</p>
                        </div>

                        {/* Summary */}
                        <div className="card card-body">
                            <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)' }}>Summary</h3>
                            <div className="flex-col" style={{ gap: 8 }}>
                                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span className="text-success">FREE</span></div>
                                {order.coupon_code && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">Discount ({order.coupon_code.toUpperCase()})</span>
                                        <span className="text-primary">{discount > 0 ? `-$${discount.toFixed(2)}` : '$0.00'}</span>
                                    </div>
                                )}
                                <div className="divider" style={{ margin: '4px 0' }} />
                                <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">${totalPrice.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .detail-grid { display: grid; grid-template-columns: 1fr 300px; gap: var(--sp-6); align-items: start; }
        .timeline { display: flex; flex-direction: column; gap: 0; }
        .timeline-item { display: flex; gap: var(--sp-4); }
        .timeline-line { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
        .timeline-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--clr-border); background: var(--clr-surface); flex-shrink: 0; }
        .timeline-dot.done { border-color: var(--clr-primary); background: var(--clr-primary); }
        .timeline-dot.active { box-shadow: 0 0 0 4px rgba(99,102,241,0.2); }
        .timeline-connector { width: 2px; flex: 1; min-height: 28px; background: var(--clr-border); margin: 3px 0; }
        .timeline-connector.done { background: var(--clr-primary); }
        .timeline-content { padding-bottom: var(--sp-5); }
        .timeline-content h4 { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
        .timeline-content p { font-size: 12px; color: var(--clr-text-3); }
        @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
