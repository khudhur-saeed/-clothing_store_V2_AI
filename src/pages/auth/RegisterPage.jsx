import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' });

    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault(); setError('');
        if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setLoading(true);
        await new Promise(r => setTimeout(r, 700));
        register(form);
        navigate('/');
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-slideUp">
                <div className="auth-logo"><Shirt size={28} /> MODA</div>
                <h1 className="text-2xl font-bold text-center" style={{ marginBottom: 6 }}>Create Account</h1>
                <p className="text-center text-muted text-sm" style={{ marginBottom: 32 }}>Join Moda and discover premium fashion</p>

                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

                <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">First Name</label>
                            <input id="reg-firstname" className="form-input" type="text" placeholder="Ayşe" value={form.firstName} onChange={set('firstName')} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name</label>
                            <input id="reg-lastname" className="form-input" type="text" placeholder="Yılmaz" value={form.lastName} onChange={set('lastName')} required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input id="reg-email" className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required autoComplete="email" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input id="reg-phone" className="form-input" type="tel" placeholder="+90 555 000 0000" value={form.phone} onChange={set('phone')} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input id="reg-password" className="form-input" type={showPw ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={set('password')} required style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input id="reg-confirm" className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
                    </div>
                    <button type="submit" id="reg-submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? 'Creating Account…' : 'Create Account'}
                    </button>
                </form>
                <p className="text-center text-sm text-muted" style={{ marginTop: 24 }}>
                    Already have an account? <Link to="/login" className="text-primary font-semibold">Sign In</Link>
                </p>
            </div>
            <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 60% 0%, rgba(168,85,247,0.12) 0%, transparent 60%), var(--clr-bg); padding: var(--sp-6); }
        .auth-card { background: var(--clr-surface); border: 1px solid var(--clr-border-2); border-radius: var(--r-xl); padding: var(--sp-10); width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); }
        .auth-logo { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 28px; font-weight: 900; letter-spacing: 0.15em; color: var(--clr-primary); margin-bottom: 28px; }
      `}</style>
        </div>
    );
}
