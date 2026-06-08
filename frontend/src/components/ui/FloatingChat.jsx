import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Plus, Minimize2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage } from '../../utils/geminiService';
import ProductCarousel from './ProductCarousel';

const WELCOME_MESSAGE = "Hi there! 👋 I am your Moda Assistant. I can help you find products, check available coupons, track your orders, or answer any questions. How can I help you today?";
const FALLBACK_MESSAGE = 'I could not verify this information from the available data source.';

export default function FloatingChat() {
    const { conversations, sendMessage, addBotMessage, createConversation } = useApp();
    const { user } = useAuth();

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const firstScrollRef = useRef(true);

    // Resize state
    const [panelSize, setPanelSize] = useState({ width: 370, height: 560 });
    const resizeStartRef = useRef(null);

    const handleResizePointerDown = (e) => {
        e.preventDefault();
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            w: panelSize.width,
            h: panelSize.height,
        };
        const onMove = (ev) => {
            const dx = resizeStartRef.current.x - ev.clientX; // dragging left = wider
            const dy = resizeStartRef.current.y - ev.clientY; // dragging up = taller
            setPanelSize({
                width:  Math.min(700, Math.max(300, resizeStartRef.current.w + dx)),
                height: Math.min(800, Math.max(380, resizeStartRef.current.h + dy)),
            });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    // Active conversation — pick the first one or create one on first open
    const [convId, setConvId] = useState(null);
    const conv = conversations.find(c => c.conversation_id === convId);

    const ensureWelcomeMessage = () => {
        if (!convId) return;
        if (conv?.messages && conv.messages.length > 0) return;
        addBotMessage(convId, WELCOME_MESSAGE);
    };

    useEffect(() => {
        if (!open || convId) return;

        const ensureConversation = async () => {
            if (conversations.length > 0) {
                setConvId(conversations[0].conversation_id);
            } else {
                const newConv = await createConversation('Chat with Moda');
                if (newConv?.conversation_id) {
                    setConvId(newConv.conversation_id);
                }
            }
            setUnread(0);
        };

        ensureConversation();
    }, [open, convId, conversations.length]);

    useEffect(() => {
        if (open) {
            ensureWelcomeMessage();
        }
    }, [open, convId, conv?.messages?.length]);

    const scrollMessagesToBottom = (behavior) => {
        const container = messagesContainerRef.current;
        if (!container) return;
        container.scrollTo({
            top: container.scrollHeight,
            behavior,
        });
    };

    useEffect(() => {
        const behavior = firstScrollRef.current ? 'auto' : 'smooth';
        firstScrollRef.current = false;
        requestAnimationFrame(() => scrollMessagesToBottom(behavior));
    }, [conv?.messages.length, typing, convId, open]);

    const handleSend = async () => {
        if (!input.trim() || !convId) return;
        const msg = input.trim();
        setInput('');
        sendMessage(convId, msg);
        setTyping(true);

        try {
            // Try real Gemini chat first
            const history = conv?.messages || [];
            const aiReply = await sendChatMessage(history, msg);
            const reply = aiReply?.response || FALLBACK_MESSAGE;
            const products = aiReply?.products || [];
            addBotMessage(convId, reply, products);
        } catch {
            addBotMessage(convId, FALLBACK_MESSAGE);
        }
        setTyping(false);
    };

    const handleNewConv = async () => {
        const newConv = await createConversation('New chat');
        if (newConv?.conversation_id) {
            setConvId(newConv.conversation_id);
        }
    };

    const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

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
                    {/* Resize handle — top-left corner */}
                    <div
                        className="fc-resize-handle"
                        onPointerDown={handleResizePointerDown}
                        title="Drag to resize"
                    />
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
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(false)} title="Minimize"><Minimize2 size={15} /></button>
                        </div>
                    </div>



                    {/* Messages */}
                    <div className="fc-messages" ref={messagesContainerRef}>
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
                                <div className="flex-col" style={{ gap: 2, alignItems: msg.sender_type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', width: '100%' }}>
                                    <div className={`chat-bubble ${msg.sender_type}`} style={{ fontSize: 13 }}>{msg.content}</div>
                                    {msg.products && msg.products.length > 0 && (
                                        <div style={{ marginTop: 8, marginBottom: 4, width: '100%' }}>
                                            <ProductCarousel products={msg.products} />
                                        </div>
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
                            {['Track my order', 'Sizing help', 'Return policy', 'Active coupons'].map(s => (
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
        .floating-chat-btn:hover { transform: scale(1.12); box-shadow: 0 8px 36px rgba(168,85,247,0.7), 0 0 0 1px rgba(255,255,255,0.15); }
        .floating-chat-btn.open {
          background: var(--glass-bg-heavy);
          backdrop-filter: var(--glass-blur-sm); -webkit-backdrop-filter: var(--glass-blur-sm);
          color: var(--clr-text); border: 1px solid var(--glass-border);
          box-shadow: var(--shadow-md), var(--shadow-glow-sm);
        }
        .chat-badge { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; border-radius: 50%; background: var(--clr-error); color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }

        /* ── Chat panel — full glassmorphism ── */
        .floating-chat-panel {
          position: fixed; bottom: 96px; right: 28px; z-index: 999;
          width: 370px; max-height: 560px;
          background: var(--glass-bg-heavy);
          backdrop-filter: blur(32px) saturate(1.8);
          -webkit-backdrop-filter: blur(32px) saturate(1.8);
          border: 1px solid var(--glass-border);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-xl), var(--shadow-glow-sm), inset 0 1px 0 rgba(255,255,255,0.08);
          display: flex; flex-direction: column; overflow: hidden;
        }

        /* ── Header ── */
        /* ── Resize handle ── */
        .fc-resize-handle {
          position: absolute;
          top: 0; left: 0;
          width: 20px; height: 20px;
          cursor: nw-resize;
          z-index: 10;
          border-radius: var(--r-xl) 0 0 0;
          /* two diagonal lines as visual hint */
          background:
            linear-gradient(135deg,
              rgba(168,85,247,0.55) 0px, rgba(168,85,247,0.55) 1.5px,
              transparent 1.5px 6px,
              rgba(168,85,247,0.35) 6px, rgba(168,85,247,0.35) 7.5px,
              transparent 7.5px
            );
        }
        .fc-resize-handle:hover {
          background:
            linear-gradient(135deg,
              rgba(168,85,247,0.9) 0px, rgba(168,85,247,0.9) 1.5px,
              transparent 1.5px 6px,
              rgba(168,85,247,0.65) 6px, rgba(168,85,247,0.65) 7.5px,
              transparent 7.5px
            );
        }

        /* ── Header ── */
        .fc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--sp-4) var(--sp-5);
          background: linear-gradient(135deg, rgba(168,85,247,0.14), rgba(240,171,252,0.06));
          border-bottom: 1px solid var(--glass-border);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }
        .fc-avatar {
          width: 34px; height: 34px; border-radius: 50%;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
          box-shadow: 0 0 14px rgba(168,85,247,0.45);
        }



        /* ── Messages area ── */
        .fc-messages {
          flex: 1; overflow-y: auto; padding: var(--sp-4);
          display: flex; flex-direction: column; gap: var(--sp-3); scroll-behavior: smooth;
        }
        .fc-messages::-webkit-scrollbar { width: 4px; }
        .fc-messages::-webkit-scrollbar-thumb { background: var(--glass-border); border-radius: 9999px; }

        .fc-msg { display: flex; gap: 8px; align-items: flex-end; }
        .fc-msg.user { flex-direction: row-reverse; }

        .fc-bot-dot {
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, var(--clr-primary), var(--clr-accent));
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
          box-shadow: 0 0 10px rgba(168,85,247,0.35);
        }

        /* ── Guest note ── */
        .fc-guest-note {
          display: flex; align-items: center; gap: 8px;
          background: rgba(168,85,247,0.07);
          border: 1px solid rgba(168,85,247,0.18);
          border-radius: var(--r-md); padding: 8px 12px;
          font-size: 12px; color: var(--clr-text-3); margin-bottom: 4px;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }

        /* ── Quick suggestions ── */
        .fc-suggestions { padding: 4px 12px 8px; display: flex; flex-wrap: wrap; gap: 6px; }
        .fc-suggest-btn {
          padding: 5px 11px;
          border: 1px solid var(--glass-border);
          border-radius: var(--r-full); font-size: 11px; font-weight: 500;
          color: var(--clr-text-2); cursor: pointer;
          background: var(--glass-bg);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          transition: all var(--tr-fast);
        }
        .fc-suggest-btn:hover {
          border-color: rgba(168,85,247,0.4); color: var(--clr-primary);
          background: rgba(168,85,247,0.08); box-shadow: 0 0 8px rgba(168,85,247,0.12);
        }

        /* ── Input bar ── */
        .fc-input-row {
          display: flex; gap: 8px; padding: var(--sp-3) var(--sp-4);
          border-top: 1px solid var(--glass-border);
          background: rgba(168,85,247,0.04);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
        }

        /* ── Typing dots ── */
        .typing-dots { display: flex; gap: 4px; align-items: center; }
        .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--clr-text-3); animation: bounce 1.2s infinite; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

        @media (max-width: 480px) {
          .floating-chat-panel { width: calc(100vw - 24px); right: 12px; bottom: 84px; }
          .floating-chat-btn  { right: 16px; bottom: 20px; }
        }
      `}</style>
        </>
    );
}
