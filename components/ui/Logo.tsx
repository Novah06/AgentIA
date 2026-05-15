import Link from 'next/link';

interface LogoProps {
  size?: number;
  withText?: boolean;
  href?: string;
  className?: string;
}

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <circle cx="17" cy="17" r="16" stroke="#00e5ff" strokeWidth="1.2" opacity="0.4" />
      <circle cx="17" cy="17" r="12" fill="rgba(0,229,255,0.07)" />
      <circle cx="17" cy="8" r="2.2" fill="#00e5ff" />
      <circle cx="25" cy="13" r="2.2" fill="#00e5ff" opacity="0.7" />
      <circle cx="25" cy="22" r="2.2" fill="#00e5ff" opacity="0.5" />
      <circle cx="17" cy="26" r="2.2" fill="#00e5ff" opacity="0.6" />
      <circle cx="9" cy="22" r="2.2" fill="#00e5ff" opacity="0.7" />
      <circle cx="9" cy="13" r="2.2" fill="#00e5ff" opacity="0.9" />
      <line x1="17" y1="8" x2="25" y2="13" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="25" y1="13" x2="25" y2="22" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="25" y1="22" x2="17" y2="26" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="17" y1="26" x2="9" y2="22" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="9" y1="22" x2="9" y2="13" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="9" y1="13" x2="17" y2="8" stroke="#00e5ff" strokeWidth="0.8" opacity="0.3" />
      <line x1="17" y1="8" x2="17" y2="26" stroke="#00e5ff" strokeWidth="0.8" opacity="0.2" />
      <line x1="9" y1="13" x2="25" y2="22" stroke="#00e5ff" strokeWidth="0.8" opacity="0.2" />
      <line x1="25" y1="13" x2="9" y2="22" stroke="#00e5ff" strokeWidth="0.8" opacity="0.2" />
    </svg>
  );
}

export function Logo({ size = 34, withText = true, href = '/', className = '' }: LogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {withText && (
        <span className="font-display text-lg font-bold tracking-tight text-text-primary">
          Synapse<span className="text-accent">AI</span>
        </span>
      )}
    </div>
  );
  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
