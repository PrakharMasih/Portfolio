'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const SUGGESTIONS = [
    "What's Prakhar's tech stack?",
    'Tell me about his projects',
    'What services does he offer?',
    'How can I contact Prakhar?',
];

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm Prakhar's AI assistant. Ask me anything about his skills, projects, or experience.",
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen]);

    async function sendMessage(text: string) {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: text.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setShowSuggestions(false);
        setIsLoading(true);

        const assistantPlaceholder: Message = { role: 'assistant', content: '' };
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

            if (!res.ok || !res.body) {
                throw new Error('Request failed');
            }

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
                                    role: 'assistant',
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
                    role: 'assistant',
                    content: 'Connection error. Please try again.',
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
    }

    function handleClose() {
        abortRef.current?.abort();
        setIsOpen(false);
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
                    <button className="cb-close" onClick={handleClose} aria-label="Close chat">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div className="cb-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`cb-msg cb-msg--${msg.role}`}>
                            {msg.role === 'assistant' && (
                                <div className="cb-msg-avatar">PM</div>
                            )}
                            <div className="cb-bubble">
                                {msg.content || (isLoading && i === messages.length - 1 ? (
                                    <span className="cb-typing">
                                        <span /><span /><span />
                                    </span>
                                ) : null)}
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
                <div className="cb-input-area">
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
                    <button
                        className="cb-send"
                        onClick={() => sendMessage(input)}
                        disabled={isLoading || !input.trim()}
                        aria-label="Send message"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M14 8L2 2L5 8L2 14L14 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── FAB TOGGLE ── */}
            <button
                className={`cb-fab${isOpen ? ' cb-fab--active' : ''}`}
                onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
                aria-label={isOpen ? 'Close chat' : 'Open chat'}
            >
                <svg
                    className="cb-fab-icon cb-fab-icon--chat"
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                >
                    <path
                        d="M11 2C6.03 2 2 5.58 2 10c0 1.92.74 3.68 1.96 5.08L3 20l5.14-1.36A9.4 9.4 0 0011 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                    <circle cx="7.5" cy="10" r="1" fill="currentColor" />
                    <circle cx="11" cy="10" r="1" fill="currentColor" />
                    <circle cx="14.5" cy="10" r="1" fill="currentColor" />
                </svg>
                <svg
                    className="cb-fab-icon cb-fab-icon--close"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                >
                    <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            </button>
        </>
    );
}
