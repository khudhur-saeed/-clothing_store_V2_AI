import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Star, TrendingUp, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { mockProducts, mockCategories } from '../../data/mockData';
import ProductCard from '../../components/ui/ProductCard';

const heroSlides = [
    { title: 'New Season', sub: 'Arrivals', tag: 'Spring/Summer 2026', cta: 'Shop Collection', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80', link: '/products' },
    { title: 'Curated', sub: 'Outfits', tag: 'Build Your Look', cta: 'Create Outfit', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80', link: '/outfits' },
    { title: 'Premium', sub: 'Accessories', tag: 'Complete Your Style', cta: 'Shop Accessories', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80', link: '/products?category=3' },
];

const benefits = [
    { icon: Truck, title: 'Free Shipping', desc: 'On all orders over $150' },
    { icon: RefreshCw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
    { icon: ShieldCheck, title: 'Secure Payment', desc: 'Your data is always protected' },
    { icon: Star, title: 'Premium Quality', desc: 'Curated from top designers' },
];

const catImages = {
    1: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80',
    2: 'https://images.unsplash.com/photo-1490578474895-399ad4351e4c?w=400&q=80',
    3: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
};

export default function HomePage() {
    const [slide, setSlide] = useState(0);
    const parents = mockCategories.filter(c => !c.parent_id);
    const featured = mockProducts.slice(0, 8);
    const trending = [...mockProducts].sort((a, b) => b.review_count - a.review_count).slice(0, 4);

    useEffect(() => {
        const t = setInterval(() => setSlide(s => (s + 1) % heroSlides.length), 5000);
        return () => clearInterval(t);
    }, []);

    const s = heroSlides[slide];

    return (
        <div className="homepage">
            {/* ── HERO ── */}
            <section className="hero" style={{ backgroundImage: `url(${s.img})` }}>
                <div className="hero-overlay" />
                <div className="container hero-content animate-fadeIn" key={slide}>
                    <span className="hero-tag">{s.tag}</span>
                    <h1 className="hero-title display">{s.title} <em>{s.sub}</em></h1>
                    <p className="hero-sub">Discover the latest trends in fashion. Premium quality, thoughtfully curated.</p>
                    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        <Link to={s.link} className="btn btn-primary btn-lg" id="hero-cta">
                            {s.cta} <ArrowRight size={18} />
                        </Link>
                        <Link to="/outfits" className="btn btn-outline btn-lg"><Sparkles size={18} /> Build Outfit</Link>
                    </div>
                </div>
                {/* Slide dots */}
                <div className="hero-dots">
                    {heroSlides.map((_, i) => (
                        <button key={i} className={`hero-dot${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)} aria-label={`Slide ${i + 1}`} />
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

            {/* ── CATEGORIES ── */}
            <section className="section">
                <div className="container">
                    <div className="section-header flex items-center justify-between">
                        <div>
                            <h2 className="section-title">Shop by Category</h2>
                            <p className="section-sub">Explore our curated collections</p>
                        </div>
                        <Link to="/products" className="btn btn-outline">View All <ArrowRight size={15} /></Link>
                    </div>
                    <div className="grid-3 grid" style={{ gap: 'var(--sp-6)' }}>
                        {parents.map(cat => (
                            <Link to={`/products?category=${cat.id}`} key={cat.id} className="cat-card" id={`cat-${cat.id}`}>
                                <img src={catImages[cat.id] || catImages[1]} alt={cat.name} />
                                <div className="cat-card__overlay">
                                    <h3 className="cat-card__name">{cat.name}</h3>
                                    <span className="btn btn-outline btn-sm" style={{ marginTop: 8 }}>Shop Now <ArrowRight size={13} /></span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── NEW ARRIVALS ── */}
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
                        {featured.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                </div>
            </section>

            {/* ── PROMO BANNER ── */}
            <section className="promo-banner">
                <div className="container promo-inner">
                    <div className="promo-text">
                        <span className="badge badge-primary" style={{ marginBottom: 12 }}><Sparkles size={12} /> Exclusive Offer</span>
                        <h2 className="section-title display" style={{ color: 'white' }}>Build Your <em>Perfect Outfit</em></h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 15 }}>Mix and match from thousands of pieces to create your signature look.</p>
                        <Link to="/outfits" className="btn btn-primary btn-lg" style={{ marginTop: 28 }} id="promo-outfit-btn">
                            Start Building <ArrowRight size={18} />
                        </Link>
                    </div>
                    <div className="promo-img">
                        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" alt="Outfit styling" />
                    </div>
                </div>
            </section>

            {/* ── TRENDING ── */}
            <section className="section">
                <div className="container">
                    <div className="section-header flex items-center justify-between">
                        <div>
                            <h2 className="section-title"><TrendingUp size={28} style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle', color: 'var(--clr-primary)' }} />Trending Now</h2>
                            <p className="section-sub">Most loved pieces this season</p>
                        </div>
                    </div>
                    <div className="grid-4 grid" style={{ gap: 'var(--sp-6)' }}>
                        {trending.map(p => <ProductCard key={p.id} product={p} />)}
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
        .hero-sub { font-size: 17px; color: rgba(255,255,255,0.75); margin-bottom: var(--sp-8); max-width: 480px; }
        .hero-dots { position: absolute; bottom: var(--sp-8); left: 50%; transform: translateX(-50%); display: flex; gap: var(--sp-2); z-index: 1; }
        .hero-dot { width: 8px; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.3); cursor: pointer; transition: all 0.3s; }
        .hero-dot.active { width: 28px; background: var(--clr-primary); }
        .benefits-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-1); padding: var(--sp-6) 0; }
        .benefit-item { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-5); }
        .benefit-icon { width: 46px; height: 46px; border-radius: var(--r-md); background: rgba(192,132,252,0.1); border: 1px solid rgba(192,132,252,0.2); display: flex; align-items: center; justify-content: center; color: var(--clr-primary); flex-shrink: 0; }
        .cat-card { position: relative; border-radius: var(--r-xl); overflow: hidden; aspect-ratio: 3/4; display: block; }
        .cat-card img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease; }
        .cat-card:hover img { transform: scale(1.06); }
        .cat-card__overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%); display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; padding: var(--sp-6); }
        .cat-card__name { font-size: 26px; font-weight: 800; color: white; font-family: var(--font-serif); font-style: italic; }
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
