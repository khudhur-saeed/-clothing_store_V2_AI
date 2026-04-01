export default function Tabs({ tabs, activeTab, onChange }) {
    return (
        <div style={{
            display: 'flex',
            gap: 'var(--sp-4)',
            borderBottom: '2px solid var(--clr-border)',
            marginBottom: 'var(--sp-8)',
            backgroundColor: 'transparent'
        }}>
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    style={{
                        padding: '12px 18px',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: activeTab === tab.id ? 'var(--clr-primary)' : 'var(--clr-text-2)',
                        background: activeTab === tab.id ? 'rgba(192, 132, 252, 0.08)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '3px solid var(--clr-primary)' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        marginBottom: '-2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderRadius: '8px 8px 0 0',
                        userSelect: 'none'
                    }}
                    className="tab-button"
                    title={tab.label}
                >
                    {tab.icon && (
                        <span style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            marginRight: '4px',
                            color: 'inherit'
                        }}>
                            {tab.icon}
                        </span>
                    )}
                    <span style={{ whiteSpace: 'nowrap' }}>
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    );
}
