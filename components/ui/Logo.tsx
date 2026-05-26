import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  variant?: 'icon' | 'full';
  href?: string;
  className?: string;
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <Image
      src="/logos/logo-icon.png"
      alt="OperisAI"
      width={size}
      height={size}
      className="shrink-0"
      priority
    />
  );
}

export function LogoFull({ height = 36, className = '' }: { height?: number; className?: string }) {
  return (
    <Image
      src="/logos/logo-full.png"
      alt="OperisAI"
      width={Math.round(height * 4.5)}
      height={height}
      className={`shrink-0 object-contain ${className}`}
      priority
    />
  );
}

export function Logo({ size = 34, variant = 'icon', href = '/', className = '' }: LogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {variant === 'full' ? (
        <LogoFull height={size} />
      ) : (
        <LogoMark size={size} />
      )}
    </div>
  );
  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
