'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Point d'interrogation qui déplie une explication.
 * Volontairement au clic plutôt qu'au survol : l'aide doit rester
 * accessible au clavier et sur écran tactile.
 */
export function HelpTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Aide : ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-studio-gray/50 text-[10px] font-bold text-studio-gray transition-colors hover:border-studio-amber hover:bg-studio-amber hover:text-studio-ink"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-20 block w-72 rounded-lg border border-studio-line bg-white p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-studio-ink shadow-lg sm:w-80"
        >
          {children}
        </span>
      )}
    </span>
  );
}
