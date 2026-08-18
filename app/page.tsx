'use client';

import Link from 'next/link';
import { useState } from 'react';

const FEATURES = [
  {
    title: 'Analyse du dossier',
    text: "Brief, plans PDF et rendus 3D sont lus par l'IA : résumé du projet, dimensions détectées, incohérences signalées.",
  },
  {
    title: 'Questions manquantes',
    text: "Les informations absentes du brief sont détectées avant le chiffrage : moins d'allers-retours, moins d'hypothèses dangereuses.",
  },
  {
    title: 'Préchiffrage en fourchette',
    text: 'Prestations probables, quantités, heures et coûts de revient min/max, basés sur vos tarifs fournisseurs et vos anciens dossiers.',
  },
  {
    title: 'Risques et traçabilité',
    text: "Chaque donnée indique sa source et sa fiabilité. La décision finale reste toujours au chargé d'affaires.",
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Déposez le dossier',
    text: 'Créez un projet, collez le brief du client et ajoutez les plans et rendus.',
  },
  {
    n: '2',
    title: "Lancez l'analyse",
    text: "En quelques minutes, l'IA prépare l'étude complète : prestations, questions, risques, préchiffrage.",
  },
  {
    n: '3',
    title: 'Vérifiez et décidez',
    text: "Votre équipe corrige, complète et transforme l'étude en devis — mieux, plus vite, sans oubli.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-studio-paper font-sans text-studio-ink">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-studio-line bg-studio-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-studio-amber" />
            <span className="text-lg font-semibold tracking-wide">Metria</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-studio-ink transition-colors hover:bg-white"
            >
              Se connecter
            </Link>
            <a
              href="#contact"
              className="rounded-lg bg-studio-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-studio-coal"
            >
              Demander une démo
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-20 text-center md:pt-28">
        <p className="mb-4 inline-block rounded-full border border-studio-line bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-studio-gray">
          Stands · Agencement · Événementiel
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          L&apos;avant-chiffrage assisté par IA pour les fabricants de stands
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-studio-gray">
          À partir d&apos;un brief, de plans et de visuels, Metria prépare la liste des
          prestations, les questions manquantes, les principaux risques et un préchiffrage à
          compléter — en minutes au lieu d&apos;heures.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#contact"
            className="rounded-lg bg-studio-amber px-6 py-3 text-sm font-semibold text-studio-ink transition-colors hover:bg-studio-amber-dark"
          >
            Demander une démo →
          </a>
          <a
            href="#fonctionnement"
            className="rounded-lg border border-studio-line bg-white px-6 py-3 text-sm font-semibold transition-colors hover:border-studio-gray"
          >
            Comment ça marche
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-studio-line bg-white py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-xl border border-studio-line p-6">
              <span aria-hidden className="mb-3 block h-2 w-8 rounded-full bg-studio-amber" />
              <h2 className="mb-1.5 text-base font-semibold">{f.title}</h2>
              <p className="text-sm leading-relaxed text-studio-gray">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section id="fonctionnement" className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight">
          Comment ça marche
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-studio-ink text-sm font-bold text-studio-amber">
                {s.n}
              </span>
              <h3 className="mb-1.5 font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-studio-gray">{s.text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-studio-gray">
          Metria apprend de votre entreprise : vos tarifs fournisseurs, vos anciens dossiers et
          vos règles métier alimentent chaque analyse. Plus vous l&apos;utilisez, plus les
          estimations sont justes.
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="border-t border-studio-line bg-white py-16">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight">
            Demander une démo
          </h2>
          <p className="mb-8 text-center text-sm text-studio-gray">
            L&apos;accès à Metria se fait sur abonnement, avec un compte créé pour votre
            entreprise. Laissez-nous vos coordonnées, nous revenons vers vous rapidement.
          </p>
          <DemoForm />
        </div>
      </section>

      <footer className="border-t border-studio-line py-8 text-center text-xs text-studio-gray">
        <p>© {new Date().getFullYear()} Metria — L&apos;avant-chiffrage assisté par IA.</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/sign-in" className="underline-offset-2 hover:underline">
            Espace client
          </Link>
          <Link href="/legal/mentions" className="underline-offset-2 hover:underline">
            Mentions légales
          </Link>
          <Link href="/legal/cgu" className="underline-offset-2 hover:underline">
            CGU
          </Link>
          <Link href="/legal/privacy" className="underline-offset-2 hover:underline">
            Confidentialité
          </Link>
        </p>
      </footer>
    </div>
  );
}

function DemoForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    message: '',
  });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  const inputClass =
    'w-full rounded-lg border border-studio-line bg-white px-3.5 py-2.5 text-sm text-studio-ink placeholder:text-studio-gray focus:border-studio-amber focus:outline-none focus:ring-2 focus:ring-studio-amber/25';

  if (state === 'sent') {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center text-sm text-emerald-800">
        Merci ! Votre demande est envoyée — nous vous recontactons très vite.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          aria-label="Prénom"
          className={inputClass}
          placeholder="Prénom *"
          required
          value={form.firstName}
          onChange={(e) => set('firstName', e.target.value)}
        />
        <input
          aria-label="Nom"
          className={inputClass}
          placeholder="Nom *"
          required
          value={form.lastName}
          onChange={(e) => set('lastName', e.target.value)}
        />
        <input
          aria-label="E-mail"
          type="email"
          className={inputClass}
          placeholder="E-mail professionnel *"
          required
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <input
          aria-label="Entreprise"
          className={inputClass}
          placeholder="Entreprise *"
          required
          value={form.company}
          onChange={(e) => set('company', e.target.value)}
        />
      </div>
      <input
        aria-label="Téléphone"
        className={inputClass}
        placeholder="Téléphone"
        value={form.phone}
        onChange={(e) => set('phone', e.target.value)}
      />
      <textarea
        aria-label="Message"
        className={`${inputClass} min-h-[100px] resize-y`}
        placeholder="Parlez-nous de votre activité (stands, agencement, volume de dossiers…)"
        value={form.message}
        onChange={(e) => set('message', e.target.value)}
      />
      {state === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          L&apos;envoi a échoué. Réessayez ou écrivez-nous directement.
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-lg bg-studio-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:opacity-60"
      >
        {state === 'sending' ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
    </form>
  );
}
