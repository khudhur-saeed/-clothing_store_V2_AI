import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { Users, Search, RefreshCw, ShoppingBag, Mail, Phone, Shield } from 'lucide-react';
import { apiCall } from '../../api/client';

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await apiCall('/users/');
            setUsers(data);
        } catch { setUsers([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filtered = users.filter(u =>
        `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    );

    const admins = users.filter(u => u.role === 'admin').length;
    const customers = users.filter(u => u.role !== 'admin').length;

    return (
        <AdminLayout title="Users">
            {/* Stats bar */}
            <div className="flex gap-4" style={{ marginBottom: 'var(--sp-6)', flexWrap: 'wrap' }}>
                <div className="card card-body" style={{ flex: 1, minWidth: 120, borderLeft: '3px solid var(--clr-primary)', padding: 'var(--sp-4)' }}>
                    <div className="text-xs text-muted uppercase" style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Total Users</div>
                    <div className="text-2xl font-bold">{users.length}</div>
                </div>
                <div className="card card-body" style={{ flex: 1, minWidth: 120, borderLeft: '3px solid var(--clr-success)', padding: 'var(--sp-4)' }}>
                    <div className="text-xs text-muted uppercase" style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Customers</div>
                    <div className="text-2xl font-bold">{customers}</div>
                </div>
                <div className="card card-body" style={{ flex: 1, minWidth: 120, borderLeft: '3px solid var(--clr-warning)', padding: 'var(--sp-4)' }}>
                    <div className="text-xs text-muted uppercase" style={{ letterSpacing: '0.06em', marginBottom: 4 }}>Admins</div>
                    <div className="text-2xl font-bold">{admins}</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-3 items-center" style={{ marginBottom: 'var(--sp-5)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)' }} />
                    <input
                        className="form-input"
                        style={{ paddingLeft: 34 }}
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button className="btn btn-outline btn-sm" onClick={fetchUsers}><RefreshCw size={14} /></button>
            </div>

            {loading ? (
                <div className="text-center text-muted" style={{ padding: 'var(--sp-12) 0' }}>Loading users…</div>
            ) : filtered.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--sp-12) 0' }}>
                    <Users size={40} color="var(--clr-text-3)" style={{ marginBottom: 12 }} />
                    <p className="font-semibold">No users found</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Orders</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.user_id}>
                                    <td className="text-muted text-sm">#{u.user_id}</td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0
                                            }}>
                                                {u.first_name?.[0]}{u.last_name?.[0]}
                                            </div>
                                            <span className="font-semibold">{u.first_name} {u.last_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-sm text-muted">
                                            <Mail size={13} />{u.email}
                                        </div>
                                    </td>
                                    <td className="text-sm text-muted">
                                        {u.phone_no
                                            ? <div className="flex items-center gap-2"><Phone size={13} />{u.phone_no}</div>
                                            : <span className="text-faint">—</span>}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag size={13} color="var(--clr-primary)" />
                                            <span className="font-semibold">{u.order_count}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {u.role === 'admin'
                                            ? <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}><Shield size={11} /> Admin</span>
                                            : <span className="badge badge-success">Customer</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminLayout>
    );
}
