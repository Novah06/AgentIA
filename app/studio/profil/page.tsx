'use client';

import { useCallback, useEffect, useState } from 'react';
import { HelpTip } from '@/components/studio/HelpTip';
import { SourcesManager } from '@/components/studio/SourcesManager';
import {
  BUSINESS_QUESTIONS,
  SETTINGS_DEFAUT,
  SETTING_FIELDS,
  type ProfileSettings,
  type StudioProfile,
} from '@/lib/studio/profile';

/** Accepte la virgule décimale ; une case vide reste vide. */
function parseField(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

const THEMES = Array.from(new Set(BUSINESS_QUESTIONS.map((q) => q.theme)));

export default function ProfilPage() {
  const [companyName, setCompanyName] = useState('');
  const [settings, setSettings] = useState<ProfileSettings>(SETTINGS_DEFAUT);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/profile', { cache: 'no-store' });
      if (!res.ok) return;
      const { profile } = (await res.json()) as { profile: StudioProfile };
      setCompanyName(profile.companyName ?? '');
      setSettings({ ...SETTINGS_DEFAUT, ...profile.settings });
      setReponses(profile.reponses ?? {});
      setSavedAt(profile.updatedAt);
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setSetting(key: keyof ProfileSettings, raw: string) {
    const parsed = parseField(raw);
    setSettings((s) => ({ ...s, [key]: parsed }) as ProfileSettings);
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/studio/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, settings, reponses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');
      setSavedAt(data.profile.updatedAt);
      setSettings({ ...SETTINGS_DEFAUT, ...data.profile.settings });
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  const repondues = BUSINESS_QUESTIONS.filter((q) => reponses[q.key]?.trim()).length;

  const inputClass =
    'w-full rounded-lg border border-studio-line bg-white px-3 py-2 text-sm focus:border-studio-amber focus:outline-none focus:ring-2 focus:ring-studio-amber/20';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Notre entreprise</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-studio-gray">
          Ces informations sont utilisées dans chaque analyse : vos coefficients et taux servent de
          valeurs par défaut au chiffrage, et vos règles métier priment sur les règles générales de
          l&apos;outil. Plus vous les précisez, plus les estimations ressemblent à celles que vous
          feriez vous-même.
        </p>
      </header>

      {/* --- Identité --------------------------------------------------- */}
      <section className="mb-8 rounded-xl border border-studio-line bg-white p-5 sm:p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Nom de l&apos;entreprise</span>
          <input
            className={inputClass}
            value={companyName}
            placeholder="Votre raison sociale"
            onChange={(e) => {
              setCompanyName(e.target.value);
              setDirty(true);
            }}
          />
        </label>
      </section>

      {/* --- Paramètres de chiffrage ------------------------------------ */}
      <section className="mb-8 rounded-xl border border-studio-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          Nos paramètres de chiffrage
        </h2>
        <p className="mb-5 text-xs text-studio-gray">
          Cliquez sur un « ? » pour savoir à quoi sert chaque valeur.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SETTING_FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                {f.label}
                <HelpTip label={f.label}>{f.aide}</HelpTip>
                {f.optionnel && (
                  <span className="text-xs font-normal text-studio-gray">(facultatif)</span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={settings[f.key] ?? ''}
                  placeholder={f.optionnel ? '—' : String(SETTINGS_DEFAUT[f.key] ?? '')}
                  onChange={(e) => setSetting(f.key, e.target.value)}
                />
                <span className="shrink-0 text-sm text-studio-gray">{f.suffix}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* --- Règles métier ---------------------------------------------- */}
      <section className="mb-8 rounded-xl border border-studio-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          Nos règles métier
        </h2>
        <p className="mb-5 text-xs leading-relaxed text-studio-gray">
          Répondez avec vos propres mots, comme si vous formiez un nouveau chargé d&apos;affaires.
          Aucune réponse n&apos;est obligatoire — chacune améliore les analyses.{' '}
          <span className="font-semibold text-studio-ink">
            {repondues} / {BUSINESS_QUESTIONS.length} renseignée{repondues > 1 ? 's' : ''}
          </span>
        </p>

        <div className="space-y-8">
          {THEMES.map((theme) => (
            <div key={theme}>
              <h3 className="mb-3 border-b border-studio-line pb-1 text-xs font-semibold uppercase tracking-wider text-studio-amber-dark">
                {theme}
              </h3>
              <div className="space-y-5">
                {BUSINESS_QUESTIONS.filter((q) => q.theme === theme).map((q) => (
                  <label key={q.key} className="block">
                    <span className="mb-1.5 flex items-start gap-1.5 text-sm font-medium">
                      <span>{q.question}</span>
                      <HelpTip label={q.question}>
                        {q.aide}
                        <span className="mt-2 block text-studio-gray">{q.exemple}</span>
                      </HelpTip>
                    </span>
                    <textarea
                      className={`${inputClass} min-h-[80px] resize-y`}
                      value={reponses[q.key] ?? ''}
                      placeholder={q.exemple}
                      onChange={(e) => {
                        setReponses((r) => ({ ...r, [q.key]: e.target.value }));
                        setDirty(true);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Documents --------------------------------------------------- */}
      <section className="mb-8 rounded-xl border border-studio-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          Nos documents
        </h2>
        <p className="mb-5 text-xs leading-relaxed text-studio-gray">
          Tarifs fournisseurs, anciens devis, notes internes. Chaque fichier est lu une fois par
          l&apos;IA, transformé en fiche de référence, puis réutilisé dans toutes vos analyses.
        </p>
        <SourcesManager />
      </section>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Barre d'enregistrement toujours accessible */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-studio-line bg-studio-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || !loaded}
          className="rounded-lg bg-studio-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'Enregistré'}
        </button>
        {savedAt && !dirty && (
          <span className="text-xs text-studio-gray">
            Dernière mise à jour : {new Date(savedAt).toLocaleString('fr-FR')}
          </span>
        )}
        {dirty && (
          <span className="text-xs text-studio-gray">
            Modifications non enregistrées — elles ne seront pas prises en compte par les analyses.
          </span>
        )}
      </div>
    </div>
  );
}
