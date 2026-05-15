import { currentUser } from '@clerk/nextjs/server';
import type { AgentId } from '@/lib/agents';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { ChatSidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';

export async function ChatPage({ agent }: { agent: AgentId }) {
  let firstName: string | undefined;
  try {
    const user = await currentUser();
    firstName = user?.firstName ?? user?.username ?? undefined;
  } catch {
    firstName = undefined;
  }

  return (
    <main className="flex h-screen flex-col bg-bg-base">
      <DashboardNav userName={firstName ?? 'Démo'} />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_1fr]">
        <ChatSidebar agent={agent} />
        <ChatInterface agent={agent} />
      </div>
    </main>
  );
}
