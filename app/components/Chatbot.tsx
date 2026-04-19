'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const SUGGESTIONS = [
    "What's Prakhar's tech stack?",
    'Tell me about his projects',
    'What services does he offer?',
    'How can I contact Prakhar?',
];

// ── Markdown renderer (no external deps) ──────────────────────────────────────

function parseInline(text: string, baseKey: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    // Order matters: bold before italic, links last
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const k = `${baseKey}-il-${idx++}`;
        if (match[2] !== undefined) {
            nodes.push(<strong key={k}>{match[2]}</strong>);
        } else if (match[3] !== undefined) {
            nodes.push(<em key={k}>{match[3]}</em>);
        } else if (match[4] !== undefined) {
            nodes.push(<code key={k} className="cb-inline-code">{match[4]}</code>);
        } else if (match[5] !== undefined) {
            nodes.push(<a key={k} href={match[6]} target="_blank" rel="noopener noreferrer" className="cb-md-link">{match[5]}</a>);
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

function parseTextBlock(text: string, baseKey: number): React.ReactNode[] {
    const lines = text.split('\n');
    const nodes: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let orderedItems: React.ReactNode[] = [];
    let key = 0;

    const flushLists = () => {
        if (listItems.length > 0) {
            nodes.push(<ul key={`${baseKey}-ul-${key++}`} className="cb-md-list">{listItems}</ul>);
            listItems = [];
        }
        if (orderedItems.length > 0) {
            nodes.push(<ol key={`${baseKey}-ol-${key++}`} className="cb-md-list cb-md-list--ol">{orderedItems}</ol>);
            orderedItems = [];
        }
    };

    for (const line of lines) {
        const t = line.trim();
        if (!t) { flushLists(); continue; }

        const h3 = t.match(/^###\s+(.+)/);
        const h2 = t.match(/^##\s+(.+)/);
        const h1 = t.match(/^#\s+(.+)/);
        const bullet = t.match(/^[-*]\s+(.*)/);
        const ordered = t.match(/^\d+\.\s+(.*)/);
        const hr = /^(-{3,}|\*{3,})$/.test(t);

        if (h3) { flushLists(); nodes.push(<h4 key={`${baseKey}-h-${key++}`} className="cb-md-h cb-md-h3">{parseInline(h3[1], `${baseKey}-h3-${key}`)}</h4>); }
        else if (h2) { flushLists(); nodes.push(<h3 key={`${baseKey}-h-${key++}`} className="cb-md-h cb-md-h2">{parseInline(h2[1], `${baseKey}-h2-${key}`)}</h3>); }
        else if (h1) { flushLists(); nodes.push(<h2 key={`${baseKey}-h-${key++}`} className="cb-md-h cb-md-h1">{parseInline(h1[1], `${baseKey}-h1-${key}`)}</h2>); }
        else if (bullet) {
            if (orderedItems.length > 0) flushLists();
            listItems.push(<li key={`${baseKey}-li-${key++}`}>{parseInline(bullet[1], `${baseKey}-bul-${key}`)}</li>);
        }
        else if (ordered) {
            if (listItems.length > 0) flushLists();
            orderedItems.push(<li key={`${baseKey}-li-${key++}`}>{parseInline(ordered[1], `${baseKey}-ord-${key}`)}</li>);
        }
        else if (hr) { flushLists(); nodes.push(<hr key={`${baseKey}-hr-${key++}`} className="cb-md-hr" />); }
        else { flushLists(); nodes.push(<p key={`${baseKey}-p-${key++}`} className="cb-md-p">{parseInline(t, `${baseKey}-p-${key}`)}</p>); }
    }
    flushLists();
    return nodes;
}

function MarkdownRenderer({ content }: { content: string }) {
    const nodes: React.ReactNode[] = [];
    const codeBlockRe = /```(\w+)?\n?([\s\S]*?)```/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let pi = 0;

    while ((match = codeBlockRe.exec(content)) !== null) {
        if (match.index > last) {
            nodes.push(...parseTextBlock(content.slice(last, match.index), pi++));
        }
        nodes.push(
            <pre key={`cb-pre-${pi++}`} className="cb-code-block">
                {match[1] && <span className="cb-code-lang">{match[1]}</span>}
                <code>{match[2].trim()}</code>
            </pre>
        );
        last = codeBlockRe.lastIndex;
    }
    if (last < content.length) {
        nodes.push(...parseTextBlock(content.slice(last), pi++));
    }
    return <div className="cb-md">{nodes}</div>;
}

// ── Chatbot component ─────────────────────────────────────────────────────────

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm Prakhar's AI assistant. Ask me anything about his skills, projects, or experience.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const messagesRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // Scroll to bottom on new messages, then recheck button visibility
    useEffect(() => {
        if (!isOpen) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        // After smooth scroll settles, recheck distance
        const t = setTimeout(() => {
            const el = messagesRef.current;
            if (!el) return;
            setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
        }, 350);
        return () => clearTimeout(t);
    }, [messages, isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
    }, [isOpen]);

    // Track scroll position to show/hide scroll-to-bottom button
    const handleScroll = useCallback(() => {
        const el = messagesRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(distFromBottom > 120);
    }, []);

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollBtn(false);
    }

    function copyMessage(content: string, index: number) {
        navigator.clipboard.writeText(content).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 1800);
        });
    }

    function clearChat() {
        abortRef.current?.abort();
        setIsLoading(false);
        setMessages([{
            role: 'assistant',
            content: "Hi! I'm Prakhar's AI assistant. Ask me anything about his skills, projects, or experience.",
            timestamp: new Date(),
        }]);
        setShowSuggestions(true);
        setInput('');
    }

    function stopStreaming() {
        abortRef.current?.abort();
        setIsLoading(false);
    }

    async function sendMessage(text: string) {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: text.trim(), timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setShowSuggestions(false);
        setIsLoading(true);

        const assistantPlaceholder: Message = { role: 'assistant', content: '', timestamp: new Date() };
        setMessages((prev) => [...prev, assistantPlaceholder]);

        abortRef.current = new AbortController();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map((m) => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) throw new Error('Request failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(data);
                        const token: string = parsed.choices?.[0]?.delta?.content ?? '';
                        if (token) {
                            setMessages((prev) => {
                                const next = [...prev];
                                next[next.length - 1] = {
                                    ...next[next.length - 1],
                                    content: next[next.length - 1].content + token,
                                };
                                return next;
                            });
                        }
                    } catch {
                        // skip malformed SSE lines
                    }
                }
            }
        } catch (err: unknown) {
            if ((err as Error)?.name === 'AbortError') return;
            setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                    ...next[next.length - 1],
                    content: '⚠ Connection error. Please try again.',
                };
                return next;
            });
        } finally {
            setIsLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
        if (e.key === 'Escape') handleClose();
    }

    function handleClose() {
        abortRef.current?.abort();
        setIsOpen(false);
    }

    function fmtTime(d: Date) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    return (
        <>
            {/* ── CHAT WINDOW ── */}
            <div className={`cb-window${isOpen ? ' cb-window--open' : ''}`} role="dialog" aria-label="AI Chat Assistant">
                {/* Header */}
                <div className="cb-header">
                    <div className="cb-header-left">
                        <div className="cb-avatar">
                            <span>PM</span>
                            <div className="cb-avatar-dot" />
                        </div>
                        <div>
                            <div className="cb-title">PM<span className="cb-title-dot">.</span>AI</div>
                            <div className="cb-subtitle">Prakhar&apos;s Portfolio Assistant</div>
                        </div>
                    </div>
                    <div className="cb-header-actions">
                        <button className="cb-icon-btn" onClick={clearChat} aria-label="Clear conversation" title="Clear conversation">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path d="M1 3h12M5 3V2h4v1M2 3l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <button className="cb-close" onClick={handleClose} aria-label="Close chat">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="cb-messages" ref={messagesRef} onScroll={handleScroll}>
                    {messages.map((msg, i) => (
                        <div key={i} className={`cb-msg cb-msg--${msg.role}`}>
                            {msg.role === 'assistant' && <div className="cb-msg-avatar">PM</div>}
                            <div className="cb-bubble-wrap">
                                <div className="cb-bubble">
                                    {msg.role === 'assistant' ? (
                                        msg.content
                                            ? <MarkdownRenderer content={msg.content} />
                                            : isLoading && i === messages.length - 1
                                                ? <span className="cb-typing"><span /><span /><span /></span>
                                                : null
                                    ) : (
                                        <span>{msg.content}</span>
                                    )}
                                </div>
                                <div className="cb-msg-meta">
                                    <span className="cb-timestamp">{fmtTime(msg.timestamp)}</span>
                                    {msg.role === 'assistant' && msg.content && (
                                        <button
                                            className="cb-copy-btn"
                                            onClick={() => copyMessage(msg.content, i)}
                                            aria-label="Copy message"
                                            title="Copy"
                                        >
                                            {copiedIndex === i ? (
                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                    <path d="M1 6l3.5 3.5L11 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            ) : (
                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                    <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                                                    <path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Suggestions */}
                    {showSuggestions && messages.length === 1 && (
                        <div className="cb-suggestions">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} className="cb-suggestion" onClick={() => sendMessage(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="cb-input-area" style={{ position: 'relative' }}>
                    {/* Scroll to bottom — anchored above input, right-aligned */}
                    {showScrollBtn && (
                        <button className="cb-scroll-bottom" onClick={scrollToBottom} aria-label="Scroll to bottom">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                    <input
                        ref={inputRef}
                        className="cb-input"
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about Prakhar..."
                        maxLength={800}
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    {input.length > 600 && (
                        <span className="cb-char-count">{input.length}/800</span>
                    )}
                    {isLoading ? (
                        <button className="cb-send cb-send--stop" onClick={stopStreaming} aria-label="Stop generating">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            className="cb-send"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim()}
                            aria-label="Send message"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M14 8L2 2L5 8L2 14L14 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ── FAB TOGGLE ── */}
            <button
                className={`cb-fab${isOpen ? ' cb-fab--active' : ''}`}
                onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                <svg className="cb-fab-icon cb-fab-icon--chat" width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 2C6.03 2 2 5.58 2 10c0 1.92.74 3.68 1.96 5.08L3 20l5.14-1.36A9.4 9.4 0 0011 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="7.5" cy="10" r="1" fill="currentColor" />
                    <circle cx="11" cy="10" r="1" fill="currentColor" />
                    <circle cx="14.5" cy="10" r="1" fill="currentColor" />
                </svg>
                <svg className="cb-fab-icon cb-fab-icon--close" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            </button>
        </>
    );
}
