import { Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/BrandLogo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/" className="flex items-center transition hover:opacity-90">
          <BrandLogo />
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
          <Link to="/guides" className="transition hover:text-foreground">
            Guides
          </Link>
          <Link to="/preorder" className="transition hover:text-foreground">
            Pricing
          </Link>
          <Link to="/support" className="transition hover:text-foreground">
            Support
          </Link>
          <Link to="/auth" className="transition hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/auth"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-primary to-indigo-600 px-4 py-2 font-display text-xs font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02] hover:shadow-violet-500/40 active:scale-[0.98]"
          >
            <span className="relative z-10">Start free check</span>
            <span className="relative z-10 transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="flex items-center">
              <BrandLogo className="opacity-90 transition hover:opacity-100" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-0.5 text-[11px] font-medium text-mint">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-mint"></span>
              </span>
              Worker Network Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Real Chromium browser checks for AI-built web apps. Launch with proof, not assumptions.
          </p>
        </div>
        <nav className="flex flex-wrap gap-5 text-xs font-medium">
          <Link to="/guides" className="transition hover:text-foreground">
            Guides
          </Link>
          <Link to="/status" className="transition hover:text-foreground">
            Status
          </Link>
          <Link to="/support" className="transition hover:text-foreground">
            Support
          </Link>
          <Link to="/terms" className="transition hover:text-foreground">
            Terms
          </Link>
          <Link to="/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

