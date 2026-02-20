import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Tag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { mockCoupons } from '../../data/mockData';
import { useState } from 'react';

export default function CartPage() {
    const { cartItems, removeFromCart, updateQty, cartTotal, clearCart } = useCart();
    const [couponInput, setCouponInput] = useState('');
    const [coupon, setCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const navigate = useNavigate();

    const applyCoupon = () => {
        const found = mockCoupons.find(c => c.coupon_code === couponInput.toUpperCase() && c.is_active);
        if (!found) { setCouponError('Invalid or expired coupon code.'); return; }
        if (found.expiration_date < new Date().toISOString().split('T')[0]) { setCouponError('This coupon has expired.'); return; }
        if (cartTotal < found.min_order_amount) { setCouponError(`Minimum order $${found.min_order_amount} required.`); return; }
        setCoupon(found); setCouponError('');
    };

    const discount = coupon ? (cartTotal * coupon.discount / 100) : 0;
    const shipping = cartTotal > 150 ? 0 : 9.99;
    const total = cartTotal - discount + shipping;

    if (cartItems.length === 0) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🛍️</div>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Your cart is empty</h2>
            <p className="text-muted">Add some beautiful pieces to get started</p>
            <Link to="/products" className="btn btn-primary btn-lg" style={{ marginTop: 28 }}>Start Shopping <ArrowRight size={18} /></Link>
        </div>
    );

    return (
        <div className="page">
            <div className="container">
                <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--sp-8)' }}>Shopping Cart <span className="badge badge-primary" style={{ fontSize: 14, verticalAlign: 'middle' }}>{cartItems.length} items</span></h1>
                <div className="cart-grid">
                    {/* Items */}
                    <div>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>Product</th><th>Variant</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
                                <tbody>
                                    {cartItems.map(item => (
                                        <tr key={item.variantId}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <img src={item.image} alt={item.productName} style={{ width: 60, height: 72, objectFit: 'cover', borderRadius: 'var(--r-md)' }} />
                                                    <div>
                                                        <Link to={`/products/${item.productId}`} className="font-semibold text-sm hover-primary">{item.productName}</Link>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="text-sm text-muted">{item.color} / {item.size}</span></td>
                                            <td><span className="text-primary font-semibold">${item.price.toFixed(2)}</span></td>
                                            <td>
                                                <div className="qty-stepper">
                                                    <button onClick={() => updateQty(item.variantId, item.quantity - 1)}>–</button>
                                                    <span>{item.quantity}</span>
                                                    <button onClick={() => updateQty(item.variantId, item.quantity + 1)}>+</button>
                                                </div>
                                            </td>
                                            <td><span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span></td>
                                            <td>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeFromCart(item.variantId)} aria-label="Remove">
                                                    <Trash2 size={15} color="var(--clr-error)" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }} onClick={clearCart}>Clear Cart</button>
                    </div>

                    {/* Summary */}
                    <div>
                        <div className="card card-body flex-col" style={{ gap: 'var(--sp-4)', position: 'sticky', top: 'calc(var(--header-h) + 16px)' }}>
                            <h3 className="font-bold text-lg">Order Summary</h3>
                            <div className="divider" style={{ margin: '4px 0' }} />

                            {/* Coupon */}
                            <div className="form-group">
                                <label className="form-label"><Tag size={13} /> Coupon Code</label>
                                <div className="flex gap-2">
                                    <input className="form-input" placeholder="e.g. SAVE10" value={couponInput} onChange={e => setCouponInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && applyCoupon()} id="coupon-input" />
                                    <button className="btn btn-outline" onClick={applyCoupon} id="apply-coupon">Apply</button>
                                </div>
                                {couponError && <p className="text-error text-xs" style={{ marginTop: 4 }}>{couponError}</p>}
                                {coupon && (
                                    <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                                        <span className="badge badge-success"><Tag size={11} /> {coupon.coupon_code} ({coupon.discount}% off)</span>
                                        <button onClick={() => { setCoupon(null); setCouponInput(''); }}><X size={14} /></button>
                                    </div>
                                )}
                            </div>

                            <div className="divider" style={{ margin: '4px 0' }} />
                            <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span className="font-semibold">${cartTotal.toFixed(2)}</span></div>
                            {discount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount ({coupon.discount}%)</span><span>-${discount.toFixed(2)}</span></div>}
                            <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span className={shipping === 0 ? 'text-success font-semibold' : 'font-semibold'}>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span></div>
                            {shipping > 0 && <p className="text-xs text-faint">Add ${(150 - cartTotal).toFixed(2)} more for free shipping</p>}
                            <div className="divider" style={{ margin: '4px 0' }} />
                            <div className="flex justify-between"><span className="font-bold text-lg">Total</span><span className="font-bold text-xl text-primary">${total.toFixed(2)}</span></div>

                            <button id="checkout-btn" className="btn btn-primary btn-lg w-full" style={{ marginTop: 8 }} onClick={() => navigate('/checkout')}>
                                Proceed to Checkout <ArrowRight size={18} />
                            </button>
                            <Link to="/products" className="btn btn-ghost w-full text-center text-sm">Continue Shopping</Link>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
        .cart-grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-8); align-items: start; }
        .hover-primary:hover { color: var(--clr-primary); }
        @media (max-width: 900px) { .cart-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
