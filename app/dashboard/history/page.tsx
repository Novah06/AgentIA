import { DashboardNav } from '@/components/dashboard/DashboardNav';

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-bg-base">
      <DashboardNav />
      <div className="container-narrow py-14">
        <h1 className="heading-display text-4xl text-text-primary">Historique</h1>
        <p className="mt-2 text-text-secondary">Retrouvez toutes vos conversations passées.</p>

        <div className="card mt-10 text-center">
          <p className="text-text-secondary">
            L'historique apparaîtra ici une fois Supabase configuré et vos premières conversations
            enregistrées.
          </p>
        </div>
      </div>
    </main>
  );
}
