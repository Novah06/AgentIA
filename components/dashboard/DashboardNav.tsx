'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/ui/Logo';

const LINKS = [
  { href: '/dashboard', label: 'Mes agents' },
  { href: '/dashboard/history', label: 'Historique' },
  { href: '/dashboard/settings', label: 'Paramètres' },
];

export function DashboardNav({ userName }: { userName?: string }) {
  const [hasClerk] = useState(!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(0,229,255,0.08)] bg-bg-base/80 backdrop-blur-xl">
      <div className="container-narrow flex h-16 items-center justify-between">
        <Logo href="/dashboard" />

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {userName && (
            <span className="hidden text-sm text-text-secondary md:inline">{userName}</span>
          )}
          {hasClerk ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(0,229,255,0.15)] text-sm font-semibold text-accent"
            >
              {(userName || 'D').charAt(0).toUpperCase()}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
