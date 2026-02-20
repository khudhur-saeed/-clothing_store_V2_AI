import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_cart')) || []; } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('moda_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, variant, quantity = 1) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.variantId === variant.id);
            if (existing) {
                return prev.map(i => i.variantId === variant.id
                    ? { ...i, quantity: Math.min(i.quantity + quantity, variant.stock) }
                    : i
                );
            }
            return [...prev, {
                id: Date.now(), variantId: variant.id, productId: product.id,
                productName: product.name, color: variant.color_name, size: variant.size,
                price: variant.price, stock: variant.stock, quantity,
                image: product.images[0]?.url,
            }];
        });
    };

    const removeFromCart = (variantId) => {
        setCartItems(prev => prev.filter(i => i.variantId !== variantId));
    };

    const updateQty = (variantId, quantity) => {
        if (quantity < 1) { removeFromCart(variantId); return; }
        setCartItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity: Math.min(quantity, i.stock) } : i));
    };

    const clearCart = () => setCartItems([]);

    const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
