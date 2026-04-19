'use client';

import { useEffect, useState } from 'react';

const ADMIN_IP = process.env.NEXT_PUBLIC_ADMIN_IP ?? '';
const NS = 'prakharmasih-pf';   // unique namespace on counterapi.dev
const KEY = 'visits';
const API_BASE = `https://api.counterapi.dev/v1/${NS}/${KEY}`;
const LS_KEY = 'pf_last_counted';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export default function VisitorBadge() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        async function run() {
            // 1. Detect current public IP
            let ip = '';
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                ip = ((await res.json()) as { ip: string }).ip ?? '';
            } catch {
                // network blocked — silently skip
                return;
            }

            // 2. Deduplicate: only increment once per 24 h per browser
            const last = localStorage.getItem(LS_KEY);
            const now = Date.now();
            const doCount = !last || now - Number(last) > TTL_MS;

            let value = 0;
            try {
                const url = doCount ? `${API_BASE}/up` : API_BASE;
                const res = await fetch(url);
                const json = (await res.json()) as { value: number };
                value = json.value ?? 0;
                if (doCount) localStorage.setItem(LS_KEY, String(now));
            } catch {
                return;
            }

            // 3. Only render badge for your IP
            if (ADMIN_IP && ip === ADMIN_IP) {
                setCount(value);
            }
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
