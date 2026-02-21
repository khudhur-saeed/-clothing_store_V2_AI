import { createContext, useContext, useState, useEffect } from 'react';
import { mockUser, mockAdmin } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_user')); } catch { return null; }
    });

    const login = (email, password) => {
        // Mock authentication
        if (email === mockAdmin.email) {
            setUser(mockAdmin);
            localStorage.setItem('moda_user', JSON.stringify(mockAdmin));
            return { success: true };
        }
        if (email && password.length >= 6) {
            setUser(mockUser);
            localStorage.setItem('moda_user', JSON.stringify(mockUser));
            return { success: true };
        }
        return { success: false, error: 'Invalid email or password.' };
    };

    const register = (data) => {
        const newUser = { ...mockUser, first_name: data.firstName, last_name: data.lastName, email: data.email, phone_No: data.phone };
        setUser(newUser);
        localStorage.setItem('moda_user', JSON.stringify(newUser));
        return { success: true };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('moda_user');
    };

    const updateProfile = (data) => {
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem('moda_user', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, updateProfile, isAdmin: user?.role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
