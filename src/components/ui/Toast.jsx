import { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function Toast() {
    const { toast } = useApp();
    if (!toast) return null;

    const icons = { success: <CheckCircle size={18} />, error: <XCircle size={18} />, info: <Info size={18} /> };

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, animation: 'slideUp 0.25s ease' }}>
            <div className={`alert alert-${toast.type || 'success'}`} style={{ minWidth: 260, boxShadow: 'var(--shadow-lg)' }}>
                {icons[toast.type || 'success']}
                <span style={{ fontSize: 14 }}>{toast.message}</span>
            </div>
        </div>
    );
}
