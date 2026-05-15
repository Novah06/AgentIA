import { AgentAvatar } from '@/components/ui/AgentAvatar';
import type { AgentId } from '@/lib/agents';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reflexion?: string;
  files?: { name: string; size: number }[];
}

export function splitReflexion(content: string): { reflexion?: string; body: string } {
  const match = content.match(/<reflexion>([\s\S]*?)<\/reflexion>/);
  if (!match) return { body: content };
  const reflexion = match[1].trim();
  const body = content.replace(match[0], '').trim();
  return { reflexion, body };
}

export function MessageBubble({
  message,
  agent,
  streaming,
}: {
  message: ChatMessage;
  agent: AgentId;
  streaming?: boolean;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          {message.files && message.files.length > 0 && (
            <div className="mb-2 space-y-1">
              {message.files.map((f, i) => (
                <FileChip key={i} name={f.name} size={f.size} />
              ))}
            </div>
          )}
          {message.content && <div className="chat-bubble-user">{message.content}</div>}
        </div>
      </div>
    );
  }

  const { reflexion, body } = splitReflexion(message.content);

  return (
    <div className="flex items-start gap-3">
      <AgentAvatar agent={agent} size={36} />
      <div className="max-w-[80%] flex-1">
        <div className="chat-bubble-assistant">
          {body || (streaming ? <TypingDots /> : '')}
        </div>
        {reflexion && (
          <details className="mt-2 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer select-none text-xs text-text-muted hover:text-text-secondary">
              ▸ Réflexion
            </summary>
            <div className="reflexion-block">{reflexion}</div>
          </details>
        )}
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="typing-dot animate-typing [animation-delay:0ms]" />
      <span className="typing-dot animate-typing [animation-delay:200ms]" />
      <span className="typing-dot animate-typing [animation-delay:400ms]" />
    </span>
  );
}

function FileChip({ name, size }: { name: string; size: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-card px-3 py-2 text-xs">
      <span aria-hidden>📎</span>
      <span className="font-medium text-text-primary">{name}</span>
      <span className="text-text-muted">{(size / 1024).toFixed(1)} Ko</span>
    </div>
  );
}
