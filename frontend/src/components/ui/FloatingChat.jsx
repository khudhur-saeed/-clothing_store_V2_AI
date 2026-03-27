import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Plus, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage } from '../../utils/geminiService';
import { apiCall } from '../../api/client';

// ── Fallback replies when Gemini key is missing ────────────────────────────
const BOT_REPLIES = [
    "I'm here to help! What would you like to know?",
    "Check out our latest products in the catalog! Free shipping on orders over $150.",
    "For order tracking, go to My Orders in your account menu.",
    "You can apply coupon codes at checkout for discounts. Try SAVE10!",
    "Our return policy allows returns within 30 days of purchase.",
    "Each product page has a size guide to help you pick the right fit.",
];

// ── Markdown-lite renderer ─────────────────────────────────────────────────
function FormattedText({ text }) {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div className="fc-formatted">
            {lines.map((line, i) => {
                if (!line.trim()) return <br key={i} />;
                // Bullet point
                if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                    const content = line.replace(/^[\s\-•]+/, '');
                    return (
                        <div key={i} className="fc-bullet">
                            <span className="fc-bullet-dot">•</span>
                            <span dangerouslySetInnerHTML={{ __html: renderInline(content) }} />
                        </div>
                    );
                }
                // Heading (##)
                if (line.startsWith('## ')) {
                    return <div key={i} className="fc-heading">{line.replace('## ', '')}</div>;
                }
                // Normal paragraph
                return (
                    <p key={i} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
                );
            })}
        </div>
    );
}

function renderInline(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code class="fc-inline-code">$1</code>');
}

