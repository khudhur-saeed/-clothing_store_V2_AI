import { useState, useRef } from 'react';
import { X, Upload, Sparkles, Download, RefreshCw, AlertCircle, Camera, Info } from 'lucide-react';
import { virtualTryOn } from '../../utils/geminiService';

export default function TryOnModal({ product, onClose }) {
    const [userPhoto, setUserPhoto] = useState(null);      // File
    const [preview, setPreview] = useState(null);      // data URL for display
    const [result, setResult] = useState(null);      // base64 from Gemini
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const productImg = product.images.find(i => i.is_primary)?.url || product.images[0]?.url;

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setError('Please upload a valid image file (JPG, PNG, WEBP).');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be under 10 MB.');
            return;
        }
        setError('');
        setResult(null);
        setUserPhoto(file);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleTryOn = async () => {
        if (!userPhoto) { setError('Please upload your photo first.'); return; }
        setLoading(true); setError(''); setResult(null);
        try {
            const base64 = await virtualTryOn(userPhoto, productImg, product.name);
            setResult(base64);
        } catch (err) {
            if (err.message === 'GEMINI_API_KEY_MISSING') {
                setError('⚠️ Gemini API key not set. Add your key to the .env file (VITE_GEMINI_API_KEY).');
            } else if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.toLowerCase().includes('exceeded')) {
                setError('⚠️ AI quota exceeded. The Virtual Try-On feature requires a paid Gemini API plan. Enable billing at aistudio.google.com to use this feature.');
            } else if (err.message?.includes('403')) {
                setError('⚠️ API key does not have permission. Make sure billing is enabled at aistudio.google.com.');
            } else {
                setError(`AI error: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${result}`;
        link.download = `moda-tryon-${product.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="tryon-modal" onClick={e => e.stopPropagation()} id="tryon-modal">
                {/* Header */}
                <div className="tryon-header">
                    <div className="flex items-center gap-3">
                        <div className="tryon-icon"><Sparkles size={18} /></div>
                        <div>
                            <div className="font-bold text-base">Virtual Try-On</div>
                            <div className="text-xs text-faint">Powered by Gemini AI ✨</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose} id="tryon-close"><X size={20} /></button>
                </div>

                <div className="tryon-body">
                    {/* Info banner */}
                    <div className="tryon-info-banner">
                        <Info size={13} />
                        <span>Upload a front-facing photo and we'll show you how <strong>{product.name}</strong> looks on you.</span>
                    </div>

                    {/* Main panels */}
                    <div className="tryon-panels">
                        {/* Left: Upload */}
                        <div className="tryon-panel">
                            <div className="tryon-panel-label"><Camera size={13} /> Your Photo</div>

                            {!preview ? (
                                <div
                                    className={`tryon-dropzone${dragOver ? ' drag' : ''}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    id="tryon-dropzone">
                                    <div className="tryon-dropzone-inner">
                                        <Upload size={32} color="var(--clr-text-3)" />
                                        <p className="font-semibold text-sm" style={{ marginTop: 12 }}>Drop your photo here</p>
                                        <p className="text-xs text-faint">or click to browse</p>
                                        <p className="text-xs text-faint" style={{ marginTop: 8 }}>JPG · PNG · WEBP · Max 10 MB</p>
                                        <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }}>
                                            <Upload size={13} /> Choose Photo
                                        </button>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={e => handleFile(e.target.files[0])} id="tryon-upload-input" />
                                </div>
                            ) : (
                                <div className="tryon-img-preview">
                                    <img src={preview} alt="Your photo" />
                                    <button className="tryon-reupload" onClick={() => { setPreview(null); setUserPhoto(null); setResult(null); }} title="Change photo">
                                        <RefreshCw size={14} /> Change
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                        onChange={e => handleFile(e.target.files[0])} />
                                </div>
                            )}
                        </div>

                        {/* Center arrow */}
                        <div className="tryon-arrow">
                            <div className="tryon-arrow-icon">
                                <Sparkles size={20} />
                            </div>
                            <span className="text-xs text-faint" style={{ marginTop: 6 }}>AI Magic</span>
                        </div>

                        {/* Right: Product + Result */}
                        <div className="tryon-panel">
                            <div className="tryon-panel-label"><Sparkles size={13} /> {result ? 'Your Look 🎉' : 'Product'}</div>
                            <div className="tryon-img-preview">
                                {result ? (
                                    <>
                                        <img src={`data:image/png;base64,${result}`} alt="Try-on result" className="tryon-result-img" />
                                        <button className="tryon-reupload" onClick={handleDownload} title="Download result">
                                            <Download size={14} /> Save
                                        </button>
                                    </>
                                ) : loading ? (
                                    <div className="tryon-loading">
                                        <div className="tryon-spinner" />
                                        <p className="text-sm font-semibold" style={{ marginTop: 16 }}>Generating your look…</p>
                                        <p className="text-xs text-faint">This may take 10–30 seconds</p>
                                    </div>
                                ) : (
                                    <img src={productImg} alt={product.name} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product info row */}
                    <div className="tryon-product-info">
                        <img src={productImg} alt={product.name} style={{ width: 36, height: 44, objectFit: 'cover', borderRadius: 'var(--r-sm)' }} />
                        <div style={{ flex: 1 }}>
                            <div className="font-semibold text-sm">{product.name}</div>
                            <div className="text-xs text-faint">{product.category} · {product.piece_type}</div>
                        </div>
                        <div className="text-primary font-bold">${product.variants[0]?.price.toFixed(2)}</div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="alert alert-error animate-slideUp">
                            <AlertCircle size={15} />
                            <span style={{ fontSize: 13 }}>{error}</span>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="tryon-footer">
                        {result ? (
                            <div className="flex gap-3 w-full">
                                <button className="btn btn-outline flex-1" onClick={() => setResult(null)}>
                                    <RefreshCw size={15} /> Try Again
                                </button>
                                <button className="btn btn-primary flex-1" onClick={handleDownload} id="tryon-download-btn">
                                    <Download size={15} /> Download Look
                                </button>
                            </div>
                        ) : (
                            <button
                                id="tryon-generate-btn"
                                className="btn btn-primary btn-lg w-full"
                                onClick={handleTryOn}
                                disabled={!userPhoto || loading}>
                                {loading
                                    ? <><div className="tryon-spinner-sm" /> Generating…</>
                                    : <><Sparkles size={16} /> Try On with AI</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        .tryon-modal { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-xl); width: 92vw; max-width: 780px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; }
        .tryon-header { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-5) var(--sp-6); border-bottom: 1px solid var(--clr-border); background: linear-gradient(135deg, rgba(192,132,252,0.06), transparent); }
        .tryon-icon { width: 38px; height: 38px; border-radius: var(--r-md); background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent)); display: flex; align-items: center; justify-content: center; color: white; }
        .tryon-body { padding: var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-5); }
        .tryon-info-banner { display: flex; align-items: center; gap: 8px; background: rgba(192,132,252,0.08); border: 1px solid rgba(192,132,252,0.2); border-radius: var(--r-md); padding: var(--sp-3) var(--sp-4); font-size: 13px; color: var(--clr-text-2); }
        .tryon-panels { display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--sp-4); align-items: center; }
        .tryon-panel { display: flex; flex-direction: column; gap: var(--sp-3); }
        .tryon-panel-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--clr-text-3); }
        .tryon-dropzone { border: 2px dashed var(--clr-border-2); border-radius: var(--r-xl); aspect-ratio: 3/4; cursor: pointer; transition: all var(--tr-fast); display: flex; align-items: center; justify-content: center; }
        .tryon-dropzone:hover, .tryon-dropzone.drag { border-color: var(--clr-primary); background: rgba(192,132,252,0.04); }
        .tryon-dropzone-inner { display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--sp-6); }
        .tryon-img-preview { position: relative; border-radius: var(--r-xl); overflow: hidden; aspect-ratio: 3/4; background: var(--clr-bg-3); }
        .tryon-img-preview img { width: 100%; height: 100%; object-fit: cover; }
        .tryon-result-img { animation: fadeIn 0.5s ease; }
        .tryon-reupload { position: absolute; bottom: 10px; right: 10px; display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.7); color: white; padding: 6px 12px; border-radius: var(--r-full); font-size: 12px; font-weight: 600; cursor: pointer; border: none; transition: background var(--tr-fast); }
        .tryon-reupload:hover { background: rgba(0,0,0,0.9); }
        .tryon-arrow { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); }
        .tryon-arrow-icon { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent)); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 20px rgba(192,132,252,0.4); }
        .tryon-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; }
        .tryon-spinner { width: 40px; height: 40px; border: 3px solid var(--clr-border); border-top-color: var(--clr-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        .tryon-spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tryon-product-info { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-4); background: var(--clr-bg-3); border-radius: var(--r-lg); }
        .tryon-footer { display: flex; gap: var(--sp-3); }
        @media (max-width: 600px) { .tryon-panels { grid-template-columns: 1fr; } .tryon-arrow { flex-direction: row; } }
      `}</style>
        </div>
    );
}
