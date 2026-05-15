import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="relative border-t border-[rgba(0,229,255,0.10)] py-12">
      <div className="container-narrow">
        <div className="flex flex-col items-start gap-10 md:flex-row md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-text-secondary">
              Vos collaborateurs IA à temps plein.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-text-secondary">
            <Link href="#agents" className="hover:text-text-primary">
              Agents
            </Link>
            <Link href="#temoignages" className="hover:text-text-primary">
              Témoignages
            </Link>
            <Link href="#tarifs" className="hover:text-text-primary">
              Tarifs
            </Link>
            <Link href="/legal/mentions" className="hover:text-text-primary">
              Mentions légales
            </Link>
            <Link href="/legal/cgu" className="hover:text-text-primary">
              CGU
            </Link>
            <Link href="/legal/privacy" className="hover:text-text-primary">
              Politique confidentialité
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t border-[rgba(0,229,255,0.08)] pt-6 text-xs text-text-muted md:flex-row md:items-center md:justify-between">
          <span>© 2025 SynapseAI Workforce. Tous droits réservés.</span>
          <span>Claude products are ad-free</span>
        </div>
      </div>
    </footer>
  );
}
