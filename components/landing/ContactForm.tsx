'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LogoMark } from '@/components/ui/Logo';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preselected, setPreselected] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#?[^?]*\??/, ''));
    const agent = params.get('agent');
    if (agent === 'aria') setPreselected(['ARIA Finance']);
    else if (agent === 'nova') setPreselected(['NOVA Talent']);
    else if (agent === 'felix') setPreselected(['FELIX Office']);
    else if (agent === 'pack') setPreselected(['Pack 3 agents']);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    const fd = new FormData(e.currentTarget);
    const agents = fd.getAll('agents').map(String);
    const payload = {
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      company: fd.get('company'),
      employees: fd.get('employees'),
      secteur: fd.get('secteur'),
      agents,
      message: fd.get('message'),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }

  return (
    <section id="contact" className="relative py-24 md:py-32">
      <div className="container-narrow">
        <div className="mx-auto max-w-3xl text-center">
          <p className="label-muted mb-4">Contact</p>
          <h2 className="heading-section text-4xl text-text-primary md:text-5xl lg:text-6xl">
            Parlons de votre <span className="text-gradient-cyan">transformation</span>
          </h2>
          <p className="mt-6 text-lg text-text-secondary">
            Une démo de 30 minutes suffit pour voir concrètement ce que nos agents peuvent faire.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <div className="card relative overflow-hidden !p-8 md:!p-10">
            <div className="absolute right-6 top-6 opacity-70">
              <LogoMark size={42} />
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-3xl">
                  ✓
                </div>
                <h3 className="heading-section text-2xl text-text-primary">Demande envoyée</h3>
                <p className="mt-2 max-w-md text-text-secondary">
                  Merci ! Nous revenons vers vous sous 24h pour planifier votre démo.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Prénom *" name="firstName" required />
                <Field label="Nom *" name="lastName" required />
                <Field label="Email professionnel *" name="email" type="email" required />
                <Field label="Téléphone" name="phone" type="tel" />
                <Field label="Entreprise *" name="company" required className="md:col-span-2" />

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
                    Effectif
                  </label>
                  <select
                    name="employees"
                    className="w-full rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-base px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner…
                    </option>
                    <option value="1-9">1-9 salariés</option>
                    <option value="10-49">10-49 salariés</option>
                    <option value="50-249">50-249 salariés</option>
                    <option value="250+">250+ salariés</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
                    Secteur d'activité
                  </label>
                  <select
                    name="secteur"
                    className="w-full rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-base px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Choisir votre secteur…
                    </option>
                    <option value="btp">BTP / Construction</option>
                    <option value="commerce">Commerce / Distribution</option>
                    <option value="services">Services / Conseil</option>
                    <option value="tech">Tech / SaaS / Start-up</option>
                    <option value="industrie">Industrie / Logistique</option>
                    <option value="sante">Santé / Médico-social</option>
                    <option value="immobilier">Immobilier</option>
                    <option value="expertise">Expertise comptable / Juridique</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
                    Agent(s) qui m'intéresse(nt)
                  </label>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {['ARIA Finance', 'NOVA Talent', 'FELIX Office', 'Pack 3 agents'].map((a) => (
                      <label
                        key={a}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-[rgba(0,229,255,0.10)] bg-bg-base px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-[rgba(0,229,255,0.25)] hover:text-text-primary has-[:checked]:border-accent has-[:checked]:text-text-primary"
                      >
                        <input
                          type="checkbox"
                          name="agents"
                          value={a}
                          defaultChecked={preselected.includes(a)}
                          className="accent-accent"
                        />
                        {a}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
                    Votre besoin
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    className="w-full rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-base px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                    placeholder="Décrivez brièvement votre contexte et vos objectifs…"
                  />
                </div>

                {error && (
                  <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn-primary w-full !py-3.5 !text-base disabled:opacity-60"
                  >
                    {status === 'submitting' ? 'Envoi en cours…' : 'Envoyer ma demande →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-base px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
      />
    </div>
  );
}
