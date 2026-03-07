import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Plus, MapPin, CreditCard, Banknote, Truck, ChevronRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api/client';

const STEPS = ['Delivery', 'Payment', 'Review'];

export default function CheckoutPage() {
    const { cartItems, cartTotal, clearCart } = useCart();
    const { addresses, addAddress, placeOrder, showToast } = useApp();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(0);
    const [selectedAddr, setSelectedAddr] = useState(addresses.find(a => a.is_default)?.address_id || addresses[0]?.address_id);
    const [payMethod, setPayMethod] = useState('Credit Card');
    const [couponCode, setCouponCode] = useState('');
    const [coupon, setCoupon] = useState(null);
    const [couponErr, setCouponErr] = useState('');
    const [newAddr, setNewAddr] = useState({ street: '', city: '', country: 'Turkey', zip_code: '', is_default: false });
    const [addingAddr, setAddingAddr] = useState(false);
    const [placed, setPlaced] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-16)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Please sign in to checkout</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const discount = coupon ? (cartTotal * coupon.discount / 100) : 0;
    const shipping = cartTotal > 150 ? 0 : 9.99;
    const total = cartTotal - discount + shipping;
    const addrObj = addresses.find(a => a.address_id === selectedAddr);

    const applyCoupon = async () => {
        try {
            const found = await apiCall('/coupons/validate', {}, { code: couponCode.toUpperCase(), order_amount: cartTotal });
            setCoupon(found); setCouponErr('');
            showToast(`Coupon applied! ${found.discount}% off`);
        } catch (err) { setCouponErr(err.message || 'Invalid coupon.'); }
    };

    const handleSaveAddr = () => {
        if (!newAddr.street || !newAddr.city) return;
        addAddress(newAddr); setAddingAddr(false);
    };

    const handlePlaceOrder = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1200));
        try {
            const result = await placeOrder({
                address_id: selectedAddr,
                payment: payMethod,
                coupon_code: coupon?.coupon_code || null,
            });
            clearCart();
            setPlaced(result);
        } catch (err) {
            showToast(err.message || 'Failed to place order', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (placed) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', border: '2px solid var(--clr-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Check size={36} color="var(--clr-success)" />
            </div>
            <h1 className="text-3xl font-bold" style={{ marginBottom: 8 }}>Order Confirmed! 🎉</h1>
            <p className="text-muted" style={{ marginBottom: 4 }}>Thank you for your purchase.</p>
            <p className="text-primary font-semibold">Order #{placed.order_id}</p>
            <div className="flex gap-4 justify-center" style={{ marginTop: 32, flexWrap: 'wrap' }}>
                <Link to={`/orders/${placed.order_id}`} className="btn btn-primary btn-lg">View Order <ChevronRight size={18} /></Link>
                <Link to="/products" className="btn btn-outline btn-lg">Continue Shopping</Link>
            </div>
        </div>
    );

    const OrderSummary = () => (
        <div className="card card-body flex-col" style={{ gap: 'var(--sp-4)' }}>
            <h3 className="font-bold">Order Summary</h3>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cartItems.map(i => (
                    <div key={i.variantId} className="flex items-center gap-3">
                        <img src={i.image} alt={i.productName} style={{ width: 48, height: 58, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />
                        <div style={{ flex: 1 }}>
                            <div className="text-sm font-medium">{i.productName}</div>
                            <div className="text-xs text-faint">{i.color} · {i.size} · ×{i.quantity}</div>
                        </div>
                        <span className="text-sm font-semibold">${(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                ))}
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span>{shipping === 0 ? <span className="text-success">FREE</span> : `$${shipping.toFixed(2)}`}</span></div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="flex justify-between"><span className="font-bold">Total</span><span className="font-bold text-xl text-primary">${total.toFixed(2)}</span></div>
        </div>
    );

    return (
        <div className="page">
            <div className="container">
                <h1 className="text-3xl font-bold" style={{ marginBottom: 'var(--sp-8)' }}>Checkout</h1>

                {/* Step bar */}
                <div className="step-bar">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`step-item${i <= step ? ' done' : ''}${i === step ? ' active' : ''}`}>
                            <div className="step-num">{i < step ? <Check size={14} /> : i + 1}</div>
                            <span>{s}</span>
                            {i < STEPS.length - 1 && <div className="step-connector" />}
                        </div>
                    ))}
                </div>

                <div className="checkout-grid">
                    <div>
                        {/* Step 0: Delivery */}
                        {step === 0 && (
                            <div className="animate-slideUp">
                                <h2 className="text-xl font-bold" style={{ marginBottom: 'var(--sp-6)' }}>Delivery Address</h2>
                                {addresses.map(a => (
                                    <label key={a.address_id} className={`addr-option${selectedAddr === a.address_id ? ' active' : ''}`}>
                                        <input type="radio" name="addr" value={a.address_id} checked={selectedAddr === a.address_id} onChange={() => setSelectedAddr(a.address_id)} style={{ display: 'none' }} />
                                        <div className="flex items-start gap-3">
                                            <div className="step-num" style={{ marginTop: 2 }}>{selectedAddr === a.address_id ? <Check size={14} /> : <MapPin size={14} />}</div>
                                            <div style={{ flex: 1 }}>
                                                <div className="font-semibold text-sm">{a.street}</div>
                                                <div className="text-sm text-muted">{a.city}, {a.country} {a.zip_code}</div>
                                                {a.is_default && <span className="badge badge-primary" style={{ marginTop: 4 }}>Default</span>}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                {!addingAddr ? (
                                    <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setAddingAddr(true)}><Plus size={14} /> Add New Address</button>
                                ) : (
                                    <div className="card card-body flex-col" style={{ gap: 12, marginTop: 12 }}>
                                        <input className="form-input" placeholder="Street Address" value={newAddr.street} onChange={e => setNewAddr(p => ({ ...p, street: e.target.value }))} />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <input className="form-input" placeholder="City" value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} />
                                            <input className="form-input" placeholder="Zip Code" value={newAddr.zip_code} onChange={e => setNewAddr(p => ({ ...p, zip_code: e.target.value }))} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-primary btn-sm" onClick={handleSaveAddr}>Save Address</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setAddingAddr(false)}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: 24 }}>
                                    <button className="btn btn-primary btn-lg" onClick={() => setStep(1)} disabled={!selectedAddr}>Continue to Payment <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        )}

                        {/* Step 1: Payment */}
                        {step === 1 && (
                            <div className="animate-slideUp">
                                <h2 className="text-xl font-bold" style={{ marginBottom: 'var(--sp-6)' }}>Payment Method</h2>
                                {[{ id: 'Credit Card', icon: CreditCard, label: 'Credit / Debit Card' }, { id: 'Bank Transfer', icon: Banknote, label: 'Bank Transfer' }, { id: 'Cash on Delivery', icon: Truck, label: 'Cash on Delivery' }].map(pm => (
                                    <label key={pm.id} className={`addr-option${payMethod === pm.id ? ' active' : ''}`}>
                                        <input type="radio" name="pay" value={pm.id} checked={payMethod === pm.id} onChange={() => setPayMethod(pm.id)} style={{ display: 'none' }} />
                                        <div className="flex items-center gap-3">
                                            <div className="step-num">{payMethod === pm.id ? <Check size={14} /> : <pm.icon size={14} />}</div>
                                            <span className="font-semibold">{pm.label}</span>
                                        </div>
                                    </label>
                                ))}

                                {payMethod === 'Credit Card' && (
                                    <div className="card card-body flex-col" style={{ gap: 12, marginTop: 16 }}>
                                        <input className="form-input" placeholder="Card Number: 4242 4242 4242 4242" readOnly />
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <input className="form-input" placeholder="MM / YY" readOnly />
                                            <input className="form-input" placeholder="CVV" readOnly />
                                        </div>
                                        <p className="text-xs text-faint">This is a demo — no real payment will be processed.</p>
                                    </div>
                                )}

                                {/* Coupon */}
                                <div className="form-group" style={{ marginTop: 20 }}>
                                    <label className="form-label">Have a coupon?</label>
                                    <div className="flex gap-2">
                                        <input id="checkout-coupon" className="form-input" placeholder="Enter code…" value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                                        <button className="btn btn-outline" onClick={applyCoupon}>Apply</button>
                                    </div>
                                    {couponErr && <p className="text-error text-xs" style={{ marginTop: 4 }}>{couponErr}</p>}
                                    {coupon && <p className="text-success text-xs" style={{ marginTop: 4 }}>✓ {coupon.discount}% discount applied!</p>}
                                </div>

                                <div className="flex gap-3" style={{ marginTop: 24 }}>
                                    <button className="btn btn-outline btn-lg" onClick={() => setStep(0)}>Back</button>
                                    <button className="btn btn-primary btn-lg" onClick={() => setStep(2)}>Review Order <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Review */}
                        {step === 2 && (
                            <div className="animate-slideUp">
                                <h2 className="text-xl font-bold" style={{ marginBottom: 'var(--sp-6)' }}>Review & Confirm</h2>
                                <div className="card card-body" style={{ marginBottom: 'var(--sp-4)' }}>
                                    <div className="font-semibold text-sm text-muted uppercase" style={{ marginBottom: 8, fontSize: 11 }}>Delivery To</div>
                                    <div className="font-semibold">{addrObj?.street}</div>
                                    <div className="text-sm text-muted">{addrObj?.city}, {addrObj?.country} {addrObj?.zip_code}</div>
                                </div>
                                <div className="card card-body" style={{ marginBottom: 'var(--sp-6)' }}>
                                    <div className="font-semibold text-sm text-muted uppercase" style={{ marginBottom: 8, fontSize: 11 }}>Payment</div>
                                    <div className="font-semibold">{payMethod}</div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="btn btn-outline btn-lg" onClick={() => setStep(1)}>Back</button>
                                    <button id="place-order-btn" className="btn btn-primary btn-lg flex-1" onClick={handlePlaceOrder} disabled={loading}>
                                        {loading ? 'Placing Order…' : 'Place Order 🎉'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <OrderSummary />
                </div>
            </div>

            <style>{`
        .step-bar { display: flex; align-items: center; margin-bottom: var(--sp-10); }
        .step-item { display: flex; align-items: center; gap: var(--sp-3); flex: 1; }
        .step-num { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--clr-border-2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--clr-text-3); flex-shrink: 0; }
        .step-item.done .step-num { border-color: var(--clr-success); background: rgba(52,211,153,0.12); color: var(--clr-success); }
        .step-item.active .step-num { border-color: var(--clr-primary); background: rgba(192,132,252,0.12); color: var(--clr-primary); }
        .step-item span { font-size: 14px; font-weight: 600; color: var(--clr-text-3); }
        .step-item.active span, .step-item.done span { color: var(--clr-text); }
        .step-connector { flex: 1; height: 2px; background: var(--clr-border); margin: 0 var(--sp-3); }
        .checkout-grid { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-8); align-items: start; }
        .addr-option { display: block; padding: var(--sp-4) var(--sp-5); border: 1.5px solid var(--clr-border); border-radius: var(--r-lg); margin-bottom: var(--sp-3); cursor: pointer; transition: all var(--tr-fast); }
        .addr-option:hover { border-color: var(--clr-border-2); }
        .addr-option.active { border-color: var(--clr-primary); background: rgba(192,132,252,0.06); }
        @media (max-width: 900px) { .checkout-grid { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
