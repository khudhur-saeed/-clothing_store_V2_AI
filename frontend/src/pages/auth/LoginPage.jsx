import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shirt } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        await new Promise(r => setTimeout(r, 600));
        const result = await login(form.email, form.password);
        setLoading(false);
        if (result.success) navigate('/');
        else setError(result.error);
    };

    return (
        <div className="auth-page">
            <div className="auth-card animate-slideUp">
                <div className="auth-logo"><Shirt size={28} /> MODA</div>
                <h1 className="text-2xl font-bold text-center" style={{ marginBottom: 6 }}>Welcome Back</h1>
                <p className="text-center text-muted text-sm" style={{ marginBottom: 32 }}>Sign in to your account to continue shopping</p>

                {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

                <form onSubmit={handleSubmit} className="flex-col" style={{ gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input id="login-email" className="form-input" type="email" placeholder="you@example.com" autoComplete="email"
                            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input id="login-password" className="form-input" type={showPw ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--clr-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" id="login-submit" className="btn btn-primary w-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                        {loading ? 'Signing In…' : 'Sign In'}
                    </button>
                </form>

                <div className="divider" style={{ margin: '24px 0' }} />
                <div className="auth-hint">
                    <span className="text-faint text-sm">Hint: use </span>
                    <code style={{ fontSize: 12, background: 'var(--clr-surface-2)', padding: '2px 6px', borderRadius: 4 }}>admin@moda.com</code>
                    <span className="text-faint text-sm"> for admin access</span>
                </div>

                <p className="text-center text-sm text-muted" style={{ marginTop: 24 }}>
                    Don't have an account? <Link to="/register" className="text-primary font-semibold">Sign Up</Link>
                </p>
            </div>

            <style>{`
        .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: radial-gradient(ellipse at 60% 0%, rgba(168,85,247,0.12) 0%, transparent 60%), var(--clr-bg); padding: var(--sp-6); }
        .auth-card { background: var(--clr-surface); border: 1px solid var(--clr-border-2); border-radius: var(--r-xl); padding: var(--sp-10); width: 100%; max-width: 440px; box-shadow: var(--shadow-lg); }
        .auth-logo { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 28px; font-weight: 900; letter-spacing: 0.15em; color: var(--clr-primary); margin-bottom: 28px; }
        .auth-hint { text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
      `}</style>
        </div>
    );
}
