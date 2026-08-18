import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Pages légales de Metria.
 *
 * ⚠️ Les mentions entre crochets doivent être remplacées par les
 * informations réelles de l'entreprise éditrice avant toute mise en
 * service commerciale — elles ne sont pas des valeurs par défaut
 * acceptables juridiquement.
 */
const A_COMPLETER = '[à compléter]';

const PAGES: Record<string, { title: string; intro: string; sections: { h: string; p: string[] }[] }> =
  {
    mentions: {
      title: 'Mentions légales',
      intro: "Informations légales relatives à l'éditeur du service Metria.",
      sections: [
        {
          h: 'Éditeur du site',
          p: [
            `Dénomination sociale : ${A_COMPLETER}`,
            `Forme juridique et capital social : ${A_COMPLETER}`,
            `Siège social : ${A_COMPLETER}`,
            `RCS / SIREN : ${A_COMPLETER}`,
            `Numéro de TVA intracommunautaire : ${A_COMPLETER}`,
            `Directeur de la publication : ${A_COMPLETER}`,
            `Contact : ${A_COMPLETER}`,
          ],
        },
        {
          h: 'Hébergement',
          p: [
            'Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.',
            "Les données applicatives sont hébergées au sein de l'Union européenne lorsque la configuration du service le permet.",
          ],
        },
        {
          h: 'Propriété intellectuelle',
          p: [
            "L'ensemble des éléments composant le service (interface, textes, code) est protégé par le droit de la propriété intellectuelle. Les documents que vous déposez restent votre propriété exclusive.",
          ],
        },
      ],
    },
    cgu: {
      title: "Conditions générales d'utilisation",
      intro: "Règles d'utilisation du service Metria.",
      sections: [
        {
          h: 'Objet du service',
          p: [
            "Metria est un outil d'aide à l'avant-chiffrage destiné aux professionnels de la fabrication de stands, de l'agencement et de l'aménagement temporaire. À partir des documents fournis par l'utilisateur, il produit une analyse structurée et une estimation indicative.",
          ],
        },
        {
          h: 'Nature des résultats produits',
          p: [
            "Les analyses, quantités, prix et durées produits par le service sont des propositions générées par un système d'intelligence artificielle. Elles comportent des hypothèses et des approximations, signalées par un niveau de fiabilité.",
            "Elles ne constituent en aucun cas un devis, un engagement contractuel ou un conseil professionnel. Toute donnée doit être vérifiée et validée par un professionnel compétent avant d'être communiquée à un client ou utilisée comme base d'engagement.",
            "L'éditeur ne peut être tenu responsable des conséquences d'une utilisation des résultats sans vérification humaine préalable.",
          ],
        },
        {
          h: 'Accès et comptes',
          p: [
            "L'accès au service est réservé aux titulaires d'un abonnement. Les comptes sont créés par l'éditeur ; il n'existe pas d'inscription libre.",
            "L'utilisateur est responsable de la confidentialité de ses identifiants et des actions réalisées depuis son compte.",
            "L'éditeur peut suspendre un accès en cas de manquement aux présentes conditions ou de défaut de paiement.",
          ],
        },
        {
          h: 'Obligations de l’utilisateur',
          p: [
            "L'utilisateur garantit disposer des droits nécessaires sur les documents qu'il dépose, et s'engage à ne pas transmettre de contenu illicite.",
            "Il lui appartient de vérifier, avant tout dépôt, que la transmission des documents de ses clients est compatible avec ses propres engagements de confidentialité.",
          ],
        },
        {
          h: 'Disponibilité et évolution',
          p: [
            "Le service est fourni en l'état. L'éditeur s'efforce d'en assurer la disponibilité sans garantie de continuité, et peut faire évoluer les fonctionnalités.",
            `Droit applicable : droit français. Juridiction compétente : ${A_COMPLETER}.`,
          ],
        },
      ],
    },
    privacy: {
      title: 'Politique de confidentialité',
      intro: 'Traitement des données personnelles et des documents déposés.',
      sections: [
        {
          h: 'Données traitées',
          p: [
            "Données de compte : identité, adresse e-mail professionnelle, entreprise de rattachement.",
            'Contenus déposés : briefs, plans, rendus, devis et documents de référence transmis par vous, ainsi que les analyses produites à partir de ces contenus.',
            "Données techniques : journaux de connexion nécessaires à la sécurité du service.",
          ],
        },
        {
          h: 'Finalités et base légale',
          p: [
            "Les données sont traitées pour fournir le service souscrit (exécution du contrat), en assurer la sécurité et répondre aux obligations légales de l'éditeur.",
          ],
        },
        {
          h: 'Sous-traitants et transferts',
          p: [
            "L'analyse des documents fait appel à l'API d'Anthropic (Claude). Anthropic n'utilise pas les contenus transmis via son API pour entraîner ses modèles.",
            "L'hébergement applicatif est assuré par Vercel Inc. et le stockage des données par Supabase.",
            "Certains de ces prestataires étant établis hors de l'Union européenne, les transferts sont encadrés par les clauses contractuelles types de la Commission européenne.",
          ],
        },
        {
          h: 'Durée de conservation',
          p: [
            "Les projets et documents sont conservés pendant la durée de l'abonnement, puis supprimés dans un délai de trente jours après sa résiliation, sauf demande de suppression anticipée.",
          ],
        },
        {
          h: 'Vos droits',
          p: [
            "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de vos données.",
            `Ces droits s'exercent auprès de : ${A_COMPLETER}.`,
            "Vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).",
          ],
        },
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
    <main className="min-h-screen bg-studio-paper font-sans text-studio-ink">
      <header className="border-b border-studio-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-studio-amber" />
            <span className="text-lg font-semibold tracking-wide">Metria</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-studio-gray transition-colors hover:text-studio-ink"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-studio-gray">{page.intro}</p>

        <div className="mt-10 space-y-8">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2 text-base font-semibold">{s.h}</h2>
              <div className="space-y-2 text-sm leading-relaxed text-studio-gray">
                {s.p.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-studio-line pt-6 text-xs text-studio-gray">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}.
        </p>
      </article>
    </main>
  );
}
