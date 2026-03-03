import { createContext, useContext, useState } from 'react';
import { apiCall } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_user')); } catch { return null; }
    });

    const login = async (email, password) => {
        try {
            // FastAPI expects query params for simple-type POST params
            const data = await apiCall('/auth/login', { method: 'POST' }, { email, password });
            localStorage.setItem('moda_token', data.access_token);
            const profile = await apiCall('/auth/me');
            setUser(profile);
            localStorage.setItem('moda_user', JSON.stringify(profile));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const register = async (data) => {
        try {
            const res = await apiCall('/auth/register', { method: 'POST' }, {
                first_name: data.firstName,
                last_name: data.lastName,
                email: data.email,
                password: data.password,
            });
            localStorage.setItem('moda_token', res.access_token);
            const profile = await apiCall('/auth/me');
            setUser(profile);
            localStorage.setItem('moda_user', JSON.stringify(profile));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('moda_user');
        localStorage.removeItem('moda_token');
    };

    const updateProfile = async (data) => {
        try {
            const updated = await apiCall('/auth/me', { method: 'PUT' }, {
                first_name: data.firstName || data.first_name,
                last_name: data.lastName || data.last_name,
                phone_no: data.phone || data.phone_no,
            });
            setUser(updated);
            localStorage.setItem('moda_user', JSON.stringify(updated));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateProfile, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
