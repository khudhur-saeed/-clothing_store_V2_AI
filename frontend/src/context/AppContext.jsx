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
    products: o.products || o.items || [],
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
    };

    // Fetch data from API if logged in
    const fetchUserData = async () => {
        const token = localStorage.getItem('moda_token');
        if (!token) return;
        try {
            const [favs, addrs, ords, outfitsList] = await Promise.all([
                apiCall('/favorites/'),
                apiCall('/addresses/'),
                apiCall('/orders/'),
                apiCall('/outfits/', {}, { type: 'my' }).catch(() => []),
            ]);
            setFavorites(favs.map(f => f.product_id));
            setAddresses(addrs);
            setOrders(ords);
            if (Array.isArray(outfitsList)) {
                setOutfits(outfitsList.map(normalizePersistedOutfit));
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
        if (!token) return;
        try {
            const newAddr = await apiCall('/addresses/', { method: 'POST' }, {
                title: addr.title,
                street: addr.street,
                city: addr.city,
                country: addr.country,
                zip_code: addr.zip_code,
                is_default: addr.is_default || false,
            });
            setAddresses(prev => addr.is_default
                ? [...prev.map(a => ({ ...a, is_default: false })), newAddr]
                : [...prev, newAddr]);
        } catch (err) {
            showToast(err.message, 'error');
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
        setOutfits(prev => [...prev, { 
            ...outfit, 
            outfit_id: Date.now(), 
            user_id: 1, 
            products: [],
            department: outfit.department || null,  // Locked on first product addition
            createdAt: new Date().toISOString(),
            isSaved: false  // Mark as not yet saved to database
        }]);
    };

    const addToOutfit = (outfitId, productId, department = null) => {
        setOutfits(prev => prev.map(o => {
            if (o.outfit_id !== outfitId) return o;

            // Validation 3: Check for duplicates
            if (o.products.includes(productId)) {
                showToast('This item is already in your outfit', 'error');
                return o;
            }

            // Validation 1: Lock department on first product
            if (o.products.length === 0 && department) {
                return { ...o, products: [...o.products, productId], department };
            }

            // If not the first product and department exists, verify match
            if (o.department && department && o.department !== department) {
                showToast(`This item is for ${department} but your outfit is for ${o.department}`, 'error');
                return o;
            }

            return { ...o, products: [...o.products, productId] };
        }));
    };

    const removeFromOutfit = (outfitId, productId) => {
        setOutfits(prev => prev.map(o => o.outfit_id === outfitId
            ? { ...o, products: o.products.filter(id => id !== productId) } : o));
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

    // --- Conversations (local) ---
    const sendMessage = (conversationId, content) => {
        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, { message_id: Date.now(), sender_type: 'user', content, sent_at: new Date().toISOString() }] }
            : c));
    };
    const addBotMessage = (conversationId, content) => {
        setConversations(prev => prev.map(c => c.conversation_id === conversationId
            ? { ...c, messages: [...c.messages, { message_id: Date.now() + 1, sender_type: 'bot', content, sent_at: new Date().toISOString() }] }
            : c));
    };
    const createConversation = (title = 'New conversation') => {
        const newConv = {
            conversation_id: Date.now(), user_id: 1, title, started_at: new Date().toISOString(),
            messages: [{ message_id: 1, sender_type: 'bot', content: "Hello! I'm Moda Assistant. How can I help you today?", sent_at: new Date().toISOString() }]
        };
        setConversations(prev => [newConv, ...prev]);
        return newConv;
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
            addresses, addAddress, deleteAddress, setDefaultAddress,
            outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit, refreshOutfits,
            orders, placeOrder, fetchUserData, clearUserData,
            conversations, sendMessage, addBotMessage, createConversation,
            toast, showToast,
        }}>
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => useContext(AppContext);
