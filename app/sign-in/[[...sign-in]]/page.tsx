import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

/**
 * Connexion Metria. Pas d'inscription publique : les comptes sont créés
 * en interne à la souscription (voir docs/creation-comptes-clients.md),
 * le client se connecte ensuite avec les identifiants convenus.
 */
export default function SignInPage() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <main className="flex min-h-screen items-center justify-center bg-studio-paper py-16 font-sans text-studio-ink">
      <div className="flex flex-col items-center px-6">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-studio-amber" />
          <span className="text-xl font-semibold tracking-wide">Metria</span>
        </Link>

        {hasClerk ? (
          <SignIn
            forceRedirectUrl="/studio"
            appearance={{
              variables: {
                colorPrimary: '#e39a2e',
                colorBackground: '#ffffff',
                colorText: '#0a0a0a',
                colorTextSecondary: '#8b8b8b',
                colorInputBackground: '#ffffff',
                colorInputText: '#0a0a0a',
                colorNeutral: '#0a0a0a',
                borderRadius: '0.75rem',
              },
              elements: {
                card: 'border border-studio-line shadow-xl',
                formButtonPrimary:
                  'bg-studio-amber hover:bg-studio-amber-dark text-studio-ink font-semibold',
                footerActionLink: 'text-studio-amber-dark hover:text-studio-ink',
              },
            }}
          />
        ) : (
          <div className="max-w-md rounded-xl border border-studio-line bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold">Connexion</h1>
            <p className="mt-3 text-sm text-studio-gray">
              L&apos;authentification n&apos;est pas encore configurée (clés Clerk absentes de{' '}
              <code>.env.local</code>).
            </p>
            <Link
              href="/studio"
              className="mt-6 inline-block w-full rounded-lg bg-studio-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-studio-coal"
            >
              Continuer en mode atelier →
            </Link>
          </div>
        )}

        <p className="mt-6 max-w-sm text-center text-xs leading-relaxed text-studio-gray">
          Les accès Metria sont créés par notre équipe lors de la souscription.
          Pas encore de compte ? Contactez-nous pour une démonstration.
        </p>
      </div>
    </main>
  );
}
