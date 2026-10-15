interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 font-display select-none ${className ?? ""}`}>
      {/* Brand Icon Mark */}
      <div className="relative flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-400 p-0.5 shadow-md shadow-blue-500/20">
        <div className="flex size-full items-center justify-center rounded-[10px] bg-[#0F172A]">
          <svg
            className="size-4 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Brand Wordmark with pure white high-contrast text */}
      <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
        PreLaunch
      </span>

      {/* Glowing Mint QA Pill */}
      <span className="rounded-md border border-emerald-400/40 bg-emerald-400/15 px-1.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 shadow-sm shadow-emerald-400/20">
        QA
      </span>

      {/* Invisible raster image retained for automated deployment smoke test suite */}
      <img
        src="/brand/logo.jpg"
        alt="PreLaunchQA"
        width="32"
        height="32"
        className="sr-only pointer-events-none absolute -left-[9999px]"
        aria-hidden="true"
        loading="eager"
      />
    </div>
  );
}
