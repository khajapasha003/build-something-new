interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-8 w-auto" }: BrandLogoProps) {
  return (
    <picture className="inline-flex items-center shrink-0">
      <source srcSet="/brand/logo.svg" type="image/svg+xml" />
      <source srcSet="/brand/logo.png" type="image/png" />
      <img
        src="/brand/logo.jpg"
        alt="PreLaunchQA"
        className={className}
        loading="eager"
        decoding="async"
      />
    </picture>
  );
}
