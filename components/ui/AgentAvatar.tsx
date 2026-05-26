import Image from 'next/image';
import type { AgentId } from '@/lib/agents';

interface Props {
  agent: AgentId;
  size?: number;
  className?: string;
  large?: boolean;
}

const colors: Record<AgentId, { primary: string; bg: string; accent: string }> = {
  aria:  { primary: '#00e5ff', bg: '#0a1a22', accent: '#7b8cff' },
  nova:  { primary: '#3dffb0', bg: '#0a201a', accent: '#9bffd4' },
  felix: { primary: '#f0c040', bg: '#221a08', accent: '#ffd97a' },
};

const ILLUSTRATIONS: Record<AgentId, string> = {
  aria:  '/agents/aria.png',
  nova:  '/agents/nova.png',
  felix: '/agents/felix.png',
};

export function AgentAvatar({ agent, size = 56, className = '', large = false }: Props) {
  const c = colors[agent];
  const illustration = ILLUSTRATIONS[agent];

  return (
    <div
      className={`relative overflow-hidden ${large ? 'rounded-3xl' : 'rounded-2xl'} shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(160deg, ${c.bg} 0%, ${c.primary}08 100%)`,
        border: `1px solid ${c.primary}33`,
      }}
    >
      <Image
        src={illustration}
        alt={`${agent.toUpperCase()}`}
        fill
        className="object-cover object-top"
        sizes={`${size}px`}
        priority={large}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1/4"
        style={{ background: `linear-gradient(transparent, ${c.bg}99)` }}
      />
    </div>
  );
}
