'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

const NAV_LINKS = [
  { href: '#agents', label: 'Nos agents' },
  { href: '#temoignages', label: 'Témoignages' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#about', label: 'À propos' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-[rgba(0,229,255,0.10)] bg-bg-base/70 backdrop-blur-xl'
          : 'border-b border-transparent'
      }`}
    >
      <div className="container-narrow flex h-16 items-center justify-between md:h-20">
        <Logo variant="icon" size={38} />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/sign-in" className="btn-outline !px-5 !py-2 text-sm">
            Se connecter
          </Link>
          <Link href="/sign-up" className="btn-primary !px-5 !py-2 text-sm">
            Démarrer
          </Link>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,229,255,0.15)] md:hidden"
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 bg-text-primary transition-all ${
                mobileOpen ? 'translate-y-1.5 rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 bottom-0 h-0.5 w-5 bg-text-primary transition-all ${
                mobileOpen ? '-translate-y-1 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`overflow-hidden border-t border-[rgba(0,229,255,0.08)] bg-bg-base/95 backdrop-blur-xl transition-all duration-300 md:hidden ${
          mobileOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <nav className="container-narrow flex flex-col gap-1 py-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-sm text-text-secondary hover:bg-bg-card hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-3 pt-2">
            <Link href="/sign-in" className="btn-outline !py-2.5 text-sm">
              Se connecter
            </Link>
            <Link href="/sign-up" className="btn-primary !py-2.5 text-sm">
              Démarrer
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
