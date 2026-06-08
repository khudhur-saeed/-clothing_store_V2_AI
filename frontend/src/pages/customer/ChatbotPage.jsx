import { useState, useRef, useEffect } from 'react';
import { Send, Plus, MessageCircle, Trash2, Bot, Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { sendChatMessage } from '../../utils/geminiService';
import ProductCarousel from '../../components/ui/ProductCarousel';

const FALLBACK_MESSAGE = 'I could not verify this information from the available data source.';

export default function ChatbotPage() {
    const { conversations, sendMessage, addBotMessage, createConversation, renameConversation, deleteConversation } = useApp();
    const { user } = useAuth();
    const [activeConv, setActiveConv] = useState(conversations[0]?.conversation_id || null);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const firstScrollRef = useRef(true);

    const currentConv = conversations.find(c => c.conversation_id === activeConv);

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
    }, [currentConv?.messages.length, typing, activeConv]);

    if (!user) return (
        <div className="page container text-center" style={{ paddingTop: 'var(--sp-20)' }}>
            <h2 className="text-2xl font-bold" style={{ marginBottom: 8 }}>Sign in to chat with our assistant</h2>
            <Link to="/login" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>Sign In</Link>
        </div>
    );

    const handleSend = async () => {
        if (!input.trim() || !activeConv) return;
        const msg = input.trim();
        setInput('');
        sendMessage(activeConv, msg);
        setTyping(true);

        try {
            const history = currentConv?.messages || [];
            const aiResponse = await sendChatMessage(history, msg);
            
            if (aiResponse) {
                const reply = aiResponse.response || FALLBACK_MESSAGE;
                const products = aiResponse.products || [];
                addBotMessage(activeConv, reply, products);
            } else {
                addBotMessage(activeConv, FALLBACK_MESSAGE);
            }
        } catch {
            addBotMessage(activeConv, FALLBACK_MESSAGE);
        }

        setTyping(false);
    };

    const handleNewConv = async () => {
        const conv = await createConversation('Chat with Moda');
        if (conv?.conversation_id) {
            setActiveConv(conv.conversation_id);
        }
    };

    const handleRenameConv = async (conversationId, currentTitle) => {
        const nextTitle = window.prompt('Rename conversation', currentTitle || 'Chat with Moda');
        if (nextTitle == null) return;
        await renameConversation(conversationId, nextTitle);
    };

    const handleDeleteConv = async (conversationId) => {
        const confirmed = window.confirm('Delete this conversation?');
        if (!confirmed) return;
        await deleteConversation(conversationId);
        if (activeConv === conversationId) {
            const remaining = conversations.filter(c => c.conversation_id !== conversationId);
            setActiveConv(remaining[0]?.conversation_id || null);
        }
    };

    const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="page" style={{ padding: 0 }}>
            <div className="chat-shell">
                {/* Sidebar */}
                <div className="chat-sidebar">
                    <div className="chat-sidebar-header">
                        <span className="font-bold">Conversations</span>
                        <button className="btn btn-primary btn-icon btn-sm" onClick={handleNewConv} id="new-conv-btn" title="New conversation">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="chat-conv-list">
                        {conversations.length === 0 && <p className="text-faint text-sm" style={{ padding: 'var(--sp-4)' }}>No conversations yet</p>}
                        {conversations.map(conv => (
                            <button key={conv.conversation_id}
                                className={`chat-conv-item${activeConv === conv.conversation_id ? ' active' : ''}`}
                                onClick={() => setActiveConv(conv.conversation_id)} id={`conv-${conv.conversation_id}`}>
                                <MessageCircle size={15} />
                                <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                                    <div className="font-medium text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title || 'Chat with Moda'}</div>
                                    <div className="text-xs text-faint">{conv.messages.length} messages</div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-icon btn-xs"
                                        title="Rename"
                                        onClick={() => handleRenameConv(conv.conversation_id, conv.title)}
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-icon btn-xs"
                                        title="Delete"
                                        onClick={() => handleDeleteConv(conv.conversation_id)}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat main */}
                <div className="chat-main">
                    {!currentConv ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                            <Bot size={48} color="var(--clr-text-3)" />
                            <p className="font-semibold text-lg">Moda Assistant</p>
                            <p className="text-muted text-sm">Select a conversation or start a new one</p>
                            <button className="btn btn-primary" onClick={handleNewConv}><Plus size={16} /> New Chat</button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="chat-topbar">
                                <div className="flex items-center gap-3">
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bot size={18} color="white" />
                                    </div>
                                    <div>
                                        <div className="font-bold">Moda Assistant</div>
                                        <div className="text-xs text-success">● Online</div>
                                    </div>
                                </div>
                                <div className="text-xs text-faint">{currentConv.title}</div>
                            </div>

                            {/* Messages */}
                            <div className="chat-messages" ref={messagesContainerRef}>
                                {currentConv.messages.map(msg => (
                                    <div key={msg.message_id} className={`chat-msg ${msg.sender_type === 'user' ? 'user' : 'bot'}`}>
                                        {msg.sender_type === 'bot' && (
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Bot size={14} color="white" />
                                            </div>
                                        )}
                                        <div className="flex-col" style={{ gap: 4, alignItems: msg.sender_type === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%', width: '100%' }}>
                                            {msg.content && <div className={`chat-bubble ${msg.sender_type}`}>{msg.content}</div>}
                                            {msg.products && msg.products.length > 0 && (
                                                <div style={{ marginTop: 8, marginBottom: 4 }}>
                                                    <ProductCarousel products={msg.products} />
                                                </div>
                                            )}
                                            <div className="text-xs text-faint">{formatTime(msg.sent_at)}</div>
                                        </div>
                                    </div>
                                ))}
                                {typing && (
                                    <div className="chat-msg bot">
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--clr-primary),var(--clr-accent))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Bot size={14} color="white" />
                                        </div>
                                        <div className="chat-bubble bot" style={{ padding: '12px 18px' }}>
                                            <div className="typing-dots"><span /><span /><span /></div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="chat-input-bar">
                                <input id="chat-input" className="form-input" placeholder="Ask about products, orders, sizing…" value={input}
                                    onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    style={{ flex: 1, background: 'var(--clr-bg-3)' }} />
                                <button id="chat-send-btn" className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || typing}>
                                    <Send size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`
        .chat-shell { display: flex; height: calc(100vh - var(--header-h)); }
        .chat-sidebar { width: 260px; flex-shrink: 0; background: var(--clr-bg-2); border-right: 1px solid var(--clr-border); display: flex; flex-direction: column; }
        .chat-sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-4) var(--sp-5); border-bottom: 1px solid var(--clr-border); }
        .chat-conv-list { flex: 1; overflow-y: auto; padding: var(--sp-2); }
        .chat-conv-item { display: flex; align-items: center; gap: var(--sp-3); padding: 10px 12px; border-radius: var(--r-md); width: 100%; transition: background var(--tr-fast); color: var(--clr-text-2); cursor: pointer; }
        .chat-conv-item:hover, .chat-conv-item.active { background: var(--clr-surface); color: var(--clr-text); }
        .chat-conv-item.active { color: var(--clr-primary); }
        .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
        .chat-topbar { padding: var(--sp-4) var(--sp-6); border-bottom: 1px solid var(--clr-border); display: flex; align-items: center; justify-content: space-between; background: var(--clr-bg-2); }
        .chat-messages { flex: 1; overflow-y: auto; padding: var(--sp-6); display: flex; flex-direction: column; gap: var(--sp-5); }
        .chat-msg { display: flex; gap: var(--sp-3); align-items: flex-end; }
        .chat-msg.user { flex-direction: row-reverse; }
        .chat-input-bar { padding: var(--sp-4) var(--sp-6); border-top: 1px solid var(--clr-border); display: flex; gap: var(--sp-3); background: var(--clr-bg-2); }
        .typing-dots { display: flex; gap: 4px; align-items: center; }
        .typing-dots span { width: 7px; height: 7px; border-radius: 50%; background: var(--clr-text-3); animation: bounce 1.2s infinite; }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        @media (max-width: 640px) { .chat-sidebar { width: 60px; } .chat-sidebar-header span, .chat-conv-item > div { display: none; } .chat-conv-item { justify-content: center; } }
      `}</style>
        </div>
    );
}
