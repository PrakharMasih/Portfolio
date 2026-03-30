'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Globe } from '../components/ui/cobe-globe';
import { ThemeToggle } from '../components/ThemeToggle';

// ---- helpers ----
function fmtTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ---- static globe data (module-level: stable references across renders) ----
const GLOBE_MARKERS = [
    { id: 'india', location: [20.5937, 78.9629] as [number, number], label: 'India — Base' },
    { id: 'usa', location: [37.0902, -95.7129] as [number, number], label: 'USA' },
    { id: 'london', location: [51.5074, -0.1278] as [number, number], label: 'London' },
    { id: 'berlin', location: [52.52, 13.405] as [number, number], label: 'Berlin' },
    { id: 'dubai', location: [25.2048, 55.2708] as [number, number], label: 'Dubai' },
    { id: 'sydney', location: [-33.8688, 151.2093] as [number, number], label: 'Sydney' },
];

const GLOBE_ARCS = [
    { id: 'india-usa', from: [20.5937, 78.9629] as [number, number], to: [37.0902, -95.7129] as [number, number] },
    { id: 'india-london', from: [20.5937, 78.9629] as [number, number], to: [51.5074, -0.1278] as [number, number] },
    { id: 'india-berlin', from: [20.5937, 78.9629] as [number, number], to: [52.52, 13.405] as [number, number] },
    { id: 'india-dubai', from: [20.5937, 78.9629] as [number, number], to: [25.2048, 55.2708] as [number, number] },
    { id: 'india-sydney', from: [20.5937, 78.9629] as [number, number], to: [-33.8688, 151.2093] as [number, number] },
];

// ---- isolated clock component (state changes never re-render PortfolioPage) ----
function LiveClock() {
    const [times, setTimes] = useState({ ist: '--:--', est: '--:--', pst: '--:--', cet: '--:--' });
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTimes({
                ist: fmtTime(new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))),
                est: fmtTime(new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))),
                pst: fmtTime(new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))),
                cet: fmtTime(new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))),
            });
        };
        update();
        const id = setInterval(update, 10000);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="timezone-list">
            <div className="tz-item"><span className="tz-name">My Location (IST)</span><span className="tz-val">{times.ist}</span></div>
            <div className="tz-item"><span className="tz-name">EST (New York)</span><span className="tz-val">{times.est}</span></div>
            <div className="tz-item"><span className="tz-name">PST (San Francisco)</span><span className="tz-val">{times.pst}</span></div>
            <div className="tz-item"><span className="tz-name">CET (Berlin)</span><span className="tz-val">{times.cet}</span></div>
        </div>
    );
}

function startCounters() {
    document.querySelectorAll<HTMLElement>('.counter').forEach((el) => {
        const target = parseInt(el.dataset.target ?? '0', 10);
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = Math.floor(current) + '+';
        }, 40);
    });
}

