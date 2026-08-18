import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { hasClerkConfigured } from '@/lib/auth';

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
  title: "Metria — L'avant-chiffrage assisté par IA pour les stands et l'agencement",
  description:
    "À partir d'un brief, de plans et de rendus 3D, Metria prépare la liste des prestations, les questions manquantes, les risques et un préchiffrage à compléter.",
  metadataBase: new URL('https://metria.fr'),
  openGraph: {
    title: 'Metria',
    description: "L'avant-chiffrage assisté par IA pour les stands et l'agencement.",
    type: 'website',
  },
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  const body = (
    <html lang="fr" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">{children}</body>
    </html>
  );

  if (!hasClerkConfigured) return body;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#e39a2e',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorText: '#0a0a0a',
          colorTextSecondary: '#8b8b8b',
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
    >
      {body}
    </ClerkProvider>
  );
}
