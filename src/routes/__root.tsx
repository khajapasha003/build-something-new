import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PreLaunchQA" },
      {
        name: "description",
        content:
          "Real-browser checks for AI-built web apps: console errors, broken links, accessibility, and raw evidence for every finding.",
      },
      { property: "og:title", content: "PreLaunchQA" },
      {
        property: "og:description",
        content:
          "Real-browser checks for AI-built web apps: console errors, broken links, accessibility, and raw evidence for every finding.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://prelaunchqa.com/brand/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://prelaunchqa.com/brand/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://prelaunchqa.com" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap",
      },
      { rel: "icon", href: "/brand/logo.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PreLaunchQA",
    "url": "https://prelaunchqa.com",
    "logo": "https://prelaunchqa.com/brand/logo.png",
    "description":
      "Automated real-browser testing for AI-built web apps. Console errors, broken links, accessibility gaps — each finding backed by raw browser evidence.",
    "sameAs": [],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PreLaunchQA",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "url": "https://prelaunchqa.com",
    "description":
      "Real-browser checks for AI-built web apps: console errors, broken links, accessibility, and raw evidence for every finding.",
    "offers": [
      {
        "@type": "Offer",
        "name": "Sample Scan",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Free single-page check with raw browser evidence.",
      },
      {
        "@type": "Offer",
        "name": "Launch Check",
        "price": "49",
        "priceCurrency": "USD",
        "description":
          "Deep pre-launch audit: multi-page crawl, interactive flows, full evidence bundle.",
      },
      {
        "@type": "Offer",
        "name": "Monthly Re-test",
        "price": "99",
        "priceCurrency": "USD",
        "description":
          "Unlimited automated checks with before/after deploy comparison diffs.",
      },
    ],
    "featureList": [
      "Real Chromium browser testing",
      "Console error detection",
      "Broken link discovery",
      "Accessibility gap detection",
      "Raw browser evidence for every finding",
      "Before/after re-scan comparison",
      "Domain ownership verification",
      "HMAC-signed secure worker API",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What does PreLaunchQA check?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "PreLaunchQA loads your web app in a real Chromium browser and checks for console errors, failed network requests, broken links, missing meta tags, images without alt text, form fields without labels, mixed content issues, and more. Every finding includes raw browser evidence.",
        },
      },
      {
        "@type": "Question",
        "name": "Who is PreLaunchQA for?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "PreLaunchQA is built for developers using AI coding tools like Lovable, Bolt, Cursor, and v0 who want to verify their AI-generated web apps actually work in a real browser before going live.",
        },
      },
      {
        "@type": "Question",
        "name": "How is PreLaunchQA different from Lighthouse or PageSpeed?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "PreLaunchQA focuses on functional correctness — real browser console errors, network failures, and dead links — rather than performance scores. It verifies domain ownership before scanning, provides before/after comparison diffs, and targets the specific issues AI-generated code produces.",
        },
      },
      {
        "@type": "Question",
        "name": "Is PreLaunchQA free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Yes, the Sample Scan is free and gives you a single-page check with full raw browser evidence. For deeper audits, the Launch Check is $49 one-time and the Monthly Re-test plan is $99/month for unlimited checks.",
        },
      },
      {
        "@type": "Question",
        "name": "Do I need to give PreLaunchQA access to my code?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "No. PreLaunchQA only needs the URL of your live or staging site. It loads the page in a browser just like a real user would. You verify domain ownership via DNS record, meta tag, or file upload before any check runs.",
        },
      },
      {
        "@type": "Question",
        "name": "Does PreLaunchQA work with apps built in Lovable, Bolt.new, Cursor, or v0?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text":
            "Yes! PreLaunchQA is specifically optimized for applications generated by AI tools such as Lovable, Bolt.new, Cursor, Devin, and v0. It catches silent runtime console errors, unhandled async states, broken routes, and missing meta tags before your users encounter them.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to check your AI-built web app with PreLaunchQA",
    "description":
      "Three simple steps to get a comprehensive browser-based quality check on your web application.",
    "step": [
      {
        "@type": "HowToStep",
        "name": "Verify you own the app",
        "text":
          "Add a DNS record, meta tag, or verification file to prove you own the domain. Nothing is checked until ownership is confirmed.",
      },
      {
        "@type": "HowToStep",
        "name": "We inspect your page",
        "text":
          "A real Chromium browser loads your app and records console errors, failed network calls, dead links, and DOM hygiene issues.",
      },
      {
        "@type": "HowToStep",
        "name": "You get evidence",
        "text":
          "Each finding carries raw JSON evidence from the browser session, plus automatic before/after diffs when you re-scan.",
      },
    ],
  },
];

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
