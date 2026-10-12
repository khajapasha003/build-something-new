import { Link } from "@tanstack/react-router";

import { BrandLogo } from "@/components/BrandLogo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link to="/" className="flex items-center">
          <BrandLogo className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/preorder" className="transition hover:text-foreground">
            Pre-order
          </Link>
          <Link to="/support" className="transition hover:text-foreground">
            Support
          </Link>
          <Link to="/auth" className="transition hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/preorder"
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:brightness-110"
          >
            Get early access
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>PreLaunchQA — real browser checks before launch. Launch with proof.</p>
        <nav className="flex gap-5">
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