// ── Draggable product card carousel (1 card per page) ────────────────────
function ProductCarousel({ products }) {
    const [page, setPage] = useState(0);
    const totalPages = products.length;
    const startX = useRef(null);

    const prev = () => setPage(p => Math.max(0, p - 1));
    const next = () => setPage(p => Math.min(totalPages - 1, p + 1));

    const onTouchStart = e => { startX.current = e.touches[0].clientX; };
    const onTouchEnd = e => {
        if (startX.current === null) return;
        const diff = startX.current - e.changedTouches[0].clientX;
        if (diff > 40) next();
        else if (diff < -40) prev();
        startX.current = null;
    };
    const onMouseDown = e => { startX.current = e.clientX; };
    const onMouseUp = e => {
        if (startX.current === null) return;
        const diff = startX.current - e.clientX;
        if (diff > 40) next();
        else if (diff < -40) prev();
        startX.current = null;
    };

    if (!products?.length) return null;

    // Each card is 100% wide — offset = page * (100% + 10px gap)
    const trackOffset = `calc(-${page * 100}% - ${page * 10}px)`;

    return (
        <div className="fc-carousel-wrap">
            <div className="fc-carousel-label">
                <ShoppingBag size={12} /> Recommended Products
            </div>
            <div
                className="fc-carousel"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
            >
                <div className="fc-carousel-track" style={{ transform: `translateX(${trackOffset})` }}>
                    {products.map((p, i) => (
                        <div key={p.id ?? i} className="fc-product-card">
                            <Link to={`/products/${p.id}`} className="fc-product-img-wrap">
                                {p.image
                                    ? <img src={p.image} alt={p.name} className="fc-product-img" />
                                    : <div className="fc-product-img-placeholder"><ShoppingBag size={28} /></div>
                                }
                                <div className="fc-product-price-badge">${Number(p.price).toFixed(2)}</div>
                            </Link>
                            <div className="fc-product-info">
                                <span className="fc-product-cat">{p.category}</span>
                                <Link to={`/products/${p.id}`} className="fc-product-name">{p.name}</Link>
                                <Link to={`/products/${p.id}`} className="btn btn-primary fc-product-btn">View</Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls — only if more than 2 products (more than 1 page) */}
            {totalPages > 1 && (
                <div className="fc-carousel-controls">
                    <button className="fc-carousel-arrow" onClick={prev} disabled={page === 0}>
                        <ChevronLeft size={14} />
                    </button>
                    <div className="fc-carousel-dots">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <button
                                key={i}
                                className={`fc-dot${i === page ? ' active' : ''}`}
                                onClick={() => setPage(i)}
                            />
                        ))}
                    </div>
                    <button className="fc-carousel-arrow" onClick={next} disabled={page === totalPages - 1}>
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main FloatingChat component ────────────────────────────────────────────
export default function FloatingChat() {
    const { conversations, sendMessage, addBotMessage, createConversation } = useApp();
    const { user } = useAuth();

    const [open, setOpen] = useState(false);
    const [panelSize, setPanelSize] = useState({ width: 380, height: 590 });
    const resizeRef = useRef(null); // { edge, startX, startY, startW, startH }
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [unread, setUnread] = useState(0);
    const [allProducts, setAllProducts] = useState([]);
    const messagesEndRef = useRef(null);

    // ── Resize logic ──────────────────────────────────────────────────────
    const startResize = (edge) => (e) => {
        e.preventDefault();
        resizeRef.current = {
            edge,
            startX: e.clientX,
            startY: e.clientY,
            startW: panelSize.width,
            startH: panelSize.height,
        };
        const onMove = (ev) => {
            if (!resizeRef.current) return;
            const { edge: ed, startX, startY, startW, startH } = resizeRef.current;
            // Panel is anchored bottom-right, so:
            // left handle: dragging left = width increases
            // top handle:  dragging up   = height increases
            const dx = startX - ev.clientX;
            const dy = startY - ev.clientY;
            setPanelSize({
                width:  (ed === 'top')  ? startW : Math.max(300, Math.min(700, startW + dx)),
                height: (ed === 'left') ? startH : Math.max(350, Math.min(window.innerHeight - 140, startH + dy)),
            });
        };
        const onUp = () => {
            resizeRef.current = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };


    const [convId, setConvId] = useState(null);
    const conv = conversations.find(c => c.conversation_id === convId);

    // Fetch products once so AI can reference them
    useEffect(() => {
        apiCall('/products/').then(setAllProducts).catch(() => {});
    }, []);

    useEffect(() => {
        if (open && !convId) {
            if (conversations.length > 0) {
                setConvId(conversations[0].conversation_id);
            } else {
                const newConv = createConversation('Chat with Moda');
                setConvId(newConv.conversation_id);
            }
            setUnread(0);
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conv?.messages.length, typing]);

    const handleSend = async () => {
        if (!input.trim() || !convId) return;
        const msg = input.trim();
        setInput('');
        sendMessage(convId, msg);
        setTyping(true);

        try {
            const history = conv?.messages || [];
            const aiReply = await sendChatMessage(history, msg, allProducts);

            if (aiReply && typeof aiReply === 'object') {
                // Enrich returned products with real images from the variants API
                // (the `/products/` endpoint doesn't include variant images, and AI often fabricates URLs)
                const enriched = await Promise.all((aiReply.products || []).map(async p => {
                    try {
                        const variants = await apiCall(`/products/${p.id}/variants`);
                        let imgUrl = '';
                        // Find the first variant that has an image
                        for (const v of variants) {
                            if (Array.isArray(v.images) && v.images[0]) {
                                imgUrl = v.images[0]; break;
                            } else if (typeof v.images === 'string' && v.images) {
                                imgUrl = v.images.split(',')[0].trim(); break;
                            }
                        }
                        return { ...p, image: imgUrl || p.image || '' };
                    } catch {
                        return p;
                    }
                }));
                addBotMessage(convId, aiReply.text, enriched);
            } else {
                // null = no API key, use fallback
                addBotMessage(convId, BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)]);
            }
        } catch {
            addBotMessage(convId, BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)]);
        }
        setTyping(false);
    };

    const handleNewConv = () => {
        const newConv = createConversation('New chat');
        setConvId(newConv.conversation_id);
    };

    const formatTime = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
        <>
            {/* Floating button */}
            <button
                id="floating-chat-btn"
                className={`floating-chat-btn${open ? ' open' : ''}`}
                onClick={() => { setOpen(v => !v); setUnread(0); }}
                aria-label="Open chat"
            >
                {open ? <X size={22} /> : <MessageCircle size={22} />}
                {unread > 0 && !open && <span className="chat-badge">{unread}</span>}
            </button>

            {/* Chat panel */}
            {open && (
                <div
                    className="floating-chat-panel animate-slideUp"
                    id="floating-chat-panel"
                    style={{ width: panelSize.width, maxHeight: panelSize.height }}
                >
                    {/* ── Resize handles ── */}
                    {/* Top edge */}
                    <div className="fc-resize-handle fc-resize-top" onMouseDown={startResize('top')} />
                    {/* Left edge */}
                    <div className="fc-resize-handle fc-resize-left" onMouseDown={startResize('left')} />
                    {/* Top-left corner (both axes) */}
                    <div className="fc-resize-handle fc-resize-corner" onMouseDown={startResize('corner')} />

                    {/* Header */}
                    <div className="fc-header">
                        <div className="flex items-center gap-3">
                            <div className="fc-avatar"><Bot size={16} /></div>
                            <div>
                                <div className="font-bold text-sm">Moda Assistant</div>
                                <div className="text-xs" style={{ color: 'var(--clr-success)' }}>● Online — ask me anything!</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleNewConv} title="New conversation"><Plus size={15} /></button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)} title="Close"><X size={15} /></button>
                        </div>
                    </div>

                    {/* Conversation switcher */}
                    {conversations.length > 1 && (
                        <div className="fc-conv-tabs">
                            {conversations.slice(0, 4).map(c => (
                                <button key={c.conversation_id}
                                    className={`fc-conv-tab${convId === c.conversation_id ? ' active' : ''}`}
                                    onClick={() => setConvId(c.conversation_id)}>
                                    {c.title.slice(0, 14)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Messages */}
                    <div className="fc-messages">
                        {!user && (
                            <div className="fc-guest-note">
                                <Bot size={16} />
                                <span>You're chatting as a guest. <a href="/login" style={{ color: 'var(--clr-primary)' }}>Sign in</a> for order-related help.</span>
                            </div>
                        )}

                        {conv?.messages.map(msg => (
                            <div key={msg.message_id} className={`fc-msg ${msg.sender_type}`}>
                                {msg.sender_type === 'bot' && (
                                    <div className="fc-bot-dot"><Bot size={10} /></div>
                                )}
                                <div className="flex-col" style={{ gap: 4, alignItems: msg.sender_type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                                    <div className={`chat-bubble ${msg.sender_type}`}>
                                        {msg.sender_type === 'bot'
                                            ? <FormattedText text={msg.content} />
                                            : <span style={{ fontSize: 13 }}>{msg.content}</span>
                                        }
                                    </div>
                                    {/* Product carousel attached to bot messages */}
                                    {msg.sender_type === 'bot' && msg.products?.length > 0 && (
                                        <ProductCarousel products={msg.products} />
                                    )}
                                    <div className="text-xs" style={{ color: 'var(--clr-text-3)', padding: '0 4px' }}>{formatTime(msg.sent_at)}</div>
                                </div>
                            </div>
                        ))}

                        {typing && (
                            <div className="fc-msg bot">
                                <div className="fc-bot-dot"><Bot size={10} /></div>
                                <div className="chat-bubble bot" style={{ padding: '10px 14px' }}>
                                    <div className="typing-dots"><span /><span /><span /></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick suggestions */}
                    {conv?.messages.length <= 1 && (
                        <div className="fc-suggestions">
                            {['Recommend a outfit', 'Active coupons', 'Return policy', 'Sizing help'].map(s => (
                                <button key={s} className="fc-suggest-btn" onClick={() => { setInput(s); }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="fc-input-row">
                        <input
                            id="floating-chat-input"
                            className="form-input"
                            style={{ flex: 1, fontSize: 13, padding: '9px 14px', background: 'var(--glass-bg-heavy)', backdropFilter: 'var(--glass-blur-sm)', WebkitBackdropFilter: 'var(--glass-blur-sm)' }}
                            placeholder="Ask about products, orders…"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            disabled={typing}
                            autoFocus
                        />
                        <button
                            id="floating-chat-send"
                            className="btn btn-primary"
                            style={{ padding: '9px 14px' }}
                            onClick={handleSend}
                            disabled={!input.trim() || typing}
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        /* ── Floating button ── */
        .floating-chat-btn {
          position: fixed; bottom: 28px; right: 28px; z-index: 1000;
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
          color: white; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 24px rgba(168,85,247,0.55), 0 0 0 1px rgba(255,255,255,0.1);
          transition: all 0.32s cubic-bezier(0.34,1.56,0.64,1); cursor: pointer; border: none;
        }
        .floating-chat-btn:hover { transform: scale(1.12); box-shadow: 0 8px 36px rgba(168,85,247,0.7); }
        .floating-chat-btn.open {
          background: var(--glass-bg-heavy);
          backdrop-filter: var(--glass-blur-sm); -webkit-backdrop-filter: var(--glass-blur-sm);
          color: var(--clr-text); border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-md), var(--shadow-glow-sm);
        }
        .chat-badge { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; border-radius: 50%; background: var(--clr-error); color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

        /* ── Chat panel ── */
        .floating-chat-panel {
          position: fixed; bottom: 96px; right: 28px; z-index: 999;
          width: 380px; max-height: 600px;
          background: var(--glass-bg-heavy);
          backdrop-filter: blur(32px) saturate(1.8);
          -webkit-backdrop-filter: blur(32px) saturate(1.8);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-xl), var(--shadow-glow-sm), inset 0 1px 0 rgba(255,255,255,0.08);
          display: flex; flex-direction: column; overflow: hidden;
        }

        /* ── Header ── */
        .fc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--sp-4) var(--sp-5);
          background: linear-gradient(135deg, rgba(168,85,247,0.14), rgba(240,171,252,0.06));
          border-bottom: 1px solid var(--glass-border);
        }
        .fc-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
          box-shadow: 0 0 14px rgba(168,85,247,0.45);
        }

        /* ── Tabs ── */
        .fc-conv-tabs { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--glass-border); background: rgba(168,85,247,0.04); overflow-x: auto; }
        .fc-conv-tab { padding: 4px 10px; border-radius: var(--r-full); font-size: 11px; font-weight: 600; color: var(--clr-text-3); white-space: nowrap; transition: all var(--tr-fast); }
        .fc-conv-tab:hover, .fc-conv-tab.active { background: rgba(168,85,247,0.14); color: var(--clr-primary); }

        /* ── Messages ── */
        .fc-messages {
          flex: 1; overflow-y: auto; padding: var(--sp-4);
          display: flex; flex-direction: column; gap: var(--sp-3); scroll-behavior: smooth;
        }
        .fc-messages::-webkit-scrollbar { width: 4px; }
        .fc-messages::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 9999px; }
        .fc-msg { display: flex; gap: 8px; align-items: flex-start; }
        .fc-msg.user { flex-direction: row-reverse; }
        .fc-bot-dot {
          width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
          display: flex; align-items: center; justify-content: center; color: white;
          box-shadow: 0 0 10px rgba(168,85,247,0.35);
        }

        /* ── Formatted text ── */
        .fc-formatted { display: flex; flex-direction: column; gap: 4px; font-size: 13px; line-height: 1.55; }
        .fc-formatted p { margin: 0; }
        .fc-formatted strong { font-weight: 700; color: var(--clr-text); }
        .fc-formatted em { font-style: italic; }
        .fc-inline-code { background: rgba(168,85,247,0.12); color: var(--clr-primary); padding: 1px 5px; border-radius: 4px; font-size: 12px; font-family: monospace; }
        .fc-bullet { display: flex; gap: 8px; align-items: flex-start; }
        .fc-bullet-dot { color: var(--clr-primary); font-weight: 900; flex-shrink: 0; margin-top: 1px; }
        .fc-heading { font-weight: 700; font-size: 13px; color: var(--clr-primary); margin-top: 4px; letter-spacing: 0.02em; }

        /* ── Product Carousel ── */
        .fc-carousel-wrap {
          width: 100%; overflow: hidden;
          background: linear-gradient(135deg, rgba(168,85,247,0.07), rgba(240,171,252,0.04));
          border: 1px solid rgba(168,85,247,0.18);
          border-radius: var(--r-lg); padding: 10px 10px 8px;
          margin-top: 6px; user-select: none;
        }
        .fc-carousel-label {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--clr-primary); margin-bottom: 8px;
        }
        .fc-carousel { overflow: hidden; width: 100%; cursor: grab; }
        .fc-carousel:active { cursor: grabbing; }
        .fc-carousel-track {
          display: flex; gap: 10px;
          transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .fc-product-card {
          flex: 0 0 100%;
          background: var(--clr-surface);
          border: 1px solid var(--clr-border);
          border-radius: var(--r-lg);
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .fc-product-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(168,85,247,0.18); }
        .fc-product-img-wrap {
          position: relative; width: 100%; height: 150px;
          overflow: hidden; background: var(--clr-bg-3); display: block;
        }
        .fc-product-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.3s; }
        .fc-product-card:hover .fc-product-img { transform: scale(1.04); }
        .fc-product-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--clr-text-3); }
        .fc-product-price-badge {
          position: absolute; bottom: 5px; right: 5px;
          background: var(--clr-primary); color: white;
          font-size: 10px; font-weight: 800;
          padding: 2px 6px; border-radius: var(--r-full);
          box-shadow: 0 2px 8px rgba(168,85,247,0.45);
        }
        .fc-product-info { padding: 6px 8px 8px; display: flex; flex-direction: column; gap: 2px; }
        .fc-product-cat { font-size: 9px; color: var(--clr-text-3); text-transform: capitalize; font-weight: 500; }
        .fc-product-name {
          font-size: 11px; font-weight: 700; color: var(--clr-text); text-decoration: none;
          line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .fc-product-name:hover { color: var(--clr-primary); }
        .fc-product-btn { font-size: 10px !important; padding: 4px 8px !important; margin-top: 4px; text-decoration: none; display: flex; align-items: center; justify-content: center; width: 100%; border-radius: var(--r-md) !important; }

        .fc-carousel-controls { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px; }
        .fc-carousel-arrow {
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25);
          color: var(--clr-primary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all var(--tr-fast);
        }
        .fc-carousel-arrow:hover:not(:disabled) { background: rgba(168,85,247,0.2); }
        .fc-carousel-arrow:disabled { opacity: 0.3; cursor: default; }
        .fc-carousel-dots { display: flex; gap: 5px; }
        .fc-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--clr-border); border: none; cursor: pointer;
          transition: all 0.2s; padding: 0;
        }
        .fc-dot.active { background: var(--clr-primary); transform: scale(1.3); }

        /* ── Guest note ── */
        .fc-guest-note { display: flex; align-items: center; gap: 8px; background: rgba(168,85,247,0.07); border: 1px solid rgba(168,85,247,0.18); border-radius: var(--r-md); padding: 8px 12px; font-size: 12px; color: var(--clr-text-3); margin-bottom: 4px; }

        /* ── Suggestions ── */
        .fc-suggestions { padding: 4px 12px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
        .fc-suggest-btn { padding: 5px 11px; border: 1px solid var(--glass-border); border-radius: var(--r-full); font-size: 11px; font-weight: 500; color: var(--clr-text-2); cursor: pointer; background: var(--glass-bg); backdrop-filter: blur(8px); transition: all var(--tr-fast); }
        .fc-suggest-btn:hover { border-color: rgba(168,85,247,0.4); color: var(--clr-primary); background: rgba(168,85,247,0.08); }

        /* ── Input bar ── */
        .fc-input-row { display: flex; gap: 8px; padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--glass-border); background: rgba(168,85,247,0.04); backdrop-filter: blur(16px); }

        /* ── Typing dots ── */
        .typing-dots { display: flex; gap: 4px; align-items: center; }
        .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--clr-text-3); animation: bounce 1.2s infinite; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

        /* ── Resize handles ── */
        .floating-chat-panel { transition: none; } /* disable during drag */
        .fc-resize-handle { position: absolute; z-index: 10; }

        /* Top edge — drag up/down to change height */
        .fc-resize-top {
          top: 0; left: 12px; right: 12px; height: 6px;
          cursor: ns-resize;
          background: transparent;
          border-radius: 3px 3px 0 0;
        }
        .fc-resize-top:hover { background: rgba(168,85,247,0.25); }

        /* Left edge — drag left/right to change width */
        .fc-resize-left {
          top: 12px; bottom: 12px; left: 0; width: 6px;
          cursor: ew-resize;
          background: transparent;
          border-radius: 3px 0 0 3px;
        }
        .fc-resize-left:hover { background: rgba(168,85,247,0.25); }

        /* Top-left corner — drag to resize both */
        .fc-resize-corner {
          top: 0; left: 0; width: 18px; height: 18px;
          cursor: nw-resize;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px 0 4px 0;
        }
        .fc-resize-corner::before {
          content: '';
          display: block;
          width: 10px; height: 10px;
          border-top: 2px solid rgba(168,85,247,0.5);
          border-left: 2px solid rgba(168,85,247,0.5);
          border-radius: 2px 0 0 0;
          transition: border-color 0.2s;
        }
        .fc-resize-corner:hover::before { border-color: var(--clr-primary); }

        @media (max-width: 480px) {
          .floating-chat-panel { width: calc(100vw - 24px) !important; right: 12px; bottom: 84px; }
          .floating-chat-btn  { right: 16px; bottom: 20px; }
          .fc-resize-handle { display: none; }
        }
      `}</style>
        </>
    );
}
