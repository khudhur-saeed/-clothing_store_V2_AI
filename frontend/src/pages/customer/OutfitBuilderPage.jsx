import { useState } from 'react';
import { Plus, X, Eye, Lock, Trash2, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { mockProducts } from '../../data/mockData';
import { Link } from 'react-router-dom';

const PIECE_TYPES = ['top', 'bottom', 'outerwear', 'footwear', 'accessory'];

export default function OutfitBuilderPage() {
    const { outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit, showToast } = useApp();
    const { user } = useAuth();
    const [selectedOutfit, setSelectedOutfit] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newOutfit, setNewOutfit] = useState({ name: '', description: '', visibility: 'public' });
    const [addingType, setAddingType] = useState(null);

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Sign in to create outfits</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const currentOutfit = outfits.find(o => o.outfit_id === selectedOutfit);
    const outfitProducts = currentOutfit ? mockProducts.filter(p => currentOutfit.products.includes(p.id)) : [];

    const handleCreate = () => {
        if (!newOutfit.name) return;
        const o = { ...newOutfit, outfit_id: Date.now() };
        createOutfit(o);
        setShowCreate(false); setNewOutfit({ name: '', description: '', visibility: 'public' });
        showToast(`Outfit "${newOutfit.name}" created!`);
    };

    const productsByType = {};
    PIECE_TYPES.forEach(pt => { productsByType[pt] = mockProducts.filter(p => p.piece_type === pt); });

    return (
        <div className="page">
            <div className="container">
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-8)' }}>
                    <div>
                        <h1 className="text-3xl font-bold">Outfit Builder</h1>
                        <p className="text-muted">Mix and match pieces to create your perfect look</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="create-outfit-btn">
                        <Plus size={16} /> New Outfit
                    </button>
                </div>

                <div className="outfit-grid">
                    {/* Outfits list */}
                    <div>
                        <h3 className="font-bold" style={{ marginBottom: 'var(--sp-4)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--clr-text-3)' }}>My Outfits</h3>
                        {outfits.length === 0 && (
                            <div className="text-center" style={{ padding: 'var(--sp-10) 0' }}>
                                <p className="text-muted text-sm">No outfits yet. Create your first!</p>
                            </div>
                        )}
                        <div className="flex-col" style={{ gap: 'var(--sp-3)' }}>
                            {outfits.map(o => (
                                <div key={o.outfit_id} className={`outfit-item${selectedOutfit === o.outfit_id ? ' active' : ''}`}
                                    onClick={() => setSelectedOutfit(s => s === o.outfit_id ? null : o.outfit_id)}
                                    id={`outfit-item-${o.outfit_id}`}>
                                    <div style={{ flex: 1 }}>
                                        <div className="font-semibold text-sm">{o.name}</div>
                                        <div className="text-xs text-faint">{o.products.length} pieces · {new Date(o.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`badge ${o.visibility === 'public' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: 10 }}>
                                            {o.visibility === 'public' ? <Eye size={9} /> : <Lock size={9} />} {o.visibility}
                                        </span>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); deleteOutfit(o.outfit_id); if (selectedOutfit === o.outfit_id) setSelectedOutfit(null); }}
                                            aria-label="Delete outfit"><Trash2 size={13} color="var(--clr-error)" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Outfit canvas */}
                    <div>
                        {!currentOutfit ? (
                            <div className="card card-body text-center" style={{ padding: 'var(--sp-16)', height: '100%' }}>
                                <Package size={48} color="var(--clr-text-3)" style={{ margin: '0 auto 16px' }} />
                                <p className="font-semibold">Select an outfit to edit</p>
                                <p className="text-sm text-muted">or create a new one</p>
                                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowCreate(true)}>
                                    <Plus size={16} /> Create Outfit
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-6)' }}>
                                    <div>
                                        <h2 className="text-xl font-bold">{currentOutfit.name}</h2>
                                        {currentOutfit.description && <p className="text-sm text-muted">{currentOutfit.description}</p>}
                                    </div>
                                </div>

                                {/* Outfit pieces visual */}
                                <div className="outfit-canvas">
                                    {PIECE_TYPES.map(pt => {
                                        const piece = outfitProducts.find(p => p.piece_type === pt);
                                        return (
                                            <div key={pt} className="outfit-slot">
                                                <div className="outfit-slot-label">{pt.toUpperCase()}</div>
                                                {piece ? (
                                                    <div className="outfit-slot-piece">
                                                        <img src={piece.images[0]?.url} alt={piece.name} />
                                                        <div className="outfit-slot-overlay">
                                                            <button className="btn btn-danger btn-sm" onClick={() => removeFromOutfit(currentOutfit.outfit_id, piece.id)}>
                                                                <X size={13} /> Remove
                                                            </button>
                                                        </div>
                                                        <div className="outfit-slot-name">{piece.name}</div>
                                                    </div>
                                                ) : (
                                                    <button className="outfit-slot-empty" onClick={() => setAddingType(pt)} id={`add-${pt}-btn`}>
                                                        <Plus size={20} /> Add {pt}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create outfit modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="font-bold">New Outfit</span>
                            <button onClick={() => setShowCreate(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex-col" style={{ gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Outfit Name *</label>
                                <input id="outfit-name-input" className="form-input" placeholder="e.g. Office Chic" value={newOutfit.name} onChange={e => setNewOutfit(p => ({ ...p, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" placeholder="Describe your outfit…" value={newOutfit.description} onChange={e => setNewOutfit(p => ({ ...p, description: e.target.value }))} style={{ minHeight: 80 }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Visibility</label>
                                <select className="form-select" value={newOutfit.visibility} onChange={e => setNewOutfit(p => ({ ...p, visibility: e.target.value }))}>
                                    <option value="public">Public — visible to everyone</option>
                                    <option value="private">Private — only visible to you</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button id="confirm-create-outfit" className="btn btn-primary" onClick={handleCreate} disabled={!newOutfit.name}>Create Outfit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add product picker modal */}
            {addingType && currentOutfit && (
                <div className="modal-overlay" onClick={() => setAddingType(null)}>
                    <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="font-bold">Choose a {addingType}</span>
                            <button onClick={() => setAddingType(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="grid-3 grid" style={{ gap: 'var(--sp-4)' }}>
                                {productsByType[addingType]?.map(p => (
                                    <button key={p.id} className="product-picker-item" onClick={() => { addToOutfit(currentOutfit.outfit_id, p.id); setAddingType(null); showToast(`${p.name} added to outfit!`); }}>
                                        <img src={p.images[0]?.url} alt={p.name} />
                                        <div className="text-xs font-semibold" style={{ marginTop: 6, textAlign: 'left' }}>{p.name}</div>
                                        <div className="text-xs text-primary">${p.variants[0]?.price.toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .outfit-grid { display: grid; grid-template-columns: 260px 1fr; gap: var(--sp-8); align-items: start; }
        .outfit-item { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-4); border: 1.5px solid var(--clr-border); border-radius: var(--r-lg); cursor: pointer; transition: all var(--tr-fast); }
        .outfit-item:hover, .outfit-item.active { border-color: var(--clr-primary); background: rgba(192,132,252,0.06); }
        .outfit-canvas { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-4); }
        .outfit-slot { display: flex; flex-direction: column; }
        .outfit-slot-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--clr-text-3); margin-bottom: var(--sp-2); }
        .outfit-slot-piece { position: relative; border-radius: var(--r-lg); overflow: hidden; aspect-ratio: 3/4; border: 1px solid var(--clr-border); }
        .outfit-slot-piece img { width: 100%; height: 100%; object-fit: cover; }
        .outfit-slot-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity var(--tr-fast); }
        .outfit-slot-piece:hover .outfit-slot-overlay { opacity: 1; }
        .outfit-slot-name { font-size: 11px; font-weight: 500; margin-top: 6px; color: var(--clr-text-2); text-align: center; }
        .outfit-slot-empty { width: 100%; aspect-ratio: 3/4; border: 2px dashed var(--clr-border-2); border-radius: var(--r-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--clr-text-3); font-size: 12px; font-weight: 500; transition: all var(--tr-fast); }
        .outfit-slot-empty:hover { border-color: var(--clr-primary); color: var(--clr-primary); background: rgba(192,132,252,0.05); }
        .product-picker-item { text-align: left; border: 1.5px solid var(--clr-border); border-radius: var(--r-lg); overflow: hidden; padding: 0 0 var(--sp-3); transition: all var(--tr-fast); }
        .product-picker-item img { width: 100%; aspect-ratio: 3/4; object-fit: cover; }
        .product-picker-item > div { padding: 0 var(--sp-3); margin-top: var(--sp-2); }
        .product-picker-item:hover { border-color: var(--clr-primary); transform: translateY(-2px); }
        @media (max-width: 900px) { .outfit-grid { grid-template-columns: 1fr; } .outfit-canvas { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .outfit-canvas { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
