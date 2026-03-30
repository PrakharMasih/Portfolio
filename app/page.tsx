import Image from "next/image";
import Link from "next/link";
import SmokeBackground from "./components/SmokeBackground";

export default function IntroPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">

      {/* ── Smoke background — fades in first ── */}
      <div className="absolute inset-0 anim-fadein delay-0">
        <SmokeBackground smokeColor="#FF0000" />
      </div>

      {/* ── UI layer ── */}
      <div className="relative z-10 min-h-screen flex flex-col px-6 pt-8 pb-16 md:px-12 lg:px-20">

        {/* Role label + decorative line */}
        <div className="flex items-center gap-5">
          <p className="anim-left delay-1 text-[9px] tracking-[0.5em] text-white/50 uppercase font-light flex-shrink-0">
            Ai / Backend Engineer
          </p>
          <div className="anim-line delay-2 h-px w-32 bg-white/12" />
        </div>

        {/* ── Main content — vertically centred ── */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-5xl flex flex-col md:flex-row items-center md:items-end gap-14 md:gap-10">

            {/* ── Photo card ── */}
            <div className="anim-img delay-3 relative flex-shrink-0">

              {/* Frame */}
              <div className="relative
                w-[230px] h-[325px]
                sm:w-[265px] sm:h-[375px]
                md:w-[305px] md:h-[450px]
                lg:w-[355px] lg:h-[520px]
                overflow-hidden
              ">
                <Image
                  src="/pic2.png"
                  fill
                  alt="Portfolio photo"
                  className="object-cover object-top"
                  priority
                />
                {/* Bottom-edge vignette so the button blends in */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 to-transparent pointer-events-none" />
              </div>

              {/* Enter button — sits on the photo's bottom edge (half & half) */}
              <div className="anim-fadein delay-5 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-20">
                <Link
                  href="/home"
                  aria-label="Enter portfolio"
                  className="btn-glow
                    w-12 h-12 md:w-[52px] md:h-[52px] rounded-full
                    border border-white/25 bg-black/30 backdrop-blur-md
                    flex items-center justify-center
                    hover:border-white/60 hover:scale-110 hover:bg-white/10
                    transition-all duration-300 ease-out"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* ── Text block ── */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left pb-8">

              {/* Name — shiny gradient sweep */}
              <h1 className="shiny-text
                text-[50px] sm:text-[60px] md:text-[70px] lg:text-[82px]
              ">
                Prakhar
                <br />
                Masih
              </h1>

              {/* Description */}
              <p className="anim-fadeup delay-7
                md:border-l md:border-white/15 md:pl-4
                text-white/45 text-[12px] sm:text-[13px] leading-loose font-light
                max-w-[230px] sm:max-w-[260px] md:max-w-[290px]
              ">
                From problem to product — fast, focused, effective.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}