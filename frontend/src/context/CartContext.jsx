import { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../api/client';

const CartContext = createContext(null);

/**
 * Normalize one cart item from the backend into the shape the UI expects.
 * Backend returns: { variant_id, product_id, quantity, price, color, size, stock, images, name }
 * UI reads:        variantId, productId, productName, price, color, size, quantity, image, stock
 */
function normalizeCartItem(raw) {
    // images can be a JSON array or a single URL string
    let image = '';
    if (Array.isArray(raw.images) && raw.images.length > 0) image = raw.images[0];
    else if (typeof raw.images === 'string' && raw.images) image = raw.images;

    return {
        variantId: raw.variant_id,
        variant_id: raw.variant_id,   // keep both so any code using either works
        productId: raw.product_id,
        product_id: raw.product_id,
        productName: raw.name || raw.product_name || 'Product',
        color: raw.color || '',
        size: raw.size || '',
        price: Number(raw.price) || 0,
        stock: raw.stock ?? 0,
        quantity: raw.quantity ?? 1,
        image,
    };
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);

    /* ── Fetch cart from API ───────────────────────────────────────── */
    const fetchCart = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) return;
        try {
            const items = await apiCall('/cart/');
            setCartItems(Array.isArray(items) ? items.map(normalizeCartItem) : []);
        } catch {
            // Not logged in or error — keep empty
        }
    };

    useEffect(() => { fetchCart(); }, []);

    /* ── Add item ──────────────────────────────────────────────────── */
    const addToCart = async (product, variant, quantity = 1) => {
        const token = localStorage.getItem('moda_token');
        if (!token) {
            // Guest: store locally
            setCartItems(prev => {
                const existing = prev.find(i => i.variantId === variant.variant_id);
                if (existing) {
                    return prev.map(i => i.variantId === variant.variant_id
                        ? { ...i, quantity: i.quantity + quantity } : i);
                }
                const imgs = variant.images || [];
                return [...prev, {
                    variantId: variant.variant_id,
                    variant_id: variant.variant_id,
                    productId: product.product_id || product.id,
                    product_id: product.product_id || product.id,
                    productName: product.name,
                    color: variant.color || '',
                    size: variant.size || '',
                    price: Number(product.price) || 0,
                    stock: variant.stock ?? 0,
                    quantity,
                    image: Array.isArray(imgs) ? (imgs[0]?.url || imgs[0] || '') : '',
                }];
            });
            return;
        }
        try {
            await apiCall('/cart/', { method: 'POST' }, { variant_id: variant.variant_id, quantity });
            await fetchCart(); // Always refresh from server to keep truth
        } catch (err) {
            console.error('Add to cart failed:', err.message);
        }
    };

    /* ── Remove ────────────────────────────────────────────────────── */
    const removeFromCart = async (variantId) => {
        const token = localStorage.getItem('moda_token');
        if (!token) {
            setCartItems(prev => prev.filter(i => i.variantId !== variantId));
            return;
        }
        try {
            await apiCall(`/cart/${variantId}`, { method: 'DELETE' });
            setCartItems(prev => prev.filter(i => i.variantId !== variantId));
        } catch (err) {
            console.error('Remove from cart failed:', err.message);
        }
    };

    /* ── Update quantity ───────────────────────────────────────────── */
    const updateQty = async (variantId, quantity) => {
        if (quantity < 1) { removeFromCart(variantId); return; }
        const token = localStorage.getItem('moda_token');
        if (!token) {
            setCartItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity } : i));
            return;
        }
        try {
            await apiCall(`/cart/${variantId}`, { method: 'PUT' }, { quantity });
            setCartItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity } : i));
        } catch (err) {
            console.error('Update qty failed:', err.message);
        }
    };

    const clearCart = () => setCartItems([]);

    const cartTotal = cartItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1), 0);
    const cartCount = cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount, fetchCart }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
