import Image from 'next/image';
import type { AgentId } from '@/lib/agents';

interface Props {
  agent: AgentId;
  size?: number;
  className?: string;
  /** Passe true pour afficher en mode "illustration grande" (card agents / chat sidebar) */
  large?: boolean;
}

const colors: Record<AgentId, { primary: string; bg: string; accent: string }> = {
  aria:  { primary: '#00e5ff', bg: '#0a1a22', accent: '#7b8cff' },
  nova:  { primary: '#3dffb0', bg: '#0a201a', accent: '#9bffd4' },
  felix: { primary: '#f0c040', bg: '#221a08', accent: '#ffd97a' },
};

/**
 * Chemins des illustrations personnalisées.
 * Place tes fichiers dans /public/agents/ et mets à jour ces chemins.
 * Laisse null pour utiliser le fallback SVG intégré.
 */
const ILLUSTRATIONS: Record<AgentId, string | null> = {
  aria:  null,   // ex: '/agents/aria.png'
  nova:  null,   // ex: '/agents/nova.png'
  felix: null,   // ex: '/agents/felix.png'
};

export function AgentAvatar({ agent, size = 56, className = '', large = false }: Props) {
  const c = colors[agent];
  const illustration = ILLUSTRATIONS[agent];

  if (illustration) {
    return (
      <div
        className={`relative overflow-hidden ${large ? 'rounded-3xl' : 'rounded-2xl'} shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: c.bg,
          border: `1px solid ${c.primary}33`,
        }}
      >
        <Image
          src={illustration}
          alt={`Illustration ${agent}`}
          fill
          className="object-cover object-top"
          sizes={`${size}px`}
          priority
        />
        {/* Halo couleur en bas */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1/3"
          style={{ background: `linear-gradient(transparent, ${c.bg}cc)` }}
        />
      </div>
    );
  }

  /* ── Fallback SVG ── */
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${large ? 'rounded-3xl' : 'rounded-2xl'} ${className}`}
      style={{ width: size, height: size, background: c.bg, border: `1px solid ${c.primary}33` }}
    >
      {agent === 'aria'  && <AriaIcon  color={c.primary} accent={c.accent} size={size * 0.6} />}
      {agent === 'nova'  && <NovaIcon  color={c.primary} accent={c.accent} size={size * 0.6} />}
      {agent === 'felix' && <FelixIcon color={c.primary} accent={c.accent} size={size * 0.6} />}
    </div>
  );
}

/* ── Icônes SVG fallback ─────────────────────────────────────────── */

function AriaIcon({ color, accent, size }: { color: string; accent: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="16" r="6" fill={color} opacity="0.9" />
      <rect x="14" y="24" width="20" height="18" rx="3" fill={color} opacity="0.18" stroke={color} strokeWidth="1.4" />
      <path d="M17 36 L21 32 L25 35 L31 28" stroke={accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="17" cy="36" r="1.2" fill={accent} />
      <circle cx="31" cy="28" r="1.2" fill={accent} />
    </svg>
  );
}

function NovaIcon({ color, accent, size }: { color: string; accent: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="14" r="6" fill={color} opacity="0.9" />
      <rect x="14" y="22" width="20" height="20" rx="3" fill={color} opacity="0.18" stroke={color} strokeWidth="1.4" />
      <path d="M18 30 L22 34 L30 26" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="18" y1="38" x2="30" y2="38" stroke={color} strokeWidth="1.2" opacity="0.6" />
    </svg>
  );
}

function FelixIcon({ color, accent, size }: { color: string; accent: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="14" r="6" fill={color} opacity="0.9" />
      <rect x="12" y="22" width="24" height="18" rx="2" fill={color} opacity="0.15" stroke={color} strokeWidth="1.4" />
      <line x1="24" y1="22" x2="24" y2="40" stroke={color} strokeWidth="1.2" opacity="0.5" />
      <line x1="16" y1="28" x2="22" y2="28" stroke={accent} strokeWidth="1.2" />
      <line x1="16" y1="33" x2="22" y2="33" stroke={accent} strokeWidth="1.2" opacity="0.7" />
      <line x1="26" y1="28" x2="32" y2="28" stroke={accent} strokeWidth="1.2" />
      <line x1="26" y1="33" x2="32" y2="33" stroke={accent} strokeWidth="1.2" opacity="0.7" />
    </svg>
  );
}
