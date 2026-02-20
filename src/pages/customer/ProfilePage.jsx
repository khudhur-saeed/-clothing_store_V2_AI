import { useState } from 'react';
import { User, MapPin, Plus, Edit, Trash2, Check, X, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const { addresses, addAddress, deleteAddress, setDefaultAddress, showToast } = useApp();

    const [tab, setTab] = useState('info');
    const [editInfo, setEditInfo] = useState(false);
    const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone_No: user?.phone_No || '' });
    const [addingAddr, setAddingAddr] = useState(false);
    const [newAddr, setNewAddr] = useState({ street: '', city: '', country: 'Turkey', zip_code: '', is_default: false });
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Please sign in</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const saveInfo = () => { updateProfile(form); setEditInfo(false); showToast('Profile updated!'); };
    const saveAddr = () => {
        if (!newAddr.street || !newAddr.city) { showToast('Please fill in street and city.', 'error'); return; }
        addAddress(newAddr); setAddingAddr(false); setNewAddr({ street: '', city: '', country: 'Turkey', zip_code: '', is_default: false });
        showToast('Address saved!');
    };
    const savePw = (e) => {
        e.preventDefault();
        if (pwForm.newPw !== pwForm.confirm) { showToast('Passwords do not match.', 'error'); return; }
        showToast('Password changed successfully!'); setPwForm({ current: '', newPw: '', confirm: '' });
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 860 }}>
                {/* Profile header */}
                <div className="profile-hero">
                    <div className="profile-avatar">{user.first_name[0]}{user.last_name[0]}</div>
                    <div>
                        <h1 className="text-2xl font-bold">{user.first_name} {user.last_name}</h1>
                        <p className="text-muted">{user.email}</p>
                        <span className="badge badge-primary" style={{ marginTop: 6 }}>{user.role}</span>
                    </div>
                </div>

                <div className="tabs" style={{ marginBottom: 'var(--sp-8)' }}>
                    <button className={`tab-btn${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}><User size={14} /> Personal Info</button>
                    <button className={`tab-btn${tab === 'addr' ? ' active' : ''}`} onClick={() => setTab('addr')}><MapPin size={14} /> Addresses</button>
                    <button className={`tab-btn${tab === 'pw' ? ' active' : ''}`} onClick={() => setTab('pw')}><Lock size={14} /> Password</button>
                </div>

                {/* Personal Info */}
                {tab === 'info' && (
                    <div className="card card-body animate-slideUp">
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                            <h2 className="font-bold text-lg">Personal Information</h2>
                            {!editInfo ? (
                                <button className="btn btn-outline btn-sm" onClick={() => setEditInfo(true)} id="edit-profile-btn"><Edit size={14} /> Edit</button>
                            ) : (
                                <div className="flex gap-2">
                                    <button className="btn btn-primary btn-sm" onClick={saveInfo} id="save-profile-btn"><Check size={14} /> Save</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditInfo(false)}><X size={14} /></button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-5)' }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                {editInfo ? <input className="form-input" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} /> : <div className="info-val">{user.first_name}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                {editInfo ? <input className="form-input" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} /> : <div className="info-val">{user.last_name}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <div className="info-val text-muted">{user.email} <span className="badge badge-success" style={{ fontSize: 10 }}>Verified</span></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                {editInfo ? <input className="form-input" value={form.phone_No} onChange={e => setForm(p => ({ ...p, phone_No: e.target.value }))} /> : <div className="info-val">{user.phone_No || '—'}</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Addresses */}
                {tab === 'addr' && (
                    <div className="animate-slideUp">
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                            <h2 className="font-bold text-lg">My Addresses</h2>
                            {!addingAddr && <button className="btn btn-primary btn-sm" onClick={() => setAddingAddr(true)} id="add-address-btn"><Plus size={14} /> Add Address</button>}
                        </div>

                        {addingAddr && (
                            <div className="card card-body flex-col" style={{ gap: 14, marginBottom: 'var(--sp-5)' }}>
                                <div className="font-semibold">New Address</div>
                                <input className="form-input" placeholder="Street address" value={newAddr.street} onChange={e => setNewAddr(p => ({ ...p, street: e.target.value }))} id="new-addr-street" />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <input className="form-input" placeholder="City" value={newAddr.city} onChange={e => setNewAddr(p => ({ ...p, city: e.target.value }))} id="new-addr-city" />
                                    <input className="form-input" placeholder="Zip Code" value={newAddr.zip_code} onChange={e => setNewAddr(p => ({ ...p, zip_code: e.target.value }))} />
                                </div>
                                <input className="form-input" placeholder="Country" value={newAddr.country} onChange={e => setNewAddr(p => ({ ...p, country: e.target.value }))} />
                                <label className="checkbox-label">
                                    <input type="checkbox" checked={newAddr.is_default} onChange={e => setNewAddr(p => ({ ...p, is_default: e.target.checked }))} />
                                    Set as default address
                                </label>
                                <div className="flex gap-3">
                                    <button className="btn btn-primary btn-sm" onClick={saveAddr} id="save-address-btn">Save Address</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setAddingAddr(false)}>Cancel</button>
                                </div>
                            </div>
                        )}

                        <div className="flex-col" style={{ gap: 'var(--sp-4)' }}>
                            {addresses.length === 0 && <p className="text-muted">No addresses yet.</p>}
                            {addresses.map(addr => (
                                <div key={addr.address_id} className={`card card-body addr-card${addr.is_default ? ' default' : ''}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold">{addr.street}</div>
                                            <div className="text-sm text-muted">{addr.city}, {addr.country} {addr.zip_code}</div>
                                            {addr.is_default && <span className="badge badge-primary" style={{ marginTop: 6 }}>Default</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            {!addr.is_default && (
                                                <button className="btn btn-outline btn-sm" onClick={() => { setDefaultAddress(addr.address_id); showToast('Default address updated!'); }}>
                                                    Set Default
                                                </button>
                                            )}
                                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { deleteAddress(addr.address_id); showToast('Address deleted.', 'info'); }}>
                                                <Trash2 size={14} color="var(--clr-error)" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Password */}
                {tab === 'pw' && (
                    <div className="card card-body animate-slideUp" style={{ maxWidth: 480 }}>
                        <h2 className="font-bold text-lg" style={{ marginBottom: 'var(--sp-6)' }}>Change Password</h2>
                        <form onSubmit={savePw} className="flex-col" style={{ gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Current Password</label>
                                <input className="form-input" type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input className="form-input" type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required />
                            </div>
                            <button type="submit" className="btn btn-primary" id="change-pw-btn">Update Password</button>
                        </form>
                    </div>
                )}
            </div>

            <style>{`
        .profile-hero { display: flex; align-items: center; gap: var(--sp-6); padding: var(--sp-8); background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-xl); margin-bottom: var(--sp-8); }
        .profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent)); display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; color: white; flex-shrink: 0; }
        .info-val { padding: 11px 0; font-size: 14px; border-bottom: 1px solid var(--clr-border); }
        .addr-card { transition: border-color var(--tr-fast); }
        .addr-card.default { border-color: var(--clr-primary); }
      `}</style>
        </div>
    );
}
