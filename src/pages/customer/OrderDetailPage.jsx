import { useParams, Link } from 'react-router-dom';
import { Package, Truck, MapPin, CreditCard, FileText, ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const trackingSteps = [
    { key: 'processing', label: 'Order Placed', desc: 'Your order is being processed' },
    { key: 'shipped', label: 'Shipped', desc: 'Your order is on the way' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Your order is out for delivery' },
    { key: 'delivered', label: 'Delivered', desc: 'Your order has been delivered' },
];

const shippingOrder = ['processing', 'shipped', 'out_for_delivery', 'delivered'];

function getTrackingIdx(status) {
    const idx = shippingOrder.indexOf(status);
    return idx === -1 ? 0 : idx;
}

const statusColors = { processing: 'info', shipped: 'warning', delivered: 'success', cancelled: 'error' };
const statusLabels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export default function OrderDetailPage() {
    const { id } = useParams();
    const { orders } = useApp();
    const order = orders.find(o => o.orderID === Number(id));

    if (!order) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="font-semibold">Order not found</p>
            <Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>My Orders</Link>
        </div>
    );

    const trackIdx = getTrackingIdx(order.shipping?.shipping_status || 'processing');

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 920 }}>
                <Link to="/orders" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-6)' }}><ArrowLeft size={15} /> All Orders</Link>

                <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 'var(--sp-8)' }}>
                    <div>
                        <h1 className="text-2xl font-bold">Order #{order.orderID}</h1>
                        <p className="text-sm text-muted">{new Date(order.order_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`badge badge-${statusColors[order.status] || 'muted'}`} style={{ fontSize: 13, padding: '6px 14px' }}>{statusLabels[order.status] || order.status}</span>
                        <Link to={`/orders/${order.orderID}/invoice`} className="btn btn-outline btn-sm" id="view-invoice-btn"><FileText size={14} /> Invoice</Link>
                    </div>
                </div>

                <div className="detail-grid">
                    <div className="flex-col" style={{ gap: 'var(--sp-6)' }}>
                        {/* Items */}
                        <div className="card">
                            <div className="card-body" style={{ paddingBottom: 'var(--sp-3)' }}>
                                <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)' }}>Items Ordered</h3>
                                {order.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', paddingBottom: 'var(--sp-4)', borderBottom: i < order.items.length - 1 ? '1px solid var(--clr-border)' : 'none', marginBottom: i < order.items.length - 1 ? 'var(--sp-4)' : 0 }}>
                                        <img src={item.image} alt={item.product_name} style={{ width: 64, height: 76, objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
                                        <div style={{ flex: 1 }}>
                                            <Link to={`/products/${item.product_id}`} className="font-semibold">{item.product_name}</Link>
                                            <div className="text-sm text-muted">{item.color} · Size {item.size}</div>
                                            <div className="text-sm">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-primary">${(item.unit_price * item.quantity).toFixed(2)}</div>
                                            <div className="text-xs text-faint">${item.unit_price.toFixed(2)} each</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: 'var(--sp-4) var(--sp-6)', background: 'var(--clr-bg-3)', borderTop: '1px solid var(--clr-border)' }}>
                                <div className="flex justify-between font-bold">
                                    <span>Total</span><span className="text-primary">${order.total_price.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping tracking */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
                                <Truck size={18} color="var(--clr-primary)" />
                                <h3 className="font-bold">Shipping Tracking</h3>
                                {order.shipping?.tracking && (
                                    <span className="text-sm text-faint" style={{ marginLeft: 'auto' }}>Track: <strong>{order.shipping.tracking}</strong></span>
                                )}
                            </div>
                            <div className="timeline">
                                {trackingSteps.map((step, i) => {
                                    const isDone = i <= trackIdx;
                                    const isActive = i === trackIdx;
                                    const showLine = i < trackingSteps.length - 1;
                                    return (
                                        <div key={step.key} className="timeline-item">
                                            <div className="timeline-line">
                                                <div className={`timeline-dot${isDone ? ' done' : ''}${isActive ? ' active' : ''}`} />
                                                {showLine && <div className={`timeline-connector${isDone ? ' done' : ''}`} />}
                                            </div>
                                            <div className="timeline-content">
                                                <h4 style={{ color: isDone ? 'var(--clr-text)' : 'var(--clr-text-3)' }}>{step.label}</h4>
                                                <p>{isDone ? step.desc : '—'}</p>
                                                {isActive && order.shipping?.created_at && <p className="text-info text-xs" style={{ marginTop: 2 }}>{new Date(order.shipping.created_at).toLocaleDateString()}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {order.shipping?.label && <p className="text-sm text-muted" style={{ marginTop: 'var(--sp-4)' }}><strong>Carrier:</strong> {order.shipping.label}</p>}
                        </div>
                    </div>

                    <div className="flex-col" style={{ gap: 'var(--sp-6)' }}>
                        {/* Delivery address */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-4)' }}>
                                <MapPin size={16} color="var(--clr-primary)" />
                                <h3 className="font-bold">Delivery Address</h3>
                            </div>
                            {/* Using order.address_id to look up in global addresses - simplified */}
                            <p className="text-sm font-semibold">25 Fashion Boulevard, Apt 4B</p>
                            <p className="text-sm text-muted">Istanbul, Turkey 34000</p>
                        </div>
                        {/* Payment */}
                        <div className="card card-body">
                            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-4)' }}>
                                <CreditCard size={16} color="var(--clr-primary)" />
                                <h3 className="font-bold">Payment</h3>
                            </div>
                            <p className="text-sm font-semibold">{order.payment}</p>
                            <span className={`badge badge-${order.payment_status === 'completed' ? 'success' : 'warning'}`} style={{ marginTop: 8 }}>
                                {order.payment_status}
                            </span>
                        </div>
                        {/* Order summary */}
                        <div className="card card-body">
                            <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)' }}>Summary</h3>
                            <div className="flex-col" style={{ gap: 8 }}>
                                <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${order.total_price.toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span className="text-success">FREE</span></div>
                                <div className="divider" style={{ margin: '4px 0' }} />
                                <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">${order.total_price.toFixed(2)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        .detail-grid { display: grid; grid-template-columns: 1fr 300px; gap: var(--sp-6); align-items: start; }
        @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
