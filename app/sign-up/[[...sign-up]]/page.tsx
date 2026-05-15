import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import { LogoMark } from '@/components/ui/Logo';

export default function SignUpPage() {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base py-16">
      <div className="absolute inset-0 bg-dot-grid opacity-40" aria-hidden />
      <div className="glow-violet h-[400px] w-[400px] right-1/4 top-1/3" aria-hidden />

      <div className="relative z-10 flex flex-col items-center">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={48} />
          <span className="font-display text-2xl font-bold text-text-primary">
            Synapse<span className="text-accent">AI</span>
          </span>
        </Link>

        {hasClerk ? (
          <SignUp signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
        ) : (
          <div className="card max-w-md text-center">
            <h1 className="heading-section text-2xl text-text-primary">Inscription</h1>
            <p className="mt-3 text-sm text-text-secondary">
              Clerk n'est pas encore configuré. Renseignez vos clés Clerk dans{' '}
              <code className="text-accent">.env.local</code>.
            </p>
            <Link href="/dashboard" className="btn-outline mt-6 w-full !text-sm">
              Continuer en mode démo →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
