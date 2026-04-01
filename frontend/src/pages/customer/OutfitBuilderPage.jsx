import { useState, useEffect } from 'react';
import { Plus, X, Eye, Lock, Trash2, Package, AlertCircle, Save, Edit2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../api/client';
import { Link, useLocation } from 'react-router-dom';

const PIECE_TYPES = ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories'];
const TARGET_GROUPS = ['Women', 'Men', 'Boys', 'Girls', 'Unisex'];

export default function OutfitBuilderPage() {
    const { outfits, createOutfit, addToOutfit, removeFromOutfit, deleteOutfit, showToast, refreshOutfits } = useApp();
    const { user } = useAuth();
    const location = useLocation();
    const [selectedOutfit, setSelectedOutfit] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newOutfit, setNewOutfit] = useState({ name: '', description: '', visibility: 'public', department: 'Women' });
    const [addingType, setAddingType] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [productVariants, setProductVariants] = useState({});
    const [filteredProducts, setFilteredProducts] = useState([]);
    // New state for Save/Edit
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saveForm, setSaveForm] = useState({ name: '', visibility: 'private' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const products = await apiCall('/products/');
                setAllProducts(products);
                
                // Fetch variants for each product
                const variantsMap = {};
                for (const p of products) {
                    try {
                        const variants = await apiCall(`/products/${p.product_id}/variants`);
                        variantsMap[p.product_id] = variants;
                    } catch {
                        variantsMap[p.product_id] = [];
                    }
                }
                setProductVariants(variantsMap);
            } catch (err) {
                showToast('Failed to load products', 'error');
            }
        };
        
        fetchProducts();
    }, [user]);

    // Auto-select outfit if navigated from gallery
    useEffect(() => {
        if (location.state?.viewOutfitId) {
            setSelectedOutfit(location.state.viewOutfitId);
        }
    }, [location]);

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Sign in to create outfits</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const currentOutfit = outfits.find(o => o.outfit_id === selectedOutfit);
    const outfitProducts = currentOutfit
        ? allProducts.filter(p => currentOutfit.products.includes(p.product_id))
        : [];

    // Handle Save Outfit
    const handleSaveOutfit = async () => {
        if (!currentOutfit || !saveForm.name.trim()) {
            showToast('Outfit name is required', 'error');
            return;
        }

        if (currentOutfit.products.length === 0) {
            showToast('Add at least one item before saving', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: saveForm.name.trim(),
                visibility: saveForm.visibility,
                department: currentOutfit.department,
                product_ids: currentOutfit.products,
                description: currentOutfit.description || ''
            };

            const result = await apiCall('/outfits/', { method: 'POST' }, payload);
            
            showToast(result.message || 'Outfit saved successfully!', 'success');
            setShowSaveModal(false);
            setSaveForm({ name: '', visibility: 'private' });
            
            // Reload outfits list from API to persist in AppContext
            await refreshOutfits();
        } catch (err) {
            showToast(err.message || 'Failed to save outfit', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Handle Edit Outfit
    const handleEditOutfit = async () => {
        if (!currentOutfit || !saveForm.name.trim()) {
            showToast('Outfit name is required', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: saveForm.name.trim(),
                visibility: saveForm.visibility,
                product_ids: currentOutfit.products,
                description: currentOutfit.description || ''
            };

            const result = await apiCall(`/outfits/${currentOutfit.outfit_id}`, { method: 'PUT' }, payload);
            
            showToast(result.message || 'Outfit updated successfully!', 'success');
            setShowSaveModal(false);
            setSaveForm({ name: '', visibility: 'private' });
            setIsEditing(false);
            
            // Reload outfits list from API to persist in AppContext
            await refreshOutfits();
        } catch (err) {
            showToast(err.message || 'Failed to update outfit', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Open save modal
    const openSaveModal = (outfit = null) => {
        if (outfit) {
            // Editing existing outfit from list
            setIsEditing(true);
            setSaveForm({ name: outfit.name, visibility: outfit.visibility });
        } else if (currentOutfit?.isSaved) {
            // Current outfit is already saved - editing it
            setIsEditing(true);
            setSaveForm({ name: currentOutfit.name, visibility: currentOutfit.visibility });
        } else {
            // New outfit - saving for first time
            setIsEditing(false);
            setSaveForm({ name: currentOutfit?.name || '', visibility: 'private' });
        }
        setShowSaveModal(true);
    };

    // Handle creating a new outfit from the modal
    const handleCreate = () => {
        if (!newOutfit.name.trim()) {
            showToast('Outfit name is required', 'error');
            return;
        }

        createOutfit({
            name: newOutfit.name.trim(),
            description: newOutfit.description,
            department: newOutfit.department,
            visibility: newOutfit.visibility,
        });

        // Find the newly created outfit and select it
        const newOutfits = outfits;
        const createdOutfit = newOutfits[newOutfits.length - 1];
        if (createdOutfit) {
            setSelectedOutfit(createdOutfit.outfit_id);
        }

        // Reset and close
        setNewOutfit({ name: '', description: '', visibility: 'public', department: 'Women' });
        setShowCreate(false);
        showToast('Outfit created! Now add items.', 'success');
    };

    // VALIDATION RULE 2: Strict Slot-to-Category Mapping
    // When user clicks "Add X", fetch only products matching that category
    const handleOpenProductPicker = async (pieceType) => {
        if (!currentOutfit) return;
        
        try {
            // Fetch products filtered by outfit_slot AND department
            const params = new URLSearchParams();
            params.append('outfit_slot', pieceType);
            if (currentOutfit.department) {
                params.append('department', currentOutfit.department);
            }
            
            const products = await apiCall(`/products/?${params.toString()}`);
            setFilteredProducts(products);
            setAddingType(pieceType);
        } catch (err) {
            showToast('Failed to load products for this slot', 'error');
        }
    };

    // VALIDATION RULE 3: Prevent Duplicates (handled in AppContext addToOutfit)
    const handleAddToOutfit = (product) => {
        if (!currentOutfit) return;

        // If first product, lock the department
        if (currentOutfit.products.length === 0) {
            addToOutfit(currentOutfit.outfit_id, product.product_id, product.department);
        } else {
            // Validate department match (this is also in AppContext, but we can show better error)
            if (product.department !== currentOutfit.department) {
                showToast(
                    `Cannot add ${product.department} item to ${currentOutfit.department} outfit`,
                    'error'
                );
                return;
            }
            addToOutfit(currentOutfit.outfit_id, product.product_id, product.department);
        }

        setAddingType(null);
    };

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
                                        <div className="text-xs text-faint">
                                            {o.department && <span className="badge badge-info" style={{ fontSize: 9, marginRight: 6 }}>{o.department}</span>}
                                            {o.products.length} pieces · {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`badge ${o.visibility === 'public' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: 10 }}>
                                            {o.visibility === 'public' ? <Eye size={9} /> : <Lock size={9} />} {o.visibility}
                                        </span>
                                        <button className="btn btn-ghost btn-icon btn-sm" onClick={async e => { e.stopPropagation(); await deleteOutfit(o.outfit_id); if (selectedOutfit === o.outfit_id) setSelectedOutfit(null); }}
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
                                    <div style={{ flex: 1 }}>
                                        <h2 className="text-xl font-bold">{currentOutfit.name}</h2>
                                        {currentOutfit.description && <p className="text-sm text-muted">{currentOutfit.description}</p>}
                                    </div>
                                    {/* Target Group Lock Indicator */}
                                    {currentOutfit.department && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(192,132,252,0.1)', borderRadius: 'var(--r-md)', marginLeft: 'var(--sp-4)' }}>
                                            <Lock size={14} color="var(--clr-primary)" />
                                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--clr-primary)' }}>
                                                {currentOutfit.department} only
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Save/Edit Actions */}
                                <div style={{ 
                                    display: 'flex', 
                                    gap: 'var(--sp-3)', 
                                    marginBottom: 'var(--sp-6)',
                                    flexWrap: 'wrap'
                                }}>
                                    <button 
                                        onClick={() => openSaveModal()}
                                        style={{
                                            padding: '12px 28px',
                                            background: 'var(--grad-primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '15px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: '0 4px 15px rgba(192, 132, 252, 0.4)',
                                            minWidth: '160px',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.transform = 'translateY(-3px)';
                                            e.target.style.boxShadow = '0 6px 20px rgba(192, 132, 252, 0.6)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 4px 15px rgba(192, 132, 252, 0.4)';
                                        }}
                                    >
                                        <Save size={18} style={{ color: 'white' }} />
                                        <span>{currentOutfit?.isSaved ? 'Edit & Save' : 'Save Outfit'}</span>
                                    </button>
                                </div>

                                {/* Outfit pieces visual */}
                                <div className="outfit-canvas">
                                    {PIECE_TYPES.map(pt => {
                                        const piece = outfitProducts.find(p => (p.outfit_slot || '').toLowerCase() === pt.toLowerCase());
                                        const variant = piece && productVariants[piece.product_id]?.[0];
                                        const image = variant?.images?.[0];
                                        
                                        return (
                                            <div key={pt} className="outfit-slot">
                                                <div className="outfit-slot-label">{pt.toUpperCase()}</div>
                                                {piece ? (
                                                    <div className="outfit-slot-piece">
                                                        {image ? (
                                                            <img src={image} alt={piece.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Package size={24} color="var(--clr-border)" />
                                                            </div>
                                                        )}
                                                        <div className="outfit-slot-overlay">
                                                            <button className="btn btn-danger btn-sm" onClick={() => removeFromOutfit(currentOutfit.outfit_id, piece.product_id)}>
                                                                <X size={13} /> Remove
                                                            </button>
                                                        </div>
                                                        <div className="outfit-slot-name">{piece.name}</div>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        className="outfit-slot-empty" 
                                                        onClick={() => handleOpenProductPicker(pt)}
                                                        id={`add-${pt.toLowerCase()}-btn`}
                                                    >
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
                                <input 
                                    id="outfit-name-input" 
                                    className="form-input" 
                                    placeholder="e.g. Office Chic" 
                                    value={newOutfit.name} 
                                    onChange={e => setNewOutfit(p => ({ ...p, name: e.target.value }))} 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Department *</label>
                                <select 
                                    className="form-select" 
                                    value={newOutfit.department} 
                                    onChange={e => setNewOutfit(p => ({ ...p, department: e.target.value }))}
                                >
                                    {TARGET_GROUPS.map(tg => (
                                        <option key={tg} value={tg}>{tg}</option>
                                    ))}
                                </select>
                                <p style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 4 }}>
                                    This locks your outfit to {newOutfit.department} items only. You can't mix with other departments.
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea 
                                    className="form-textarea" 
                                    placeholder="Describe your outfit…" 
                                    value={newOutfit.description} 
                                    onChange={e => setNewOutfit(p => ({ ...p, description: e.target.value }))} 
                                    style={{ minHeight: 80 }} 
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Visibility</label>
                                <select 
                                    className="form-select" 
                                    value={newOutfit.visibility} 
                                    onChange={e => setNewOutfit(p => ({ ...p, visibility: e.target.value }))}
                                >
                                    <option value="public">Public — visible to everyone</option>
                                    <option value="private">Private — only visible to you</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button 
                                id="confirm-create-outfit" 
                                className="btn btn-primary" 
                                onClick={handleCreate} 
                                disabled={!newOutfit.name}
                            >
                                Create Outfit
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add product picker modal - VALIDATION RULES APPLIED */}
            {addingType && currentOutfit && (
                <div className="modal-overlay" onClick={() => setAddingType(null)}>
                    <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <span className="font-bold">Choose a {addingType}</span>
                                {currentOutfit.department && (
                                    <p style={{ fontSize: 12, color: 'var(--clr-text-3)', marginTop: 4 }}>
                                        <Lock size={12} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
                                        Showing {currentOutfit.department} items only
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setAddingType(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {filteredProducts.length === 0 ? (
                                <div className="text-center" style={{ padding: 'var(--sp-8) 0' }}>
                                    <AlertCircle size={32} color="var(--clr-warning)" style={{ margin: '0 auto 12px' }} />
                                    <p className="text-muted">
                                        No {addingType.toLowerCase()} available for {currentOutfit.department || 'your outfit'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid-4 grid" style={{ gap: 'var(--sp-4)' }}>
                                    {filteredProducts.map(p => {
                                        // VALIDATION 3: Highlight if product is already in outfit
                                        const isInOutfit = currentOutfit.products.includes(p.product_id);
                                        const variant = productVariants[p.product_id]?.[0];
                                        const image = variant?.images?.[0];
                                        
                                        return (
                                            <button 
                                                key={p.product_id} 
                                                className="product-picker-item" 
                                                onClick={() => handleAddToOutfit(p)}
                                                disabled={isInOutfit}
                                                style={{ opacity: isInOutfit ? 0.6 : 1, cursor: isInOutfit ? 'not-allowed' : 'pointer' }}
                                                title={isInOutfit ? 'Already in outfit' : ''}
                                            >
                                                <div style={{ width: '100%', aspectRatio: '3/4', background: 'var(--clr-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                                    {image ? (
                                                        <img src={image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <Package size={32} color="var(--clr-border)" />
                                                    )}
                                                    {isInOutfit && (
                                                        <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--clr-warning)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <span style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>✓</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: '0 var(--sp-3)', marginTop: 'var(--sp-2)' }}>
                                                    <div className="text-xs font-semibold" style={{ marginTop: 6, textAlign: 'left' }}>{p.name}</div>
                                                    <div className="text-xs text-primary">${Number(p.price).toFixed(2)}</div>
                                                    {variant && (
                                                        <div className="text-xs text-faint" style={{ marginTop: 4 }}>
                                                            {variant.color && <span>{variant.color} · </span>}
                                                            {variant.size && <span>{variant.size}</span>}
                                                        </div>
                                                    )}
                                                    {isInOutfit && (
                                                        <div style={{ fontSize: 10, color: 'var(--clr-warning)', fontWeight: 500, marginTop: 4 }}>
                                                            In outfit
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save/Edit Outfit Modal */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="font-bold">{isEditing ? 'Edit Outfit' : 'Save Outfit'}</span>
                            <button onClick={() => setShowSaveModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body flex-col" style={{ gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Outfit Name *</label>
                                <input 
                                    id="outfit-name-save" 
                                    className="form-input" 
                                    placeholder="e.g. Business Casual" 
                                    value={saveForm.name}
                                    onChange={e => setSaveForm(p => ({ ...p, name: e.target.value }))}
                                    disabled={saving}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Visibility</label>
                                <select 
                                    className="form-select"
                                    value={saveForm.visibility}
                                    onChange={e => setSaveForm(p => ({ ...p, visibility: e.target.value }))}
                                    disabled={saving}
                                >
                                    <option value="private">Private — only you can see</option>
                                    <option value="public">Public — visible to everyone</option>
                                </select>
                            </div>
                            <div style={{ padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: 'var(--r-lg)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <p style={{ fontSize: 12, color: 'var(--clr-text-2)', margin: 0 }}>
                                    📊 {currentOutfit?.products.length || 0} item(s) · 🔒 {currentOutfit?.department || 'Unknown'} only
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button 
                                className="btn btn-ghost" 
                                onClick={() => setShowSaveModal(false)}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button 
                                id={isEditing ? 'save-changes-btn' : 'save-outfit-btn'}
                                className="btn btn-primary" 
                                onClick={isEditing ? handleEditOutfit : handleSaveOutfit}
                                disabled={saving || !saveForm.name.trim()}
                            >
                                {saving ? '⏳ Saving...' : (isEditing ? 'Save Changes' : 'Save Outfit')}
                            </button>
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
        .outfit-slot-empty { width: 100%; aspect-ratio: 3/4; border: 2px dashed var(--clr-border-2); border-radius: var(--r-lg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--clr-text-3); font-size: 12px; font-weight: 500; transition: all var(--tr-fast); background: transparent; cursor: pointer; }
        .outfit-slot-empty:hover { border-color: var(--clr-primary); color: var(--clr-primary); background: rgba(192,132,252,0.05); }
        .product-picker-item { text-align: left; border: 1.5px solid var(--clr-border); border-radius: var(--r-lg); overflow: hidden; padding: 0 0 var(--sp-3); transition: all var(--tr-fast); background: transparent; cursor: pointer; }
        .product-picker-item:not([disabled]):hover { border-color: var(--clr-primary); transform: translateY(-2px); }
        .product-picker-item img { width: 100%; aspect-ratio: 3/4; object-fit: cover; }
        .product-picker-item > div { padding: 0 var(--sp-3); margin-top: var(--sp-2); }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; }
        .badge-info { background: rgba(59,130,246,0.1); color: var(--clr-primary); }
        .badge-success { background: rgba(34,197,94,0.1); color: rgb(34,197,94); }
        .badge-muted { background: rgba(156,163,175,0.1); color: var(--clr-text-3); }
        @media (max-width: 900px) { .outfit-grid { grid-template-columns: 1fr; } .outfit-canvas { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .outfit-canvas { grid-template-columns: 1fr; } }
      `}</style>
        </div>
    );
}
