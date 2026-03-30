import { Syne, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import './portfolio.css';

const syne = Syne({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-syne',
    display: 'swap',
});

const mono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['300', '400', '500', '700'],
    variable: '--font-mono',
    display: 'swap',
});

export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className={`${syne.variable} ${mono.variable}`} style={{ flex: 1 }}>
            {children}
        </div>
    );
}
