import { useState } from 'react';
import { Plus, Trash2, Save, Eye, Image, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const DEFAULT_SLIDES = [
    { title: 'New Season', sub: 'Arrivals', tag: 'Spring/Summer 2026', cta: 'Shop Collection', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80', link: '/products' },
    { title: 'Curated', sub: 'Outfits', tag: 'Build Your Look', cta: 'Create Outfit', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80', link: '/outfits' },
    { title: 'Premium', sub: 'Accessories', tag: 'Complete Your Style', cta: 'Shop Now', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', link: '/products' },
];

function SlideEditor({ slide, index, total, onChange, onDelete, onMove }) {
    return (
        <div className="card card-body" style={{ marginBottom: 16 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <span className="font-bold">Slide {index + 1}</span>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">
                        <ArrowUp size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Move down">
                        <ArrowDown size={14} />
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--clr-error)' }} onClick={() => onDelete(index)} title="Delete slide">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div style={{ borderRadius: 12, overflow: 'hidden', height: 140, position: 'relative', marginBottom: 16, background: '#111' }}>
                {slide.img && <img src={slide.img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16 }}>
                    <div style={{ fontSize: 11, color: 'rgba(192,132,252,0.9)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{slide.tag}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{slide.title} <em style={{ color: 'var(--clr-primary)', fontStyle: 'italic' }}>{slide.sub}</em></div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Heading (line 1)</label>
                    <input className="form-input" value={slide.title} onChange={e => onChange(index, 'title', e.target.value)} placeholder="New Season" />
                </div>
                <div className="form-group">
                    <label className="form-label">Heading (line 2 — italic)</label>
                    <input className="form-input" value={slide.sub} onChange={e => onChange(index, 'sub', e.target.value)} placeholder="Arrivals" />
                </div>
                <div className="form-group">
                    <label className="form-label">Tag / Badge</label>
                    <input className="form-input" value={slide.tag} onChange={e => onChange(index, 'tag', e.target.value)} placeholder="Spring/Summer 2026" />
                </div>
                <div className="form-group">
                    <label className="form-label">Button Text</label>
                    <input className="form-input" value={slide.cta} onChange={e => onChange(index, 'cta', e.target.value)} placeholder="Shop Collection" />
                </div>
                <div className="form-group">
                    <label className="form-label">Button Link</label>
                    <input className="form-input" value={slide.link} onChange={e => onChange(index, 'link', e.target.value)} placeholder="/products" />
                </div>
                <div className="form-group">
                    <label className="form-label">Background Image URL</label>
                    <input className="form-input" value={slide.img} onChange={e => onChange(index, 'img', e.target.value)} placeholder="https://..." />
                </div>
            </div>
        </div>
    );
}

export default function AdminHomepagePage() {
    const { showToast } = useApp();
    const [slides, setSlides] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_hero_slides')) || DEFAULT_SLIDES; }
        catch { return DEFAULT_SLIDES; }
    });
    const [saved, setSaved] = useState(false);

    const handleChange = (index, field, value) => {
        setSlides(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
        setSaved(false);
    };

    const handleDelete = (index) => {
        if (slides.length <= 1) { showToast('Need at least 1 slide', 'error'); return; }
        setSlides(prev => prev.filter((_, i) => i !== index));
        setSaved(false);
    };

    const handleMove = (index, direction) => {
        const newSlides = [...slides];
        const target = index + direction;
        if (target < 0 || target >= newSlides.length) return;
        [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
        setSlides(newSlides);
        setSaved(false);
    };

    const addSlide = () => {
        setSlides(prev => [...prev, {
            title: 'New Slide', sub: 'Title', tag: 'Tag Here', cta: 'Shop Now',
            img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
            link: '/products'
        }]);
        setSaved(false);
    };

    const saveChanges = () => {
        localStorage.setItem('moda_hero_slides', JSON.stringify(slides));
        // Notify other tabs
        window.dispatchEvent(new StorageEvent('storage', { key: 'moda_hero_slides', newValue: JSON.stringify(slides) }));
        setSaved(true);
        showToast('Homepage saved successfully!');
    };

    const resetToDefault = () => {
        setSlides(DEFAULT_SLIDES);
        setSaved(false);
        showToast('Reset to default slides', 'info');
    };

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 900 }}>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 32, paddingTop: 16 }}>
                    <div>
                        <h1 className="text-3xl font-bold">Homepage Editor</h1>
                        <p className="text-muted text-sm" style={{ marginTop: 6 }}>Edit the hero slideshow shown on the homepage</p>
                    </div>
                    <div className="flex gap-3">
                        <a href="/" target="_blank" className="btn btn-outline btn-sm">
                            <Eye size={15} /> Preview
                        </a>
                        <button className="btn btn-ghost btn-sm" onClick={resetToDefault}>Reset</button>
                        <button className="btn btn-primary" onClick={saveChanges}>
                            <Save size={16} /> {saved ? 'Saved ✓' : 'Save Changes'}
                        </button>
                    </div>
                </div>

                {/* Slides */}
                <div className="card card-body" style={{ marginBottom: 24 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                        <h2 className="font-bold text-lg">Hero Slides ({slides.length})</h2>
                        <button className="btn btn-outline btn-sm" onClick={addSlide}>
                            <Plus size={15} /> Add Slide
                        </button>
                    </div>

                    {slides.map((slide, i) => (
                        <SlideEditor
                            key={i}
                            slide={slide}
                            index={i}
                            total={slides.length}
                            onChange={handleChange}
                            onDelete={handleDelete}
                            onMove={handleMove}
                        />
                    ))}
                </div>

                {/* Tips */}
                <div className="card card-body" style={{ background: 'rgba(192,132,252,0.05)', border: '1px solid rgba(192,132,252,0.2)' }}>
                    <h3 className="font-semibold" style={{ marginBottom: 12, color: 'var(--clr-primary)' }}>💡 Tips for great hero images</h3>
                    <ul style={{ listStyle: 'disc', paddingLeft: 20, color: 'var(--clr-text-2)', fontSize: 14, lineHeight: 2 }}>
                        <li>Use landscape images (at least 1200×800px) for best results</li>
                        <li>Images from <strong>Unsplash</strong>: use <code>https://images.unsplash.com/photo-ID?w=1200&q=80</code></li>
                        <li>Dark images work best so the white text is readable</li>
                        <li>Changes go live immediately after clicking Save</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
