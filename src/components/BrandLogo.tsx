interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = "h-8 w-auto" }: BrandLogoProps) {
  return <img src="/brand/logo.jpg" alt="PreLaunchQA" className={className} />;
}