// ---- component ----
export default function PortfolioPage() {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    const [loaderHidden, setLoaderHidden] = useState(false);
    const [fillActive, setFillActive] = useState(false);
    const [loaderText, setLoaderText] = useState('Initializing systems...');

    // Keep a ref so canvas RAF loop can read theme without restarting
    const themeRef = useRef(isDark);
    useEffect(() => { themeRef.current = isDark; }, [isDark]);

    // memoize globe color tuples — only recompute on theme change, not on every render
    const globeColors = useMemo(() => ({
        markerColor: isDark ? [0.51, 0.55, 0.97] as [number, number, number] : [0.39, 0.40, 0.95] as [number, number, number],
        baseColor: isDark ? [0.09, 0.12, 0.22] as [number, number, number] : [0.96, 0.96, 1.0] as [number, number, number],
        arcColor: isDark ? [0.51, 0.55, 0.97] as [number, number, number] : [0.39, 0.40, 0.95] as [number, number, number],
        glowColor: isDark ? [0.35, 0.4, 0.9] as [number, number, number] : [0.84, 0.85, 0.98] as [number, number, number],
    }), [isDark]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const ringPosRef = useRef({ x: 0, y: 0 });

    // body cursor:none
    useEffect(() => {
        document.body.classList.add('pf-cursor-hide');
        return () => document.body.classList.remove('pf-cursor-hide');
    }, []);

    // loader sequence
    useEffect(() => {
        const t0 = setTimeout(() => setFillActive(true), 50);
        const msgs = ['Initializing systems...', 'Loading AI modules...', 'Connecting databases...', 'Ready.'];
        let i = 0;
        const interval = setInterval(() => {
            i++;
            if (i < msgs.length) setLoaderText(msgs[i]);
            if (i >= msgs.length - 1) clearInterval(interval);
        }, 400);
        const t1 = setTimeout(() => {
            setLoaderHidden(true);
            startCounters();
        }, 1800);
        return () => { clearTimeout(t0); clearInterval(interval); clearTimeout(t1); };
    }, []);

    // cursor tracking
    useEffect(() => {
        const move = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
        document.addEventListener('mousemove', move);
        let raf: number;
        const tick = () => {
            const c = cursorRef.current, r = ringRef.current;
            if (c && r) {
                c.style.transform = `translate3d(calc(${mouseRef.current.x}px - 50%), calc(${mouseRef.current.y}px - 50%), 0)`;
                ringPosRef.current.x += (mouseRef.current.x - ringPosRef.current.x) * 0.12;
                ringPosRef.current.y += (mouseRef.current.y - ringPosRef.current.y) * 0.12;
                r.style.transform = `translate3d(calc(${ringPosRef.current.x}px - 50%), calc(${ringPosRef.current.y}px - 50%), 0)`;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => { document.removeEventListener('mousemove', move); cancelAnimationFrame(raf); };
    }, []);

    // cursor hover expand
    useEffect(() => {
        const r = ringRef.current;
        if (!r) return;
        const big = () => { r.style.width = '60px'; r.style.height = '60px'; r.style.borderColor = 'rgba(129,140,248,0.8)'; };
        const sm = () => { r.style.width = '36px'; r.style.height = '36px'; r.style.borderColor = 'rgba(129,140,248,0.5)'; };
        const els = document.querySelectorAll('a, button, .project-card, .skill-tag');
        els.forEach((el) => { el.addEventListener('mouseenter', big); el.addEventListener('mouseleave', sm); });
        return () => { els.forEach((el) => { el.removeEventListener('mouseenter', big); el.removeEventListener('mouseleave', sm); }); };
    }, [loaderHidden]);

    // particles canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let W = (canvas.width = window.innerWidth);
        let H = (canvas.height = window.innerHeight);
        const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);

        interface P { x: number; y: number; vx: number; vy: number; size: number; alpha: number; reset(): void; }
        const make = (): P => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.4 + 0.1,
            reset() { Object.assign(this, make()); },
        });
        const pts: P[] = Array.from({ length: 120 }, make);
        let raf: number;
        const ani = () => {
            ctx.clearRect(0, 0, W, H);
            const dark = themeRef.current;
            const dotColor = dark ? '129,140,248' : '99,102,241';
            const dotAlphaMul = dark ? 1 : 0.45;
            const lineAlphaMul = dark ? 0.04 : 0.025;
            for (const p of pts) {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) p.reset();
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${dotColor},${p.alpha * dotAlphaMul})`; ctx.fill();
            }
            for (let i = 0; i < pts.length; i++) {
                for (let j = i + 1; j < pts.length; j++) {
                    const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 10000) {
                        const d = Math.sqrt(d2);
                        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
                        ctx.strokeStyle = `rgba(${dotColor},${lineAlphaMul * (1 - d / 100)})`; ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }
            }
            raf = requestAnimationFrame(ani);
        };
        raf = requestAnimationFrame(ani);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);

    // scroll reveal
    useEffect(() => {
        if (!loaderHidden) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
        document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, [loaderHidden]);

    // nav active highlight
    useEffect(() => {
        let scrollRafId: number | null = null;
        const onScroll = () => {
            if (scrollRafId !== null) return;
            scrollRafId = requestAnimationFrame(() => {
                const links = document.querySelectorAll<HTMLAnchorElement>('.nav-links a:not(.nav-cta)');
                let cur = '';
                document.querySelectorAll<HTMLElement>('section[id]').forEach((s) => {
                    if (window.scrollY >= s.offsetTop - 200) cur = s.id;
                });
                links.forEach((a) => { a.style.color = a.getAttribute('href') === '#' + cur ? '#818cf8' : ''; });
                scrollRafId = null;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // smooth anchor scroll
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            const href = (e.currentTarget as HTMLAnchorElement).getAttribute('href');
            const el = href ? document.querySelector(href) : null;
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
        anchors.forEach((a) => a.addEventListener('click', handler));
        return () => anchors.forEach((a) => a.removeEventListener('click', handler));
    }, [loaderHidden]);

    return (
        <div className="pf-root">
            <div className="pf-noise" />

            {/* LOADER */}
            <div className={`pf-loader${loaderHidden ? ' pf-loader-hidden' : ''}`}>
                <div className="pf-loader-logo">PM</div>
                <div className="pf-loader-bar">
                    <div className="pf-loader-bar-fill" style={{ transform: fillActive ? 'scaleX(1)' : 'scaleX(0)' }} />
                </div>
                <div className="pf-loader-text">{loaderText}</div>
            </div>

            {/* CURSOR */}
            <div className="pf-cursor" ref={cursorRef} />
            <div className="pf-cursor-ring" ref={ringRef} />

            {/* CANVAS */}
            <canvas ref={canvasRef} className="pf-canvas" />

            {/* NAV */}
            <nav>
                <a href="#hero" className="nav-logo">PM<span>.</span></a>
                <ul className="nav-links">
                    <li><a href="#about">About</a></li>
                    <li><a href="#skills">Skills</a></li>
                    <li><a href="#projects">Projects</a></li>
                    <li><a href="#experience">Experience</a></li>
                    <li><a href="#casestudies">Case Studies</a></li>
                    <li><a href="#services">Services</a></li>
                    <li><a href="#contact" className="nav-cta">Hire Me</a></li>
                </ul>
                <ThemeToggle />
            </nav>

            {/* ── HERO ── */}
            <section id="hero">
                <div className="hero-grid-bg" />
                <div className="hero-glow-1" />
                <div className="hero-glow-2" />

                <div className="hero-content">
                    <div className="hero-tag">
                        <div className="hero-tag-dot" />
                        Available for Remote Contracts — Worldwide
                    </div>
                    <h1 className="hero-name glitch">
                        <span className="line1">AI &amp; Backend</span>
                        <span className="line2">Developer</span>
                    </h1>
                    <div className="hero-role">
                        <span className="hero-role-divider" />
                        Prakhar Masih
                    </div>
                    <p className="hero-desc">
                        I build <span className="highlight">scalable backend systems</span>,{' '}
                        <span className="highlight">AI-powered automation</span>, and{' '}
                        <span className="highlight">data extraction pipelines</span> for international clients —
                        remote-first, deadline-driven, and product-minded.
                    </p>
                </div>

                {/* COBE GLOBE */}
                <div className="hero-right">
                    <div className="hero-globe-wrap">
                        <div className="hero-globe-ring" />
                        <div className="hero-globe-ring hero-globe-ring--outer" />
                        <Globe
                            markers={GLOBE_MARKERS}
                            arcs={GLOBE_ARCS}
                            markerColor={globeColors.markerColor}
                            baseColor={globeColors.baseColor}
                            arcColor={globeColors.arcColor}
                            glowColor={globeColors.glowColor}
                            dark={isDark ? 1 : 0}
                            mapBrightness={isDark ? 3.5 : 8}
                            markerSize={0.035}
                            markerElevation={0.015}
                            arcHeight={0.3}
                            speed={0.004}
                            className="hero-globe"
                        />
                        <div className="hero-globe-label">
                            <span className="hero-globe-dot" />
                            Remote — Worldwide
                        </div>
                    </div>
                </div>

                {/* STATS */}
                <div className="hero-stats">
                    <div className="stat-item">
                        <div className="stat-num counter" data-target="3">0+</div>
                        <div className="stat-label">Years Experience</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-num counter" data-target="10">0+</div>
                        <div className="stat-label">Projects Built</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-num counter" data-target="5">0+</div>
                        <div className="stat-label">Client Deliveries</div>
                    </div>
                </div>

                {/* SCROLL INDICATOR */}
                <div className="scroll-indicator">
                    <span className="scroll-text">Scroll</span>
                    <div className="scroll-line" />
                </div>
            </section>

            {/* MARQUEE */}
            <div className="marquee-section">
                <div className="marquee-track">
                    {['FastAPI', 'Python', 'AI Integration', 'PostgreSQL', 'MongoDB', 'Web Scraping', 'LLM APIs', 'Docker', 'Redis', 'Automation', 'Data Extraction', 'Remote-First',
                        'FastAPI', 'Python', 'AI Integration', 'PostgreSQL', 'MongoDB', 'Web Scraping', 'LLM APIs', 'Docker', 'Redis', 'Automation', 'Data Extraction', 'Remote-First'].map((t, i) => (
                            <span key={i} className="marquee-item"><span className="marquee-dot" />{t}</span>
                        ))}
                </div>
            </div>

            {/* ── ABOUT ── */}
            <section id="about">
                <div className="section-inner">
                    <div className="section-label">01 — About</div>
                    <h2 className="section-title">Not just a developer.<br /><span className="accent">A systems thinker.</span></h2>
                    <div className="about-grid">
                        <div className="about-text reveal">
                            <p>
                                <span className="hi">Hey — I&apos;m Prakhar.</span> I&apos;m a Backend &amp; AI Systems Developer
                                based in India, working with international clients across time zones. My work sits at the
                                intersection of <span className="em">scalable backend architecture</span>,{' '}
                                <span className="em">AI automation</span>, and{' '}
                                <span className="em">data intelligence systems</span>.
                            </p>
                            <p>
                                I don&apos;t just write code — I <span className="em">understand business problems</span> and
                                architect solutions around them. Whether it&apos;s a high-throughput FastAPI backend, a web scraping
                                pipeline that feeds structured data to an LLM, or a multi-database system for complex
                                applications — I think in systems, not tickets.
                            </p>
                            <p>
                                I&apos;ve delivered production-grade systems for remote clients, collaborated with PMs and
                                cross-functional teams, written documentation, optimized slow queries, and shipped features
                                that <span className="em">just work</span>.
                            </p>
                            <div className="work-style-grid">
                                {['Remote-first workflow', 'Async communication', 'Timezone flexible', 'Ownership mindset', 'Clear documentation', 'Deadline driven', 'Product thinking', 'System architecture'].map((s) => (
                                    <div key={s} className="work-style-item">{s}</div>
                                ))}
                            </div>
                        </div>
                        <div className="reveal">
                            <div className="terminal-window">
                                <div className="terminal-bar">
                                    <div className="terminal-dots">
                                        <div className="terminal-dot red" /><div className="terminal-dot yellow" /><div className="terminal-dot green" />
                                    </div>
                                    <div className="terminal-title">prakhar@remote:~</div>
                                </div>
                                <div className="terminal-body">
                                    <div className="terminal-line"><span className="t-prompt">~/</span> <span className="t-cmd">cat profile.json</span></div>
                                    <div className="terminal-line t-output">{'{'}</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;name&quot;: <span className="t-string">&quot;Prakhar Masih&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;role&quot;: <span className="t-string">&quot;Backend &amp; AI Systems Dev&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;location&quot;: <span className="t-string">&quot;India 🇮🇳&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;work&quot;: <span className="t-string">&quot;Remote Worldwide&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;stack&quot;: [</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-string">&quot;FastAPI&quot;</span>, <span className="t-string">&quot;Python&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-string">&quot;PostgreSQL&quot;</span>, <span className="t-string">&quot;MongoDB&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&nbsp;&nbsp;<span className="t-string">&quot;LLM APIs&quot;</span>, <span className="t-string">&quot;Docker&quot;</span></div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;],</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;status&quot;: <span className="t-string">&quot;open_to_work&quot;</span>,</div>
                                    <div className="terminal-line t-output">&nbsp;&nbsp;&quot;superpower&quot;: <span className="t-string">&quot;AI + Backend + Data&quot;</span></div>
                                    <div className="terminal-line t-output">{'}'}</div>
                                    <br />
                                    <div className="terminal-line"><span className="t-prompt">~/</span> <span className="t-cmd">ping availability</span></div>
                                    <div className="terminal-line t-success">✓ Available for remote contracts</div>
                                    <div className="terminal-line t-success">✓ Response time: &lt; 24 hours</div>
                                    <br />
                                    <div className="terminal-line"><span className="t-prompt">~/</span> <span className="t-cursor" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SKILLS ── */}
            <section id="skills">
                <div className="section-inner">
                    <div className="section-label">02 — Skills</div>
                    <h2 className="section-title">Technical <span className="accent">Arsenal</span></h2>
                    <div className="skills-categories">
                        {[
                            { color: 'cyan', icon: '⚡', name: 'Backend Engineering', tags: ['Python', 'FastAPI', 'SQLAlchemy', 'Async / asyncio', 'REST APIs', 'JWT Auth', 'RBAC', 'Pytest', 'API Design', 'Pagination'] },
                            { color: 'green', icon: '🗄️', name: 'Databases', tags: ['PostgreSQL', 'MongoDB', 'Redis', 'Neo4j', 'SQLite', 'Schema Design', 'Aggregation Pipelines', 'Indexing', 'Data Modeling'] },
                            { color: 'amber', icon: '🤖', name: 'AI / LLM / Data', tags: ['OpenAI API', 'Claude API', 'Prompt Engineering', 'NLP', 'Web Scraping', 'Data Extraction', 'Automation Pipelines', 'Structured Output', 'RLHF Concepts'] },
                            { color: 'red', icon: '🐳', name: 'DevOps & Tools', tags: ['Docker', 'Linux / Ubuntu', 'Git / GitHub', 'MinIO', 'Nginx', 'REST Architecture', 'Deployment'] },
                            { color: 'cyan', icon: '🎨', name: 'Frontend', tags: ['React.js', 'Next.js', 'Tailwind CSS', 'API Integration', 'Fullstack (BE-heavy)'] },
                            { color: 'green', icon: '🤝', name: 'Soft Skills & Work Style', tags: ['Remote Communication', 'Cross-timezone Collab', 'Client Requirements', 'Technical Docs', 'System Design Thinking', 'Performance Debug', 'Code Review', 'Ownership'] },
                        ].map((cat) => (
                            <div key={cat.name} className={`skill-category ${cat.color} reveal`}>
                                <div className="skill-cat-header">
                                    <div className="skill-cat-icon">{cat.icon}</div>
                                    <div className="skill-cat-name">{cat.name}</div>
                                </div>
                                <div className="skill-tags">
                                    {cat.tags.map((t) => <span key={t} className="skill-tag">{t}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PROJECTS ── */}
            <section id="projects">
                <div className="section-inner">
                    <div className="section-label">03 — Projects</div>
                    <h2 className="section-title">What I&apos;ve <span className="accent">Built</span></h2>
                    <div className="projects-grid">

                        <div className="project-card featured reveal">
                            <div className="project-num">001</div>
                            <div className="project-tag">AI + Automation</div>
                            <div className="project-name">Comedy Show Generator AI</div>
                            <div className="project-desc">
                                End-to-end AI pipeline that generates comedy show scripts, synthesizes dialogue via chatbot
                                interface, and produces video output. Integrated LLM orchestration with structured prompt
                                engineering and content generation pipeline.
                            </div>
                            <div className="project-stack">
                                {['Python', 'LLM APIs', 'FastAPI', 'Prompt Engineering', 'Video Gen'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer">
                                <a href="#" className="project-link">View Details <ArrowSvg /></a>
                            </div>
                            <svg className="project-visual" viewBox="0 0 140 140" fill="none">
                                <circle cx="70" cy="70" r="60" stroke="currentColor" strokeWidth="1" />
                                <circle cx="70" cy="70" r="40" stroke="currentColor" strokeWidth="1" />
                                <circle cx="70" cy="70" r="20" stroke="currentColor" strokeWidth="1" />
                                <line x1="10" y1="70" x2="130" y2="70" stroke="currentColor" strokeWidth="1" />
                                <line x1="70" y1="10" x2="70" y2="130" stroke="currentColor" strokeWidth="1" />
                            </svg>
                        </div>

                        <div className="project-card medium reveal">
                            <div className="project-num">002</div>
                            <div className="project-tag">Data + Scraping</div>
                            <div className="project-name">AI Prospecting &amp; Lead Intelligence Tool</div>
                            <div className="project-desc">
                                Location-based prospecting system: query → website discovery → scrape → AI-powered structured
                                extraction → clean JSON output. Fully automated lead generation pipeline.
                            </div>
                            <div className="project-stack">
                                {['Python', 'Web Scraping', 'OpenAI', 'FastAPI', 'PostgreSQL'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">View Details <ArrowSvg /></a></div>
                        </div>

                        <div className="project-card half reveal">
                            <div className="project-num">003</div>
                            <div className="project-tag">Backend Architecture</div>
                            <div className="project-name">Ride Management System</div>
                            <div className="project-desc">Complex multi-entity backend with itinerary planning, MongoDB aggregation, route optimization, and real-time ride state management.</div>
                            <div className="project-stack">
                                {['FastAPI', 'MongoDB', 'Redis', 'Async'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">View Details <ArrowSvg /></a></div>
                        </div>

                        <div className="project-card half reveal">
                            <div className="project-num">004</div>
                            <div className="project-tag">Social Graph</div>
                            <div className="project-name">Friend Suggestion System</div>
                            <div className="project-desc">Graph-based social recommendation engine using Neo4j for relationship traversal, MongoDB for user data, and Redis for caching hot suggestions.</div>
                            <div className="project-stack">
                                {['Neo4j', 'MongoDB', 'Redis', 'FastAPI'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">View Details <ArrowSvg /></a></div>
                        </div>

                        <div className="project-card third reveal">
                            <div className="project-num">005</div>
                            <div className="project-tag">Content Platform</div>
                            <div className="project-name">Blogging Platform Backend</div>
                            <div className="project-desc">Full REST API backend with auth, roles, media via MinIO.</div>
                            <div className="project-stack">
                                {['FastAPI', 'PostgreSQL', 'MinIO', 'JWT'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">Details <ArrowSvg /></a></div>
                        </div>

                        <div className="project-card third reveal">
                            <div className="project-num">006</div>
                            <div className="project-tag">Communication</div>
                            <div className="project-name">Multi-Channel Notification System</div>
                            <div className="project-desc">WhatsApp, Email, Telegram, SMS unified integration layer.</div>
                            <div className="project-stack">
                                {['FastAPI', 'Twilio', 'Telegram API'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">Details <ArrowSvg /></a></div>
                        </div>

                        <div className="project-card third reveal">
                            <div className="project-num">007</div>
                            <div className="project-tag">AI + NLP</div>
                            <div className="project-name">Language Learning Chatbot</div>
                            <div className="project-desc">Conversational AI tutor with adaptive difficulty and NLP comprehension scoring.</div>
                            <div className="project-stack">
                                {['Claude API', 'NLP', 'FastAPI'].map((t) => <span key={t} className="project-tech">{t}</span>)}
                            </div>
                            <div className="project-footer"><a href="#" className="project-link">Details <ArrowSvg /></a></div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── EXPERIENCE ── */}
            <section id="experience">
                <div className="section-inner">
                    <div className="section-label">04 — Experience</div>
                    <h2 className="section-title">Work <span className="accent">History</span></h2>
                    <div className="exp-timeline">
                        <div className="exp-item reveal">
                            <div className="exp-period">2023 — Present</div>
                            <div className="exp-role">AI Specialist &amp; Backend Developer</div>
                            <div className="exp-company">Strollr (Remote Contract) · International Client</div>
                            <div className="exp-desc">Delivered AI-powered features and backend systems for a remote-first team. Responsibilities included building ML/NLP pipelines, web scraping infrastructure, API development, performance optimization, and cross-timezone collaboration with developers and project managers.</div>
                            <div className="exp-tags">
                                {['AI/ML Integration', 'NLP', 'Web Scraping', 'FastAPI', 'Remote Team', 'Documentation'].map((t) => <span key={t} className="exp-tag">{t}</span>)}
                            </div>
                        </div>
                        <div className="exp-item reveal">
                            <div className="exp-period">2022 — 2023</div>
                            <div className="exp-role">Backend Developer</div>
                            <div className="exp-company">Software Company · Full-time</div>
                            <div className="exp-desc">Built production-grade REST APIs with FastAPI and MongoDB. Designed database schemas for complex applications, built aggregation pipelines, optimized query performance, wrote test suites, and collaborated on system architecture decisions.</div>
                            <div className="exp-tags">
                                {['FastAPI', 'MongoDB', 'PostgreSQL', 'System Design', 'Pytest', 'Code Review'].map((t) => <span key={t} className="exp-tag">{t}</span>)}
                            </div>
                        </div>
                        <div className="exp-item reveal">
                            <div className="exp-period">2021 — 2022</div>
                            <div className="exp-role">Freelance Backend Developer</div>
                            <div className="exp-company">Independent · Remote Clients</div>
                            <div className="exp-desc">Delivered multiple backend systems for independent clients, including API development, database design, and automation scripts. Established working patterns for async communication and remote delivery.</div>
                            <div className="exp-tags">
                                {['Python', 'REST APIs', 'Automation', 'Client Delivery'].map((t) => <span key={t} className="exp-tag">{t}</span>)}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CASE STUDIES ── */}
            <section id="casestudies">
                <div className="section-inner">
                    <div className="section-label">05 — Case Studies</div>
                    <h2 className="section-title">Engineering <span className="accent">Deep Dives</span></h2>
                    <div className="cases-grid">
                        {[
                            { num: '01', icon: '🔍', title: 'Scaling a Web Scraping Pipeline for Lead Gen', desc: 'Built a fully automated pipeline that takes a geographic query, discovers relevant business websites, scrapes structured data, and uses an LLM to extract clean JSON. Handled rate limiting, deduplication, and relevance filtering.', m1: '10k+', l1: 'Records/run', m2: '95%', l2: 'Data accuracy' },
                            { num: '02', icon: '⚡', title: 'Optimizing MongoDB Aggregation for Complex Queries', desc: 'Identified bottlenecks in multi-stage aggregation pipelines for a real-time ride system. Redesigned schema, added compound indexes, and rewrote pipeline stages — reducing query time dramatically.', m1: '8x', l1: 'Faster queries', m2: '60%', l2: 'Less CPU load' },
                            { num: '03', icon: '🤖', title: 'Building an AI Automation System with Structured Outputs', desc: 'Designed a prompt engineering architecture that coerces LLM outputs into strict JSON schemas for downstream processing. Implemented retry logic, validation layers, and fallback strategies.', m1: '99%', l1: 'Parse success', m2: '3x', l2: 'Dev speed' },
                            { num: '04', icon: '🏗️', title: 'Designing a Multi-Database Architecture for Social App', desc: 'Architected a system using Neo4j for graph relationships, MongoDB for user/content data, and Redis for hot-path caching. Designed data flow and sync strategies between all three stores.', m1: '3', l1: 'DB systems', m2: '<50ms', l2: 'Graph query' },
                        ].map((c) => (
                            <div key={c.num} className="case-card reveal" data-num={c.num}>
                                <div className="case-icon">{c.icon}</div>
                                <div className="case-title">{c.title}</div>
                                <div className="case-desc">{c.desc}</div>
                                <div className="case-metrics">
                                    <div className="case-metric"><div className="case-metric-val">{c.m1}</div><div className="case-metric-label">{c.l1}</div></div>
                                    <div className="case-metric"><div className="case-metric-val">{c.m2}</div><div className="case-metric-label">{c.l2}</div></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SERVICES ── */}
            <section id="services">
                <div className="section-inner">
                    <div className="section-label">06 — Services</div>
                    <h2 className="section-title">What I <span className="accent">Offer</span></h2>
                    <div className="services-grid">
                        {[
                            { n: '01', name: 'Backend Development', desc: 'Scalable FastAPI backends, RESTful API design, authentication systems, and performance-optimized server architecture.' },
                            { n: '02', name: 'AI Integration', desc: 'LLM API integration, prompt engineering, AI-powered workflows, chatbot backends, and structured output systems.' },
                            { n: '03', name: 'Data Extraction & Scraping', desc: 'Web scraping pipelines, AI-powered extraction, lead generation systems, and structured data delivery at scale.' },
                            { n: '04', name: 'Database Design', desc: 'Schema design for relational and NoSQL databases, aggregation pipelines, indexing strategy, and query optimization.' },
                            { n: '05', name: 'Automation Systems', desc: 'End-to-end automation pipelines, workflow orchestration, notification systems, and background job processing.' },
                            { n: '06', name: 'System Architecture', desc: 'Early-stage system design, microservice planning, multi-database architecture, and technical documentation.' },
                            { n: '07', name: 'MVP Development', desc: 'Fast, clean MVPs for startups — from backend architecture to API-ready systems with the right tech for scale.' },
                            { n: '08', name: 'Remote Contract Work', desc: 'Available for part-time or full-time remote contracts. Experienced with async teams, time zone gaps, and clear deliverables.' },
                        ].map((s) => (
                            <div key={s.n} className="service-item reveal">
                                <div className="service-num">{s.n}</div>
                                <div className="service-name">{s.name}</div>
                                <div className="service-desc">{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CONTACT ── */}
            <section id="contact">
                <div className="section-inner">
                    <div className="section-label">07 — Contact</div>
                    <div className="contact-grid">
                        <div className="reveal">
                            <div className="contact-tagline">Let&apos;s build something<br /><span className="accent">extraordinary.</span></div>
                            <p className="contact-para">Whether you need a scalable backend, an AI automation system, or a data pipeline — I&apos;m ready to help. Remote-first, deadline-driven, and easy to work with.</p>
                            <div className="contact-links">
                                <a href="mailto:prakhar@example.com" className="contact-link">
                                    <div className="contact-link-icon">✉</div>
                                    <div className="contact-link-text"><div className="contact-link-label">Email</div><div className="contact-link-val">prakhar@example.com</div></div>
                                    <div className="contact-link-arrow">→</div>
                                </a>
                                <a href="https://github.com/prakharmasih" target="_blank" rel="noopener noreferrer" className="contact-link">
                                    <div className="contact-link-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                                    </div>
                                    <div className="contact-link-text"><div className="contact-link-label">GitHub</div><div className="contact-link-val">github.com/prakharmasih</div></div>
                                    <div className="contact-link-arrow">→</div>
                                </a>
                                <a href="https://linkedin.com/in/prakharmasih" target="_blank" rel="noopener noreferrer" className="contact-link">
                                    <div className="contact-link-icon">in</div>
                                    <div className="contact-link-text"><div className="contact-link-label">LinkedIn</div><div className="contact-link-val">linkedin.com/in/prakharmasih</div></div>
                                    <div className="contact-link-arrow">→</div>
                                </a>
                                <a href="#" className="contact-link">
                                    <div className="contact-link-icon">📅</div>
                                    <div className="contact-link-text"><div className="contact-link-label">Schedule a Call</div><div className="contact-link-val">calendly.com/prakharmasih</div></div>
                                    <div className="contact-link-arrow">→</div>
                                </a>
                            </div>
                        </div>
                        <div className="reveal">
                            <div className="avail-card">
                                <div className="avail-header"><div className="avail-dot" /><div className="avail-label">Currently Available</div></div>
                                <div className="avail-text">Open to Remote Contracts</div>
                                <div className="avail-sub">Available for part-time and full-time remote work. Comfortable working with teams in US, EU, and APAC time zones.</div>
                                <LiveClock />
                            </div>
                            <a href="#" className="btn-primary" style={{ width: '100%', justifyContent: 'center', clipPath: 'none', borderRadius: '2px' }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" /></svg>
                                Download Resume
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer>
                <div className="footer-left">© 2025 Prakhar Masih — Backend &amp; AI Systems Developer — India</div>
                <div className="footer-right">Built with <span>❤</span> &amp; <span>code</span></div>
            </footer>
        </div>
    );
}

function ArrowSvg() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}
