import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OperisAI — Vos collaborateurs IA à temps plein',
  description:
    "OperisAI déploie des agents IA autonomes qui prennent en charge vos postes comptables, RH et administratifs — 24h/24, sans onboarding, pour 70% du coût d'un salarié.",
  metadataBase: new URL('https://operis-ai.fr'),
  openGraph: {
    title: 'OperisAI',
    description: 'Vos collaborateurs IA à temps plein dès demain.',
    type: 'website',
  },
};

const hasClerkKeys =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );

  if (!hasClerkKeys) return body;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#00e5ff',
          colorBackground: '#0e1420',
          colorInputBackground: '#080c12',
          colorText: '#eef2f8',
          colorTextSecondary: '#8899b4',
          colorInputText: '#eef2f8',
          colorNeutral: '#eef2f8',
          borderRadius: '0.75rem',
        },
        elements: {
          card: 'bg-bg-card border border-[rgba(0,229,255,0.15)] shadow-2xl',
          headerTitle: 'text-text-primary',
          headerSubtitle: 'text-text-secondary',
          socialButtonsBlockButton:
            'border-[rgba(0,229,255,0.15)] hover:bg-bg-card-hover text-text-primary',
          formFieldInput:
            'bg-bg-base border-[rgba(0,229,255,0.15)] focus:border-accent text-text-primary',
          formButtonPrimary:
            'bg-accent hover:bg-accent-dim text-bg-base font-semibold rounded-full',
          footerActionLink: 'text-accent hover:text-accent-dim',
        },
      }}
    >
      {body}
    </ClerkProvider>
  );
}
