import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, Tag, FolderTree, LogOut, Shirt, ChevronRight, LayoutTemplate, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/shipping', icon: Truck, label: 'Shipping' },
    { to: '/admin/coupons', icon: Tag, label: 'Coupons' },
    { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
    { to: '/admin/homepage', icon: LayoutTemplate, label: 'Homepage Editor' },
];

export default function AdminLayout({ children, title }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="admin-shell">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <Link to="/admin" className="sidebar-logo"><Shirt size={20} /> MODA Admin</Link>
                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => {
                        const active = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to);
                        return (
                            <Link key={to} to={to} className={`sidebar-link${active ? ' active' : ''}`}>
                                <Icon size={17} /> {label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="user-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
                            {user?.first_name[0]}{user?.last_name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.first_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--clr-text-3)' }}>Administrator</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'flex-start', gap: 8, marginTop: 8 }}
                        onClick={() => { logout(); navigate('/'); }}>
                        <LogOut size={15} /> Sign Out
                    </button>
                    <Link to="/" className="btn btn-outline btn-sm w-full" style={{ marginTop: 6, justifyContent: 'flex-start', gap: 8 }}>
                        <Shirt size={15} /> View Store
                    </Link>
                </div>
            </aside>

            {/* Main */}
            <main className="admin-main">
                <div className="admin-topbar">
                    <div>
                        <h1 className="admin-title">{title}</h1>
                        <div className="breadcrumb" style={{ margin: 0, marginTop: 2 }}>
                            <Link to="/admin">Admin</Link>
                            <ChevronRight size={12} />
                            <span>{title}</span>
                        </div>
                    </div>
                </div>
                <div className="admin-content">{children}</div>
            </main>

            <style>{`
        .admin-shell { display: flex; min-height: 100vh; }
        .admin-sidebar { width: 240px; flex-shrink: 0; background: var(--clr-bg-2); border-right: 1px solid var(--clr-border); display: flex; flex-direction: column; padding: var(--sp-5) 0; position: sticky; top: 0; height: 100vh; }
        .sidebar-logo { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 900; letter-spacing: 0.1em; color: var(--clr-primary); padding: 0 var(--sp-5) var(--sp-6); border-bottom: 1px solid var(--clr-border); }
        .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: var(--sp-4) var(--sp-3); overflow-y: auto; }
        .sidebar-link { display: flex; align-items: center; gap: var(--sp-3); padding: 10px 14px; border-radius: var(--r-md); font-size: 14px; font-weight: 500; color: var(--clr-text-2); transition: all var(--tr-fast); }
        .sidebar-link:hover { background: var(--clr-surface); color: var(--clr-text); }
        .sidebar-link.active { background: rgba(192,132,252,0.12); color: var(--clr-primary); font-weight: 600; }
        .sidebar-footer { padding: var(--sp-4) var(--sp-4); border-top: 1px solid var(--clr-border); }
        .sidebar-user { display: flex; align-items: center; gap: var(--sp-3); margin-bottom: var(--sp-3); }
        .admin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .admin-topbar { background: var(--clr-bg-2); border-bottom: 1px solid var(--clr-border); padding: var(--sp-5) var(--sp-8); display: flex; align-items: center; justify-content: space-between; }
        .admin-title { font-size: 22px; font-weight: 800; }
        .admin-content { padding: var(--sp-8); flex: 1; }
        @media (max-width: 768px) { .admin-sidebar { display: none; } .admin-content { padding: var(--sp-4); } .admin-topbar { padding: var(--sp-4); } }
      `}</style>
        </div>
    );
}
