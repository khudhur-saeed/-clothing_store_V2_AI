import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Toast from './components/ui/Toast';
import FloatingChat from './components/ui/FloatingChat';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Customer pages
import HomePage from './pages/customer/HomePage';
import CatalogPage from './pages/customer/CatalogPage';
import ProductDetailPage from './pages/customer/ProductDetailPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import FavoritesPage from './pages/customer/FavoritesPage';
import OutfitBuilderPage from './pages/customer/OutfitBuilderPage';
import ProfilePage from './pages/customer/ProfilePage';
import InvoicePage from './pages/customer/InvoicePage';
import ChatbotPage from './pages/customer/ChatbotPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from './pages/admin/AdminOrderDetailPage';
import AdminShippingPage from './pages/admin/AdminShippingPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminHomepagePage from './pages/admin/AdminHomepagePage';

// Customer layout (with header, footer, and floating chat)
function CustomerLayout() {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
            <Toast />
            <FloatingChat />
        </>
    );
}

// Admin route guard
function AdminRoute() {
    const { user, isAdmin } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <><Outlet /><Toast /></>;
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <CartProvider>
                    <AppProvider>
                        <BrowserRouter>
                            <Routes>
                                {/* Auth */}
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />

                                {/* Customer */}
                                <Route element={<CustomerLayout />}>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/products" element={<CatalogPage />} />
                                    <Route path="/products/:id" element={<ProductDetailPage />} />
                                    <Route path="/cart" element={<CartPage />} />
                                    <Route path="/checkout" element={<CheckoutPage />} />
                                    <Route path="/orders" element={<OrdersPage />} />
                                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                                    <Route path="/orders/:id/invoice" element={<InvoicePage />} />
                                    <Route path="/favorites" element={<FavoritesPage />} />
                                    <Route path="/outfits" element={<OutfitBuilderPage />} />
                                    <Route path="/profile" element={<ProfilePage />} />
                                    <Route path="/chat" element={<ChatbotPage />} />
                                </Route>

                                {/* Admin (protected) */}
                                <Route element={<AdminRoute />}>
                                    <Route path="/admin" element={<AdminDashboard />} />
                                    <Route path="/admin/products" element={<AdminProductsPage />} />
                                    <Route path="/admin/orders" element={<AdminOrdersPage />} />
                                    <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
                                    <Route path="/admin/shipping" element={<AdminShippingPage />} />
                                    <Route path="/admin/coupons" element={<AdminCouponsPage />} />
                                    <Route path="/admin/categories" element={<AdminCategoriesPage />} />
                                    <Route path="/admin/homepage" element={<AdminHomepagePage />} />
                                </Route>

                                {/* Fallback */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </BrowserRouter>
                    </AppProvider>
                </CartProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
