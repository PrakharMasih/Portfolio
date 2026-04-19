'use client';

import { useEffect, useState } from 'react';

const ADMIN_IP = process.env.NEXT_PUBLIC_ADMIN_IP ?? '';
const NS = 'prakharmasih-pf';
const KEY = 'visits';
const API_BASE = `https://api.counterapi.dev/v1/${NS}/${KEY}`;
const LS_COUNTED = 'pf_last_counted';
const LS_COUNT = 'pf_last_count';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export default function VisitorBadge() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        async function run() {
            // 1. Check URL param fallback — ?admin=1 always shows badge
            const isAdminParam = new URLSearchParams(window.location.search).get('admin') === '1';

            // 2. Detect IPv4 specifically (avoids IPv6 mismatch)
            let ip = '';
            try {
                const res = await fetch('https://api4.ipify.org?format=json');
                ip = ((await res.json()) as { ip: string }).ip ?? '';
            } catch {
                // ipify unavailable — fall through to param check only
            }

            const isAdmin = isAdminParam || (ADMIN_IP !== '' && ip === ADMIN_IP);

            // 3. Deduplicate: increment at most once per 24 h per browser
            const last = localStorage.getItem(LS_COUNTED);
            const now = Date.now();
            const doCount = !last || now - Number(last) > TTL_MS;

            let value = Number(localStorage.getItem(LS_COUNT) ?? 0); // cached fallback

            try {
                // Always call /up when it's time to count; plain GET otherwise
                const url = doCount ? `${API_BASE}/up` : `${API_BASE}`;
                const res = await fetch(url);
                const json = (await res.json()) as { value?: number; count?: number };
                const fetched = json.value ?? json.count ?? null;
                if (fetched !== null) {
                    value = fetched;
                    localStorage.setItem(LS_COUNT, String(value)); // keep cache fresh
                }
                if (doCount) localStorage.setItem(LS_COUNTED, String(now));
            } catch {
                // network error — use cached value if admin
            }

            if (isAdmin) setCount(value);
        }

        run();
    }, []);

    if (count === null) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                left: '1rem',
                background: 'var(--surface2, #1a1a1a)',
                border: '1px solid var(--border, #333)',
                color: 'var(--text2, #aaa)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'var(--font-geist-mono, monospace)',
                zIndex: 9999,
                opacity: 0.85,
                pointerEvents: 'none',
                userSelect: 'none',
            }}
        >
            👁 {count.toLocaleString()} visits
        </div>
    );
}
