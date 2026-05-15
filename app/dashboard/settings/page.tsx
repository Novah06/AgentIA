import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-bg-base">
      <DashboardNav />
      <div className="container-narrow py-14">
        <h1 className="heading-display text-4xl text-text-primary">Paramètres</h1>
        <p className="mt-2 text-text-secondary">
          Configurez le contexte de votre entreprise pour personnaliser le travail de vos agents.
        </p>

        <form className="card mt-10 grid gap-5 md:grid-cols-2">
          <Field label="Nom de l'entreprise" name="companyName" />
          <Field label="Secteur" name="sector" />
          <Field label="Ville" name="city" />
          <Field label="Effectif" name="employeeCount" type="number" />
          <Field label="Régime de TVA" name="vatRegime" />
          <Field label="Logiciel comptable" name="accountingSoftware" />
          <Field label="Convention collective" name="collectiveAgreement" />
          <Field label="Seuil d'autonomie (€)" name="autonomyThreshold" type="number" />

          <div className="md:col-span-2">
            <button type="button" className="btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = 'text',
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
        {label}
      </label>
      <input
        name={name}
        type={type}
        className="w-full rounded-lg border border-[rgba(0,229,255,0.15)] bg-bg-base px-4 py-3 text-sm text-text-primary outline-none focus:border-accent"
      />
    </div>
  );
}
