import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { ArrowLeft, Package, Truck, CreditCard, MapPin, Check } from 'lucide-react';
import { apiCall } from '../../api/client';
import { useApp } from '../../context/AppContext';

const STATUS_OPTIONS = ['processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
const statusColors = { processing: 'info', shipped: 'warning', out_for_delivery: 'info', delivered: 'success', cancelled: 'error' };

export default function AdminOrderDetailPage() {
    const { id } = useParams();
    const { showToast } = useApp();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [savingStatus, setSavingStatus] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                // Admin fetches using the admin all-orders detail endpoint
                const data = await apiCall(`/orders/${id}`);
                setOrder(data);
                setSelectedStatus(data.status || 'processing');

                if (data.address_id) {
                    try {
                        const addrData = await apiCall(`/addresses/${data.address_id}/admin`);
                        setOrder(prev => ({ ...prev, address_data: addrData }));
                    } catch (e) {
                        // ignore address fetch errors
                    }
                }
            } catch (err) {
                setError(err.message || 'Failed to load order');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const handleUpdateStatus = async () => {
        setSavingStatus(true);
        try {
            await apiCall(`/orders/${id}/status`, { method: 'PUT' }, { status: selectedStatus });
            setOrder(prev => ({ ...prev, status: selectedStatus }));
            showToast(`Order status updated to "${selectedStatus}"`);
        } catch (err) {
            showToast(err.message || 'Failed to update status', 'error');
        } finally {
            setSavingStatus(false);
        }
    };

    if (loading) return (
        <AdminLayout title="Order Detail">
            <p className="text-muted text-center" style={{ padding: 'var(--sp-16) 0' }}>Loading…</p>
        </AdminLayout>
    );

    if (error || !order) return (
        <AdminLayout title="Order Detail">
            <div className="text-center" style={{ padding: 'var(--sp-16) 0' }}>
                <p className="font-semibold" style={{ marginBottom: 16 }}>{error || 'Order not found'}</p>
                <Link to="/admin/orders" className="btn btn-primary">← Back to Orders</Link>
            </div>
        </AdminLayout>
    );

    const totalPrice = Number(order.total_price) || 0;

    return (
        <AdminLayout title={`Order #${order.orderid}`}>
            <Link to="/admin/orders" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--sp-6)' }}>
                <ArrowLeft size={15} /> All Orders
            </Link>

            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-4" style={{ marginBottom: 'var(--sp-8)' }}>
                <div>
                    <h2 className="font-bold" style={{ fontSize: 20 }}>Order #{order.orderid}</h2>
                    <p className="text-sm text-muted">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        {' · '}Customer: <strong>User #{order.user_id}</strong>
                    </p>
                </div>
                <span className={`badge badge-${statusColors[order.status] || 'muted'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                    {order.status || 'processing'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--sp-6)', alignItems: 'start' }}>
                {/* LEFT col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                    {/* Items */}
                    <div className="card">
                        <div className="card-body">
                            <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)' }}>
                                <Package size={15} style={{ display: 'inline', marginRight: 6 }} />Items Ordered
                            </h3>
                            {!order.items || order.items.length === 0 ? (
                                <p className="text-muted text-sm">No items recorded.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: i < order.items.length - 1 ? 14 : 0, borderBottom: i < order.items.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
                                            {item.image
                                                ? <img src={item.image} alt={item.product_name} style={{ width: 56, height: 66, objectFit: 'cover', borderRadius: 'var(--r-md)', flexShrink: 0 }} />
                                                : <div style={{ width: 56, height: 66, borderRadius: 'var(--r-md)', background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Package size={20} color="var(--clr-text-3)" /></div>
                                            }
                                            <div style={{ flex: 1 }}>
                                                <div className="font-semibold text-sm">{item.product_name}</div>
                                                <div className="text-xs text-muted">{item.color}{item.size ? ` · Size ${item.size}` : ''}</div>
                                                <div className="text-xs text-muted">Qty: {item.quantity}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary text-sm">${(Number(item.unit_price) * item.quantity).toFixed(2)}</div>
                                                <div className="text-xs text-faint">${Number(item.unit_price).toFixed(2)} each</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '10px 18px', background: 'var(--clr-surface-2)', borderTop: '1px solid var(--clr-border)' }}>
                            <div className="flex justify-between font-bold">
                                <span>Order Total</span>
                                <span className="text-primary">${totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Update status  */}
                    <div className="card card-body">
                        <h3 className="font-bold" style={{ marginBottom: 14 }}>
                            <Truck size={15} style={{ display: 'inline', marginRight: 6 }} />Update Order Status
                        </h3>
                        <div className="flex gap-3 items-center flex-wrap">
                            <select
                                className="form-select"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                style={{ flex: 1, minWidth: 180 }}
                            >
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                                ))}
                            </select>
                            <button
                                className="btn btn-primary"
                                onClick={handleUpdateStatus}
                                disabled={savingStatus || selectedStatus === order.status}
                            >
                                <Check size={14} /> {savingStatus ? 'Saving…' : 'Save Status'}
                            </button>
                        </div>
                        <p className="text-xs text-faint" style={{ marginTop: 8 }}>
                            Current: <strong>{order.status || 'processing'}</strong>
                        </p>
                    </div>
                </div>

                {/* RIGHT col */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
                    {/* Payment */}
                    <div className="card card-body">
                        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                            <CreditCard size={15} color="var(--clr-primary)" />
                            <h3 className="font-bold">Payment</h3>
                        </div>
                        <p className="text-sm font-semibold">{order.payment || '—'}</p>
                    </div>

                    {/* Address */}
                    <div className="card card-body">
                        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                            <MapPin size={15} color="var(--clr-primary)" />
                            <h3 className="font-bold">Delivery Address</h3>
                        </div>
                        {order.address_data ? (
                            <div className="text-sm">
                                <div className="font-semibold" style={{ marginBottom: 4 }}>
                                    {order.address_data.title ? `${order.address_data.title} - ` : ''}
                                    {order.address_data.street}
                                </div>
                                <div className="text-muted">
                                    {order.address_data.city}, {order.address_data.country} {order.address_data.zip_code}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted">{order.address_id ? `Address #${order.address_id}` : 'No address recorded'}</p>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="card card-body">
                        <h3 className="font-bold" style={{ marginBottom: 10 }}>Summary</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span className="text-success">FREE</span></div>
                            {order.coupon_code && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted">Coupon Code</span>
                                    <span className="badge badge-primary" style={{ fontSize: 11, padding: '2px 6px', textTransform: 'uppercase' }}>{order.coupon_code}</span>
                                </div>
                            )}
                            <div className="divider" style={{ margin: '4px 0' }} />
                            <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">${totalPrice.toFixed(2)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
