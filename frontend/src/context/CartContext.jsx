import { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../api/client';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load cart from API on mount (if logged in)
    const fetchCart = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) return;
        try {
            const items = await apiCall('/cart/');
            setCartItems(items);
        } catch {
            // Not logged in or error — keep empty
        }
    };

    useEffect(() => {
        fetchCart();
    }, []);

    const addToCart = async (product, variant, quantity = 1) => {
        const token = localStorage.getItem('moda_token');
        if (!token) {
            // Fallback: local cart for guests
            setCartItems(prev => {
                const existing = prev.find(i => i.variant_id === variant.variant_id);
                if (existing) {
                    return prev.map(i => i.variant_id === variant.variant_id
                        ? { ...i, quantity: i.quantity + quantity } : i);
                }
                return [...prev, {
                    variant_id: variant.variant_id,
                    product_id: product.product_id,
                    productName: product.name,
                    color: variant.color,
                    size: variant.size,
                    price: product.price,
                    stock: variant.stock,
                    quantity,
                    image: variant.images,
                }];
            });
            return;
        }
        try {
            await apiCall('/cart/', {
                method: 'POST',
                body: JSON.stringify({ variant_id: variant.variant_id, quantity }),
            });
            await fetchCart(); // Refresh from server
        } catch (err) {
            console.error('Add to cart failed:', err.message);
        }
    };

    const removeFromCart = async (variant_id) => {
        const token = localStorage.getItem('moda_token');
        if (!token) {
            setCartItems(prev => prev.filter(i => i.variant_id !== variant_id));
            return;
        }
        try {
            await apiCall(`/cart/${variant_id}`, { method: 'DELETE' });
            setCartItems(prev => prev.filter(i => i.variant_id !== variant_id));
        } catch (err) {
            console.error('Remove from cart failed:', err.message);
        }
    };

    const updateQty = async (variant_id, quantity) => {
        if (quantity < 1) { removeFromCart(variant_id); return; }
        const token = localStorage.getItem('moda_token');
        if (!token) {
            setCartItems(prev => prev.map(i => i.variant_id === variant_id ? { ...i, quantity } : i));
            return;
        }
        try {
            await apiCall(`/cart/${variant_id}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity }),
            });
            setCartItems(prev => prev.map(i => i.variant_id === variant_id ? { ...i, quantity } : i));
        } catch (err) {
            console.error('Update qty failed:', err.message);
        }
    };

    const clearCart = () => setCartItems([]);

    const cartTotal = cartItems.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0);
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount, fetchCart }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
