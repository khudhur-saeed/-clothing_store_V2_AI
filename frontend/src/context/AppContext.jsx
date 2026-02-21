import { createContext, useContext, useState, useEffect } from 'react';
import { mockAddresses, mockOutfits, mockConversations, mockOrders } from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [favorites, setFavorites] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_favs')) || []; } catch { return []; }
    });
    const [addresses, setAddresses] = useState(mockAddresses);
    const [outfits, setOutfits] = useState(mockOutfits);
    const [orders, setOrders] = useState(mockOrders);
    const [conversations, setConversations] = useState(mockConversations);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        localStorage.setItem('moda_favs', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (productId) => {
        setFavorites(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const isFavorite = (productId) => favorites.includes(productId);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const addAddress = (addr) => {
        const newAddr = { ...addr, address_id: Date.now(), user_id: 1 };
        setAddresses(prev => {
            if (addr.is_default) return [...prev.map(a => ({ ...a, is_default: false })), newAddr];
            return [...prev, newAddr];
        });
    };

    const deleteAddress = (id) => setAddresses(prev => prev.filter(a => a.address_id !== id));

    const setDefaultAddress = (id) => setAddresses(prev => prev.map(a => ({ ...a, is_default: a.address_id === id })));

    const createOutfit = (outfit) => {
        setOutfits(prev => [...prev, { ...outfit, outfit_id: Date.now(), user_id: 1, created_at: new Date().toISOString().split('T')[0], products: [] }]);
    };

    const addToOutfit = (outfitId, productId) => {
        setOutfits(prev => prev.map(o => o.outfit_id === outfitId && !o.products.includes(productId)
            ? { ...o, products: [...o.products, productId] } : o
        ));
    };

    const removeFromOutfit = (outfitId, productId) => {
        setOutfits(prev => prev.map(o => o.outfit_id === outfitId
            ? { ...o, products: o.products.filter(id => id !== productId) } : o
        ));
    };

    const deleteOutfit = (outfitId) => setOutfits(prev => prev.filter(o => o.outfit_id !== outfitId));

    const placeOrder = (orderData) => {
        const newOrder = {
            orderID: 1000 + orders.length + 1, ...orderData, order_date: new Date().toISOString(), status: 'processing', payment_status: 'completed',
            shipping: { shippingID: Date.now(), shipping_status: 'processing', label: null, tracking: null, created_at: new Date().toISOString(), estimated_delivery: null, delivered_at: null },
            invoice: { invoice_ID: Date.now(), invoice_date: new Date().toISOString().split('T')[0], total_amount: orderData.total_price, tax_amount: +(orderData.total_price * 0.18).toFixed(2), billing_address_id: orderData.address_id },
        };
        setOrders(prev => [newOrder, ...prev]);
        return newOrder;
    };

    const sendMessage = (conversationId, content) => {
        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, { message_id: Date.now(), sender_type: 'user', content, sent_at: new Date().toISOString() }] }
            : c
        ));
    };

    const addBotMessage = (conversationId, content) => {
        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, { message_id: Date.now() + 1, sender_type: 'bot', content, sent_at: new Date().toISOString() }] }
            : c
        ));
    };

    const createConversation = (title = 'New conversation') => {
        const newConv = {
            conversation_id: Date.now(), user_id: 1, title, started_at: new Date().toISOString(), messages: [
                { message_id: 1, sender_type: 'bot', content: 'Hello! I\'m Moda Assistant. How can I help you today?', sent_at: new Date().toISOString() }
            ]
        };
        setConversations(prev => [newConv, ...prev]);
        return newConv;
    };

    return (
        <AppContext.Provider value={{
            favorites, toggleFavorite, isFavorite,
            addresses, addAddress, deleteAddress, setDefaultAddress,
            outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit,
            orders, placeOrder,
            conversations, sendMessage, addBotMessage, createConversation,
            toast, showToast,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
