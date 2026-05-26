import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

const PAGES: Record<string, { title: string; intro: string; body: string[] }> = {
  mentions: {
    title: 'Mentions légales',
    intro: 'Informations légales relatives à OperisAI.',
    body: [
      'Éditeur : OperisAI SAS — RCS Paris.',
      "Directeur de la publication : direction@operis-ai.fr.",
      'Hébergement : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.',
      "Pour toute demande, écrivez à contact@operis-ai.fr.",
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    intro: "Règles d'utilisation de la plateforme OperisAI.",
    body: [
      "L'accès au service nécessite la création d'un compte et l'acceptation des présentes CGU.",
      'Les agents IA fournissent une assistance experte, mais leurs recommandations doivent être validées par un professionnel humain pour toute décision engageante.',
      "L'utilisateur est responsable de la confidentialité des données qu'il transmet aux agents.",
      'OperisAI se réserve le droit de suspendre tout compte en cas de manquement aux présentes.',
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    intro: 'Comment nous traitons vos données personnelles.',
    body: [
      'Nous collectons strictement les données nécessaires au fonctionnement du service : identité, email professionnel, contexte entreprise.',
      'Les conversations avec les agents sont stockées de manière chiffrée. Vous pouvez demander leur effacement à tout moment.',
      'Aucune donnée n\'est revendue ou utilisée à des fins publicitaires.',
      'Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et d\'effacement de vos données. Adressez votre demande à dpo@operis-ai.fr.',
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const page = PAGES[params.slug];
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-bg-base">
      <header className="border-b border-[rgba(0,229,255,0.08)]">
        <div className="container-narrow flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-text-secondary hover:text-text-primary">
            ← Retour
          </Link>
        </div>
      </header>

      <article className="container-narrow py-16">
        <h1 className="heading-display text-4xl text-text-primary md:text-5xl">{page.title}</h1>
        <p className="mt-4 max-w-2xl text-text-secondary">{page.intro}</p>
        <div className="mt-10 space-y-5 text-text-secondary">
          {page.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
