import { NextResponse } from 'next/server';
import {
  AGENT_CONFIG,
  buildSystemPrompt,
  isAgentId,
  type ClientContext,
} from '@/lib/agents';
import { getAnthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  agentId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  clientContext?: ClientContext;
  uploadedFiles?: { name: string; content: string; type: string }[];
  recentHistory?: string;
}

function enrichLastUserMessage(
  messages: ChatRequest['messages'],
  recentHistory?: string,
  files?: ChatRequest['uploadedFiles'],
): ChatRequest['messages'] {
  if (messages.length === 0) return messages;
  const last = messages[messages.length - 1];
  if (last.role !== 'user') return messages;

  let enriched = last.content;
  if (recentHistory && recentHistory.trim().length > 0) {
    enriched += `\n\n━━━ HISTORIQUE RÉCENT ━━━\n${recentHistory}`;
  }
  if (files && files.length > 0) {
    for (const f of files) {
      enriched += `\n\n━━━ FICHIER JOINT : ${f.name} ━━━\n${f.content}`;
    }
  }
  return [...messages.slice(0, -1), { ...last, content: enriched }];
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  if (!isAgentId(body.agentId)) {
    return NextResponse.json({ error: 'agentId invalide' }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages requis' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY non configurée. Ajoutez-la dans .env.local pour activer les agents.",
      },
      { status: 500 },
    );
  }

  const systemPrompt = buildSystemPrompt(body.agentId, body.clientContext || {});
  const enriched = enrichLastUserMessage(
    body.messages,
    body.recentHistory,
    body.uploadedFiles,
  );

  const conversationMessages = enriched.map((m) => ({
    role: m.role,
    content: m.content || ' ',
  }));

  try {
    const anthropic = getAnthropic();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const response = await anthropic.messages.stream({
            model: ANTHROPIC_MODEL,
            max_tokens: 2000,
            system: systemPrompt,
            messages: conversationMessages,
          });

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur Anthropic';
          controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Agent': AGENT_CONFIG[body.agentId].name,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur serveur' },
      { status: 500 },
    );
  }
}
