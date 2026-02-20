import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function InvoicePage() {
    const { id } = useParams();
    const { orders } = useApp();
    const order = orders.find(o => o.orderID === Number(id));

    if (!order) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <p className="font-semibold">Invoice not found</p>
            <Link to="/orders" className="btn btn-primary" style={{ marginTop: 16 }}>My Orders</Link>
        </div>
    );

    const { invoice } = order;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 760 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                    <Link to={`/orders/${order.orderID}`} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> Back to Order</Link>
                    <button className="btn btn-primary btn-sm" onClick={() => window.print()} id="print-invoice-btn"><Printer size={14} /> Print Invoice</button>
                </div>

                <div className="invoice-doc" id="invoice-document">
                    {/* Header */}
                    <div className="invoice-header">
                        <div>
                            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                                <FileText size={22} color="var(--clr-primary)" />
                                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.1em', color: 'var(--clr-primary)' }}>MODA</span>
                            </div>
                            <p className="text-sm text-muted">Fashion E-Commerce Platform</p>
                            <p className="text-xs text-faint">Istanbul, Turkey</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold" style={{ marginBottom: 4 }}>INVOICE</div>
                            <div className="text-sm text-muted">#{invoice?.invoice_ID || order.orderID + 200}</div>
                            <div className="text-sm text-muted">Date: {invoice?.invoice_date || new Date(order.order_date).toLocaleDateString()}</div>
                        </div>
                    </div>

                    <div className="divider" />

                    {/* Billing info */}
                    <div className="invoice-info">
                        <div>
                            <div className="font-bold text-xs uppercase text-faint" style={{ marginBottom: 8 }}>Bill To</div>
                            <div className="font-semibold">Customer Account</div>
                            <div className="text-sm text-muted">25 Fashion Boulevard, Apt 4B</div>
                            <div className="text-sm text-muted">Istanbul, Turkey 34000</div>
                        </div>
                        <div>
                            <div className="font-bold text-xs uppercase text-faint" style={{ marginBottom: 8 }}>Order Details</div>
                            <div className="text-sm"><span className="text-muted">Order #:</span> <strong>{order.orderID}</strong></div>
                            <div className="text-sm"><span className="text-muted">Date:</span> {new Date(order.order_date).toLocaleDateString('en-GB')}</div>
                            <div className="text-sm"><span className="text-muted">Payment:</span> {order.payment}</div>
                        </div>
                    </div>

                    <div className="divider" />

                    {/* Items */}
                    <div className="table-wrap" style={{ marginBottom: 'var(--sp-6)' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th><th>Variant</th><th>Qty</th><th>Unit Price</th><th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{item.product_name}</td>
                                        <td className="text-muted text-sm">{item.color} · {item.size}</td>
                                        <td>{item.quantity}</td>
                                        <td>${item.unit_price.toFixed(2)}</td>
                                        <td className="font-semibold">${(item.unit_price * item.quantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="invoice-totals">
                        <div className="flex justify-between text-sm" style={{ marginBottom: 8 }}><span className="text-muted">Subtotal</span><span>${order.total_price.toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm" style={{ marginBottom: 8 }}><span className="text-muted">Tax (18% VAT)</span><span>${(invoice?.tax_amount || order.total_price * 0.18).toFixed(2)}</span></div>
                        <div className="flex justify-between text-sm" style={{ marginBottom: 8 }}><span className="text-muted">Shipping</span><span className="text-success">FREE</span></div>
                        {order.coupon_code && <div className="flex justify-between text-sm text-success" style={{ marginBottom: 8 }}><span>Coupon ({order.coupon_code})</span><span>Applied</span></div>}
                        <div className="divider" style={{ margin: '12px 0' }} />
                        <div className="flex justify-between font-bold text-xl"><span>Total</span><span className="text-primary">${order.total_price.toFixed(2)}</span></div>
                    </div>

                    <div className="divider" />
                    <div className="text-center text-sm text-faint" style={{ marginTop: 'var(--sp-6)' }}>
                        Thank you for shopping with MODA! For any queries, contact support@moda.com
                    </div>
                </div>
            </div>

            <style>{`
        .invoice-doc { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-xl); padding: var(--sp-10); }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--sp-6); }
        .invoice-info { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-8); margin-bottom: var(--sp-6); }
        .invoice-totals { max-width: 340px; margin-left: auto; padding: var(--sp-5); background: var(--clr-bg-3); border-radius: var(--r-lg); }
        @media print {
          .btn { display: none; }
          .invoice-doc { border: none; box-shadow: none; }
          body { background: white; color: black; }
        }
        @media (max-width: 640px) { .invoice-header, .invoice-info { flex-direction: column; grid-template-columns: 1fr; gap: var(--sp-4); } }
      `}</style>
        </div>
    );
}
