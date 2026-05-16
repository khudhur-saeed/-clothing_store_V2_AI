import { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../api/client';

const AppContext = createContext(null);

const normalizePersistedOutfit = (o) => ({
    outfit_id: o.outfit_id ?? o.id,
    user_id: o.user_id ?? o.userId,
    name: o.name,
    description: o.description,
    visibility: o.visibility || (o.isPublic ? 'public' : 'private'),
    department: o.department,
    target_category_id: o.target_category_id ?? o.targetCategoryId ?? o.category_id ?? null,
    targetCategoryId: o.targetCategoryId ?? o.target_category_id ?? o.category_id ?? null,
    products: o.products || o.items || [],
    slotMap: o.slotMap || {},
    created_at: o.created_at || o.createdAt,
    updated_at: o.updated_at,
    isSaved: true,
});

export function AppProvider({ children }) {
    const [favorites, setFavorites] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [orders, setOrders] = useState([]);
    // Outfits and conversations stay local for now
    const [outfits, setOutfits] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [toast, setToast] = useState(null);

    const clearUserData = () => {
        setFavorites([]);
        setAddresses([]);
        setOrders([]);
        setOutfits([]); // Clear saved outfits on logout
        setConversations([]);
    };

    const normalizeConversation = (c) => {
        const messages = (c.messages || []).map((m) => ({
            message_id: m.message_id,
            sender_type: m.sender_type,
            content: m.content || '',
            sent_at: m.sent_at,
            products: m.products || [],
        }));

        const fallbackTitle = messages.find((m) => m.sender_type === 'user')?.content || 'Chat with Moda';
        const title = (c.title || String(fallbackTitle).slice(0, 32) || 'Chat with Moda').trim();

        return {
            conversation_id: c.conversation_id ?? c.id,
            user_id: c.user_id ?? c.userId,
            title,
            started_at: c.started_at,
            messages,
        };
    };

    // Fetch data from API if logged in
    const fetchUserData = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) return;
        try {
            const [favs, addrs, ords, outfitsList, convs] = await Promise.all([
                apiCall('/favorites/'),
                apiCall('/addresses/'),
                apiCall('/orders/'),
                apiCall('/outfits/', {}, { type: 'my' }).catch(() => []),
                apiCall('/conversations/').catch(() => []),
            ]);
            setFavorites(favs.map(f => f.product_id));
            setAddresses(addrs);
            setOrders(ords);
            if (Array.isArray(outfitsList)) {
                setOutfits(outfitsList.map(normalizePersistedOutfit));
            }
            if (Array.isArray(convs)) {
                setConversations(convs.map(normalizeConversation));
            }
        } catch (err) {
            console.warn('Failed to fetch user data:', err.message);
        }
    };

    useEffect(() => {
        fetchUserData();

        const handleAuthChange = () => {
            const token = localStorage.getItem('moda_token');
            if (!token) {
                clearUserData();
            } else {
                fetchUserData();
            }
        };

        window.addEventListener('moda_auth_change', handleAuthChange);
        return () => window.removeEventListener('moda_auth_change', handleAuthChange);
    }, []);

    // --- Favorites ---
    const toggleFavorite = async (productId) => {
        const token = localStorage.getItem('moda_token');
        const isAlreadyFav = favorites.includes(productId);
        if (!token) {
            setFavorites(prev => isAlreadyFav ? prev.filter(id => id !== productId) : [...prev, productId]);
            return;
        }
        try {
            if (isAlreadyFav) {
                await apiCall(`/favorites/${productId}`, { method: 'DELETE' });
                setFavorites(prev => prev.filter(id => id !== productId));
            } else {
                await apiCall(`/favorites/${productId}`, { method: 'POST' });
                setFavorites(prev => [...prev, productId]);
            }
        } catch (err) {
            console.error('Toggle favorite failed:', err.message);
        }
    };

    const isFavorite = (productId) => favorites.includes(productId);

    // --- Addresses ---
    const addAddress = async (addr) => {
        const token = localStorage.getItem('moda_token');
        if (!token) return null;
        try {
            const createdAddress = await apiCall('/addresses/', { method: 'POST' }, {
                title: addr.title,
                street: addr.street,
                city: addr.city,
                country: addr.country,
                zip_code: addr.zip_code,
                is_default: addr.is_default || false,
            });
            setAddresses(prev => addr.is_default
                ? [...prev.map(a => ({ ...a, is_default: false })), createdAddress]
                : [...prev, createdAddress]);

            return createdAddress;
        } catch (err) {
            showToast(err.message, 'error');
            return null;
        }
    };

    const updateAddress = async (addressId, addr) => {
        try {
            const updatedAddress = await apiCall(`/addresses/${addressId}`, { method: 'PUT' }, {
                title: addr.title,
                street: addr.street,
                city: addr.city,
                country: addr.country,
                zip_code: addr.zip_code,
                is_default: addr.is_default,
            });

            setAddresses(prev => {
                const next = prev.map(a => a.address_id === addressId ? updatedAddress : a);
                if (updatedAddress.is_default) {
                    return next.map(a => ({ ...a, is_default: a.address_id === updatedAddress.address_id }));
                }
                return next;
            });

            return updatedAddress;
        } catch (err) {
            showToast(err.message, 'error');
            return null;
        }
    };

    const deleteAddress = async (id) => {
        try {
            await apiCall(`/addresses/${id}`, { method: 'DELETE' });
            setAddresses(prev => prev.filter(a => a.address_id !== id));
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const setDefaultAddress = async (id) => {
        try {
            await apiCall(`/addresses/${id}/default`, { method: 'PUT' });
            setAddresses(prev => prev.map(a => ({ ...a, is_default: a.address_id === id })));
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    // --- Orders ---
    const placeOrder = async (orderData) => {
        try {
            // Only send defined, non-null params to avoid 422 errors
            const params = { payment: orderData.payment || 'card' };
            if (orderData.address_id != null) params.address_id = orderData.address_id;
            if (orderData.coupon_code) params.coupon_code = orderData.coupon_code;

            const result = await apiCall('/orders/', { method: 'POST' }, params);
            await fetchUserData(); // Refresh orders list
            return result;
        } catch (err) {
            showToast(err.message, 'error');
            throw err;
        }
    };

    // --- Outfits (local) ---
    const createOutfit = (outfit) => {
        const createdOutfit = {
            ...outfit,
            outfit_id: Date.now(),
            user_id: 1, 
            products: [],
            slotMap: {},
            createdAt: new Date().toISOString(),
            isSaved: false  // Mark as not yet saved to database
        };
        setOutfits(prev => [...prev, createdOutfit]);
        return createdOutfit;
    };

    const addToOutfit = (outfitId, productId, pieceType = null, replaceProductId = null) => {
        setOutfits(prev => prev.map(o => {
            if (o.outfit_id !== outfitId) return o;

            let nextProducts = [...o.products];
            const nextSlotMap = { ...(o.slotMap || {}) };

            if (replaceProductId && replaceProductId !== productId) {
                nextProducts = nextProducts.filter(id => id !== replaceProductId);
            }

            if (pieceType && nextSlotMap[pieceType] && nextSlotMap[pieceType] !== productId) {
                nextProducts = nextProducts.filter(id => id !== nextSlotMap[pieceType]);
            }

            if (nextProducts.includes(productId)) {
                showToast('This item is already in your outfit', 'error');
                return o;
            }

            nextProducts.push(productId);

            if (pieceType) {
                nextSlotMap[pieceType] = productId;
            }

            return { ...o, products: nextProducts, slotMap: nextSlotMap };
        }));
    };

    const removeFromOutfit = (outfitId, productId) => {
        setOutfits(prev => prev.map(o => o.outfit_id === outfitId
            ? {
                ...o,
                products: o.products.filter(id => id !== productId),
                slotMap: Object.fromEntries(
                    Object.entries(o.slotMap || {}).filter(([, id]) => id !== productId)
                )
            }
            : o));
    };

    const deleteOutfit = async (outfitId) => {
        const token = localStorage.getItem('moda_token');
        
        // First delete from local state
        setOutfits(prev => prev.filter(o => o.outfit_id !== outfitId));
        
        // Then delete from database if it's a saved outfit
        if (!token) return;
        try {
            await apiCall(`/outfits/${outfitId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete outfit from database:', err.message);
            // Restore outfit in local state if API call fails
            await refreshOutfits();
            showToast('Failed to delete outfit', 'error');
        }
    };

    // --- Conversations (persisted) ---
    const sendMessage = async (conversationId, content) => {
        const token = localStorage.getItem('moda_token');
        const tempId = Date.now();
        const optimistic = { message_id: tempId, sender_type: 'user', content, sent_at: new Date().toISOString() };

        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, optimistic] }
            : c));

        if (!token) return;

        try {
            const saved = await apiCall(`/conversations/${conversationId}/messages`, { method: 'POST' }, {
                conversation_id: conversationId,
                content,
                sender_type: 'user',
            });

            setConversations(prev => prev.map(c => {
                if (c.conversation_id !== conversationId) return c;
                return {
                    ...c,
                    messages: c.messages.map(m => m.message_id === tempId
                        ? { ...m, message_id: saved.message_id, sent_at: saved.sent_at }
                        : m),
                };
            }));
        } catch (err) {
            console.error('Failed to save message:', err.message);
        }
    };

    const addBotMessage = async (conversationId, content, products = null) => {
        const token = localStorage.getItem('moda_token');
        const tempId = Date.now() + 1;
        const optimistic = {
            message_id: tempId,
            sender_type: 'bot',
            content,
            products: products || [],
            sent_at: new Date().toISOString(),
        };

        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, optimistic] }
            : c));

        if (!token) return;

        try {
            const saved = await apiCall(`/conversations/${conversationId}/messages`, { method: 'POST' }, {
                conversation_id: conversationId,
                content,
                sender_type: 'bot',
            });

            setConversations(prev => prev.map(c => {
                if (c.conversation_id !== conversationId) return c;
                return {
                    ...c,
                    messages: c.messages.map(m => m.message_id === tempId
                        ? { ...m, message_id: saved.message_id, sent_at: saved.sent_at }
                        : m),
                };
            }));
        } catch (err) {
            console.error('Failed to save bot message:', err.message);
        }
    };

    const createConversation = async (title = 'Chat with Moda') => {
        const token = localStorage.getItem('moda_token');
        if (!token) {
            const newConv = {
                conversation_id: Date.now(),
                user_id: 1,
                title,
                started_at: new Date().toISOString(),
                messages: [],
            };
            setConversations(prev => [newConv, ...prev]);
            return newConv;
        }

        try {
            const saved = await apiCall('/conversations/', { method: 'POST' }, { title });
            const newConv = {
                conversation_id: saved.conversation_id,
                user_id: saved.user_id,
                title: saved.title || title,
                started_at: saved.started_at,
                messages: [],
            };
            setConversations(prev => [newConv, ...prev]);
            return newConv;
        } catch (err) {
            console.error('Failed to create conversation:', err.message);
            return null;
        }
    };

    const renameConversation = async (conversationId, title) => {
        const token = localStorage.getItem('moda_token');
        const nextTitle = (title || '').trim();
        if (!nextTitle) return;

        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, title: nextTitle }
            : c));

        if (!token) return;

        try {
            await apiCall(`/conversations/${conversationId}`, { method: 'PUT' }, { title: nextTitle });
        } catch (err) {
            console.error('Failed to rename conversation:', err.message);
        }
    };

    const deleteConversation = async (conversationId) => {
        const token = localStorage.getItem('moda_token');
        setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));

        if (!token) return;

        try {
            await apiCall(`/conversations/${conversationId}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Failed to delete conversation:', err.message);
        }
    };

    // --- Toast ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Refresh outfits from API
    const refreshOutfits = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) return;
        try {
            const outfitsList = await apiCall('/outfits/', {}, { type: 'my' });
            if (Array.isArray(outfitsList)) {
                setOutfits(outfitsList.map(normalizePersistedOutfit));
            }
        } catch (err) {
            console.warn('Failed to refresh outfits:', err.message);
        }
    };

    return (
        <AppContext.Provider value={{
            favorites, toggleFavorite, isFavorite,
            addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress,
            outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit, refreshOutfits,
            orders, placeOrder, fetchUserData, clearUserData,
            conversations, sendMessage, addBotMessage, createConversation, renameConversation, deleteConversation,
            toast, showToast,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
