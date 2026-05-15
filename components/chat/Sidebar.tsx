import Link from 'next/link';
import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { AgentAvatar } from '@/components/ui/AgentAvatar';

interface Props {
  agent: AgentId;
}

export function ChatSidebar({ agent }: Props) {
  const a = AGENT_CONFIG[agent];

  return (
    <aside className="hidden h-full overflow-y-auto border-r border-[rgba(0,229,255,0.08)] bg-bg-base/40 p-6 lg:block">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Mes agents
      </Link>

      <div className="mt-6 flex items-start gap-3">
        <AgentAvatar agent={agent} size={56} />
        <div>
          <h2 className="heading-section text-xl text-text-primary">{a.name}</h2>
          <p className="text-xs text-text-secondary">{a.role}</p>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Actif
          </span>
        </div>
      </div>

      <Section title="Contexte">
        <p className="text-sm leading-relaxed text-text-secondary">{a.contextSummary}</p>
      </Section>

      <Section title="Actions rapides">
        <div className="space-y-2">
          {a.quickActions.map((q) => (
            <button
              key={q}
              className="w-full rounded-lg border border-[rgba(0,229,255,0.10)] bg-bg-card px-3 py-2 text-left text-xs text-text-primary transition-colors hover:border-[rgba(0,229,255,0.30)] hover:bg-bg-card-hover"
            >
              {q}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Documents">
        <p className="text-xs text-text-muted">Aucun document uploadé.</p>
        <p className="mt-2 text-xs text-text-secondary">
          Utilisez le trombone dans le chat pour joindre PDF, Excel, CSV, Word ou images.
        </p>
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="label-muted mb-3">{title}</h3>
      {children}
    </div>
  );
}
