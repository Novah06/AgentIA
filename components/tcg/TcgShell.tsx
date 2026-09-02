'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/tcg', label: 'Tableau de bord' },
  { href: '/tcg/collection', label: 'Collection' },
  { href: '/tcg/coffre', label: 'Coffre-fort' },
  { href: '/tcg/scan', label: 'Scan' },
  { href: '/tcg/catalogue', label: 'Catalogue' },
];

export default function TcgShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-tcg-ink text-tcg-primary">
      <header className="sticky top-0 z-20 border-b border-tcg-line bg-tcg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/tcg" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tcg-gold font-display text-sm font-bold text-tcg-ink">
              P
            </span>
            <span className="font-display text-lg tracking-tight">Portefeuille Pokémon</span>
          </Link>

          <nav className="-mx-1 flex gap-1 overflow-x-auto">
            {LINKS.map((link) => {
              const active =
                link.href === '/tcg' ? pathname === '/tcg' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'bg-tcg-gold text-tcg-ink'
                      : 'text-tcg-secondary hover:bg-tcg-card-hover hover:text-tcg-primary'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-tcg-muted">
        Cotes en euros, relevées deux fois par jour (00 h et 12 h, heure de Paris).
        Les valeurs des cartes gradées et des états inférieurs au Near Mint sont des
        estimations dérivées du prix de référence.
      </footer>
    </div>
  );
}
