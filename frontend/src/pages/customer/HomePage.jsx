import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Star, TrendingUp, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { useProducts } from '../../api/products';
import ProductCard from '../../components/ui/ProductCard';
import TextPressure from '../../components/ui/TextPressure';

const DEFAULT_SLIDES = [
    { title: 'New Season', sub: 'Arrivals', tag: 'Spring/Summer 2026', cta: 'Shop Collection', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80', link: '/products' },
    { title: 'Curated', sub: 'Outfits', tag: 'Build Your Look', cta: 'Create Outfit', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80', link: '/outfits/builder' },
    { title: 'Premium', sub: 'Accessories', tag: 'Complete Your Style', cta: 'Shop Now', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', link: '/products' },
];

const benefits = [
    { icon: Truck, title: 'Free Shipping', desc: 'On all orders over $150' },
    { icon: RefreshCw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
    { icon: ShieldCheck, title: 'Secure Payment', desc: 'Your data is always protected' },
    { icon: Star, title: 'Premium Quality', desc: 'Curated from top designers' },
];

export default function HomePage() {
    const [slide, setSlide] = useState(0);
    const [heroSlides, setHeroSlides] = useState(() => {
        try { return JSON.parse(localStorage.getItem('moda_hero_slides')) || DEFAULT_SLIDES; }
        catch { return DEFAULT_SLIDES; }
    });

    // Fetch real products from backend
    const { products: newArrivals, loading: loadingNew } = useProducts({});

    useEffect(() => {
        const t = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 5000);
        return () => clearInterval(t);
    }, [heroSlides.length]);

    // Listen for admin updates to hero slides
    useEffect(() => {
        const onStorage = () => {
            try {
                const slides = JSON.parse(localStorage.getItem('moda_hero_slides'));
                if (slides) setHeroSlides(slides);
            } catch { }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const s = heroSlides[slide];

    return (
        <div className="homepage">
            {/* ── HERO ── */}
            <section className="hero" style={{ backgroundImage: `url(${s.img})` }}>
                <div className="hero-overlay" />
                <div className="container hero-content animate-fadeIn" key={slide}>
                    <span className="hero-tag">{s.tag}</span>
                    <div className="hero-title-pressure">
                        <TextPressure
                            text={`${s.title} ${s.sub}`}
                            fontFamily="Compressa VF"
                            fontUrl="https://res.cloudinary.com/dr6lvwubh/raw/upload/v1529908256/CompressaPRO-GX.woff2"
                            flex={true}
                            alpha={false}
                            stroke={false}
                            width={true}
                            weight={true}
                            italic={true}
                            textColor="#ffffff"
                            minFontSize={36}
                        />
                    </div>
                    <p className="hero-sub">Discover the latest trends in fashion. Premium quality, thoughtfully curated.</p>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        <Link to={s.link} className="btn btn-primary btn-lg" id="hero-cta">
                            {s.cta} <ArrowRight size={18} />
                        </Link>
                        <Link to="/outfits/builder" className="btn btn-outline btn-lg"><Sparkles size={18} /> Build Outfit</Link>
                    </div>
                </div>
                <div className="hero-dots">
                    {heroSlides.map((_, i) => (
                        <button key={i} className={`hero-dot${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)} />
                    ))}
                </div>
            </section>

            {/* ── BENEFITS ── */}
            <section style={{ background: 'var(--clr-bg-2)', borderBottom: '1px solid var(--clr-border)' }}>
                <div className="container">
                    <div className="benefits-grid">
                        {benefits.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="benefit-item">
                                <div className="benefit-icon"><Icon size={22} /></div>
                                <div>
                                    <div className="font-semibold" style={{ fontSize: 14 }}>{title}</div>
                                    <div className="text-xs text-faint">{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRODUCTS ── */}
            {!loadingNew && newArrivals.length > 0 && (
                <section className="section" style={{ background: 'var(--clr-bg-2)' }}>
                    <div className="container">
                        <div className="section-header flex items-center justify-between">
                            <div>
                                <h2 className="section-title">New Arrivals</h2>
                                <p className="section-sub">The latest pieces just added to our collection</p>
                            </div>
                            <Link to="/products" className="btn btn-outline">View All <ArrowRight size={15} /></Link>
                        </div>
                        <div className="grid-4 grid" style={{ gap: 'var(--sp-6)' }}>
                            {newArrivals.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
                        </div>
                    </div>
                </section>
            )}

            {/* ── EMPTY STATE — show when no products yet ── */}
            {!loadingNew && newArrivals.length === 0 && (
                <section className="section" style={{ background: 'var(--clr-bg-2)' }}>
                    <div className="container text-center" style={{ padding: 'var(--sp-20) 0' }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🛍️</div>
                        <h2 className="section-title" style={{ marginBottom: 12 }}>Your Store is Ready!</h2>
                        <p className="text-muted" style={{ marginBottom: 24 }}>Sign in as admin and add products to start selling.</p>
                        <Link to="/login" className="btn btn-primary btn-lg">Go to Admin Panel</Link>
                    </div>
                </section>
            )}

            {/* ── PROMO BANNER ── */}
            <section className="promo-banner">
                <div className="container promo-inner">
                    <div className="promo-text">
                        <span className="badge badge-primary" style={{ marginBottom: 12 }}><Sparkles size={12} /> Exclusive Offer</span>
                        <h2 className="section-title display" style={{ color: 'white' }}>Build Your <em>Perfect Outfit</em></h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 15 }}>Mix and match from thousands of pieces to create your signature look.</p>
                        <Link to="/outfits/builder" className="btn btn-primary btn-lg" style={{ marginTop: 28 }} id="promo-outfit-btn">
                            Start Building <ArrowRight size={18} />
                        </Link>
                    </div>
                    <div className="promo-img">
                        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" alt="Outfit styling" />
                    </div>
                </div>
            </section>

            <style>{`
        .hero { position: relative; height: 88vh; min-height: 560px; max-height: 860px; background-size: cover; background-position: center; background-repeat: no-repeat; display: flex; align-items: center; transition: background-image 0.8s ease; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 100%); }
        .hero-content { position: relative; z-index: 1; max-width: 640px; }
        .hero-tag { display: inline-block; background: rgba(192,132,252,0.2); border: 1px solid rgba(192,132,252,0.4); color: var(--clr-primary); padding: 4px 14px; border-radius: var(--r-full); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: var(--sp-5); }
        .hero-title { font-size: clamp(48px, 7vw, 88px); font-weight: 700; color: white; line-height: 1.08; margin-bottom: var(--sp-5); }
        .hero-title em { color: var(--clr-primary); font-style: italic; }
        .hero-title-pressure { height: clamp(64px, 10vw, 110px); margin-bottom: var(--sp-5); }
        .hero-sub { font-size: 17px; color: rgba(255,255,255,0.75); margin-bottom: var(--sp-8); max-width: 480px; }
        .hero-dots { position: absolute; bottom: var(--sp-8); left: 50%; transform: translateX(-50%); display: flex; gap: var(--sp-2); z-index: 1; }
        .hero-dot { width: 8px; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.3s; }
        .hero-dot.active { width: 28px; background: var(--clr-primary); }
        .benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-1); padding: var(--sp-6) 0; }
        .benefit-item { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-5); }
        .benefit-icon { width: 46px; height: 46px; border-radius: var(--r-md); background: rgba(192,132,252,0.1); border: 1px solid rgba(192,132,252,0.2); display: flex; align-items: center; justify-content: center; color: var(--clr-primary); flex-shrink: 0; }
        .promo-banner { background: linear-gradient(135deg, #0f0a1e 0%, #1a0836 50%, #0f0a1e 100%); border-top: 1px solid rgba(192,132,252,0.1); border-bottom: 1px solid rgba(192,132,252,0.1); padding: var(--sp-20) 0; }
        .promo-inner { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-16); align-items: center; }
        .promo-img { border-radius: var(--r-xl); overflow: hidden; box-shadow: var(--shadow-glow); }
        .promo-img img { width: 100%; aspect-ratio: 4/5; object-fit: cover; }
        @media (max-width: 900px) { .benefits-grid { grid-template-columns: repeat(2, 1fr); } .promo-inner { grid-template-columns: 1fr; } .promo-img { display: none; } }
        @media (max-width: 640px) { .hero { height: 72vh; } .benefits-grid { grid-template-columns: 1fr; gap: 0; } }
      `}</style>
        </div>
    );
}
