import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6 text-center">
            <p className="text-[9px] tracking-[0.5em] text-white/40 uppercase font-light mb-8">
                Error / 404
            </p>

            <h1
                className="font-sans font-bold leading-none tracking-tighter mb-6"
                style={{ fontSize: "clamp(80px, 20vw, 200px)" }}
            >
                404
            </h1>

            <p className="text-white/50 text-sm tracking-widest uppercase mb-12">
                Page not found
            </p>

            <Link
                href="/"
                className="inline-flex items-center gap-3 px-8 py-3 border border-white/20 text-white/70 text-xs tracking-[0.2em] uppercase hover:border-white/60 hover:text-white transition-all duration-300"
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M10 6H2M6 10L2 6l4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                Return home
            </Link>
        </div>
    );
}
