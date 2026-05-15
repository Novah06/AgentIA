'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { MessageBubble, type ChatMessage } from './Message';

interface Props {
  agent: AgentId;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

export function ChatInterface({ agent }: Props) {
  const config = AGENT_CONFIG[agent];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: config.welcomeMessage,
    },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() && pendingFiles.length === 0) return;

      setError(null);
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        files: pendingFiles.map((f) => ({ name: f.name, size: f.size })),
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' };

      const filesForApi = pendingFiles.map((f) => ({
        name: f.name,
        content: f.content,
        type: f.type,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setPendingFiles([]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const historyForApi = [...messages, userMsg]
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content || ' ' }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent,
            messages: historyForApi,
            uploadedFiles: filesForApi,
            clientContext: {},
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erreur API');
        }

        if (!res.body) throw new Error('Pas de flux de réponse');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: buffer } : m)),
          );
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "⚠️ Désolé, je n'ai pas pu traiter votre demande. Vérifiez que la clé ANTHROPIC_API_KEY est configurée.",
                }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [agent, messages, pendingFiles],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (streaming) return;
    void sendMessage(input);
  }

  function onTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!streaming) void sendMessage(input);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('agentId', agent);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload échoué');
      const data = await res.json();
      setPendingFiles((prev) => [
        ...prev,
        {
          name: file.name,
          size: file.size,
          type: file.type,
          content: data.content || '',
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function newChat() {
    abortRef.current?.abort();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: config.welcomeMessage,
      },
    ]);
    setPendingFiles([]);
    setInput('');
    setError(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Chat header */}
      <header className="flex items-center justify-between border-b border-[rgba(0,229,255,0.08)] bg-bg-base/60 px-5 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <AgentAvatar agent={agent} size={40} />
          <div>
            <div className="text-sm font-semibold text-text-primary">{config.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> En ligne
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={newChat}
            className="rounded-full border border-[rgba(0,229,255,0.15)] px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-[rgba(0,229,255,0.35)] hover:text-text-primary"
          >
            Nouveau chat
          </button>
          <Link
            href="/dashboard/history"
            className="rounded-full border border-[rgba(0,229,255,0.15)] px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-[rgba(0,229,255,0.35)] hover:text-text-primary"
          >
            Historique
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 md:px-6"
        style={{ background: 'rgba(8,12,18,0.6)' }}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} agent={agent} streaming={streaming} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="border-t border-[rgba(0,229,255,0.08)] bg-bg-base/60 p-4 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,229,255,0.15)] bg-bg-card px-3 py-1.5 text-xs"
                >
                  <span>📎</span>
                  <span className="text-text-primary">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}
                    className="text-text-muted hover:text-text-primary"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-[rgba(0,229,255,0.15)] bg-bg-card p-2 focus-within:border-accent">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile || streaming}
              aria-label="Joindre un fichier"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:opacity-50"
            >
              {uploadingFile ? '⏳' : '📎'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,.txt,image/*"
              onChange={onFileChange}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              disabled={streaming}
              rows={1}
              placeholder={
                streaming
                  ? `${config.name} réfléchit…`
                  : `Écrivez à ${config.name}… (Maj+Entrée pour nouvelle ligne)`
              }
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={streaming || (!input.trim() && pendingFiles.length === 0)}
              aria-label="Envoyer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-bg-base transition-all hover:bg-accent-dim disabled:opacity-40"
            >
              →
            </button>
          </div>

          {streaming && (
            <p className="mt-2 text-xs text-text-muted">{config.name} réfléchit…</p>
          )}
        </div>
      </form>
    </div>
  );
}
