import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useProducts } from '../../api/products';
import ProductCard from '../../components/ui/ProductCard';

const pieceTypes = ['top', 'bottom', 'outerwear', 'footwear', 'accessory'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];

function FilterSection({ title, open, toggle, children }) {
    return (
        <div className="filter-section">
            <button className="filter-section-btn" onClick={toggle}>
                <span className="font-semibold text-sm">{title}</span>
                {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {open && <div className="filter-body">{children}</div>}
        </div>
    );
}

export default function CatalogPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [openSections, setOpenSections] = useState({ cat: true, piece: true, size: true, price: true });
    const [priceMax, setPriceMax] = useState(500);

    const activeCat = searchParams.get('category') ? Number(searchParams.get('category')) : null;
    const activePiece = searchParams.get('piece') || null;
    const activeSize = searchParams.get('size') || null;
    const sortBy = searchParams.get('sort') || 'newest';
    const query = searchParams.get('q') || '';

    const setParam = (key, val) => {
        const p = new URLSearchParams(searchParams);
        if (val) p.set(key, val); else p.delete(key);
        setSearchParams(p);
    };

    const clearAll = () => setSearchParams({});

    const toggle = k => setOpenSections(s => ({ ...s, [k]: !s[k] }));

    // Fetch from real API — pass search and category as params
    const { products, loading } = useProducts({
        ...(query ? { search: query } : {}),
        ...(activeCat ? { category: activeCat } : {}),
        ...(priceMax < 500 ? { max_price: priceMax } : {}),
    });

    // Build categories list from actual product data
    const parents = useMemo(() => {
        const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
        return cats.map((c) => ({ id: c, name: c }));
    }, [products]);

    const filtered = useMemo(() => {
        let list = [...products];
        if (activePiece) list = list.filter(p => p.piece_type === activePiece);
        if (activeSize) list = list.filter(p => p.variants.some(v => v.size === activeSize));
        if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
        if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
        if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
        return list;
    }, [products, activePiece, activeSize, sortBy]);


    const Filters = () => (
        <div className="filters-panel">
            <div className="filters-header">
                <span className="font-bold text-base">Filters</span>
                <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear All</button>
            </div>

            <FilterSection title="Category" open={openSections.cat} toggle={() => toggle('cat')}>
                <div className="flex-col" style={{ gap: 6 }}>
                    <button className={`filter-opt${!activeCat ? ' active' : ''}`} onClick={() => setParam('category', null)}>All Categories</button>
                    {parents.map(c => (
                        <button key={c.id} className={`filter-opt${activeCat === c.id ? ' active' : ''}`} onClick={() => setParam('category', activeCat === c.id ? null : c.id)}>
                            {c.name}
                        </button>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Piece Type" open={openSections.piece} toggle={() => toggle('piece')}>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {pieceTypes.map(pt => (
                        <button key={pt} className={`size-btn${activePiece === pt ? ' active' : ''}`} onClick={() => setParam('piece', activePiece === pt ? null : pt)}>
                            {pt.charAt(0).toUpperCase() + pt.slice(1)}
                        </button>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Size" open={openSections.size} toggle={() => toggle('size')}>
                <div className="size-btns">
                    {sizes.map(s => (
                        <button key={s} className={`size-btn${activeSize === s ? ' active' : ''}`} onClick={() => setParam('size', activeSize === s ? null : s)}>{s}</button>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Max Price" open={openSections.price} toggle={() => toggle('price')}>
                <div style={{ paddingTop: 8 }}>
                    <div className="flex justify-between text-sm" style={{ marginBottom: 10 }}>
                        <span className="text-muted">$0</span>
                        <span className="text-primary font-bold">${priceMax}</span>
                    </div>
                    <input type="range" min={20} max={500} step={10} value={priceMax} onChange={e => setPriceMax(Number(e.target.value))}
                        style={{ '--val': `${((priceMax - 20) / 480) * 100}%` }} />
                </div>
            </FilterSection>
        </div>
    );

    return (
        <div className="page">
            <div className="container" style={{ paddingTop: 'var(--sp-8)' }}>
                <div className="breadcrumb">
                    <Link to="/">Home</Link> / <span>All Products</span>
                    {query && <> / <span>"{query}"</span></>}
                </div>

                {/* Top bar */}
                <div className="catalog-topbar">
                    <div>
                        <h1 className="text-2xl font-bold">{query ? `Results for "${query}"` : 'All Products'}</h1>
                        <p className="text-sm text-muted">{filtered.length} items found</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-outline btn-sm mobile-only" onClick={() => setMobileFiltersOpen(v => !v)}>
                            <SlidersHorizontal size={15} /> Filters
                        </button>
                        <select className="form-select" style={{ width: 'auto', paddingRight: 36 }} value={sortBy} onChange={e => setParam('sort', e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="price-asc">Price: Low → High</option>
                            <option value="price-desc">Price: High → Low</option>
                            <option value="rating">Best Rated</option>
                        </select>
                    </div>
                </div>

                {/* Active filters */}
                {(activeCat || activePiece || activeSize || query) && (
                    <div className="flex flex-wrap gap-2" style={{ marginBottom: 'var(--sp-6)' }}>
                        {activeCat && <span className="badge badge-primary" style={{ cursor: 'pointer', gap: 4 }} onClick={() => setParam('category', null)}>{parents.find(c => c.id === activeCat)?.name} <X size={11} /></span>}
                        {activePiece && <span className="badge badge-primary" style={{ cursor: 'pointer', gap: 4 }} onClick={() => setParam('piece', null)}>{activePiece} <X size={11} /></span>}
                        {activeSize && <span className="badge badge-primary" style={{ cursor: 'pointer', gap: 4 }} onClick={() => setParam('size', null)}>Size: {activeSize} <X size={11} /></span>}
                        {query && <span className="badge badge-primary" style={{ cursor: 'pointer', gap: 4 }} onClick={() => setParam('q', null)}>"{query}" <X size={11} /></span>}
                    </div>
                )}

                <div className="layout-sidebar">
                    {/* Filters — desktop */}
                    <div className="desktop-only" style={{ display: 'block' }}>
                        <Filters />
                    </div>

                    {/* Product grid */}
                    <div>
                        {filtered.length === 0 ? (
                            <div className="text-center" style={{ padding: 'var(--sp-20) 0' }}>
                                <p className="text-2xl" style={{ marginBottom: 8 }}>😮‍💨</p>
                                <p className="font-semibold">No products found</p>
                                <p className="text-muted text-sm" style={{ marginTop: 6 }}>Try adjusting your filters or search term</p>
                                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={clearAll}>Clear Filters</button>
                            </div>
                        ) : loading ? (
                            <div className="text-center" style={{ padding: 'var(--sp-20) 0' }}>
                                <p className="text-muted">Loading products...</p>
                            </div>
                        ) : (
                            <div className="grid-3 grid" style={{ gap: 'var(--sp-5)' }}>
                                {filtered.map(p => <ProductCard key={p.id} product={p} />)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile filter overlay */}
            {mobileFiltersOpen && (
                <div className="modal-overlay" onClick={() => setMobileFiltersOpen(false)}>
                    <div className="modal" style={{ maxWidth: 340, height: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="font-bold">Filters</span>
                            <button onClick={() => setMobileFiltersOpen(false)}><X size={20} /></button>
                        </div>
                        <div style={{ padding: 'var(--sp-4)' }}>
                            <Filters />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary w-full" onClick={() => setMobileFiltersOpen(false)}>
                                Show {filtered.length} Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .catalog-topbar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--sp-6); flex-wrap: wrap; gap: var(--sp-4); }
        .filters-panel { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-lg); overflow: hidden; position: sticky; top: calc(var(--header-h) + 16px); }
        .filters-header { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--clr-border); }
        .filter-section { border-bottom: 1px solid var(--clr-border); }
        .filter-section:last-child { border-bottom: none; }
        .filter-section-btn { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: var(--sp-4) var(--sp-5); cursor: pointer; transition: background var(--tr-fast); }
        .filter-section-btn:hover { background: var(--clr-surface-2); }
        .filter-body { padding: 0 var(--sp-5) var(--sp-4); }
        .filter-opt { display: block; padding: 7px 10px; border-radius: var(--r-sm); font-size: 13px; color: var(--clr-text-2); text-align: left; width: 100%; transition: all var(--tr-fast); }
        .filter-opt:hover, .filter-opt.active { background: rgba(192,132,252,0.08); color: var(--clr-primary); }
        .desktop-only { display: block; }
        .mobile-only { display: none; }
        @media (max-width: 900px) { .desktop-only { display: none !important; } .mobile-only { display: flex !important; } }
      `}</style>
        </div>
    );
}
