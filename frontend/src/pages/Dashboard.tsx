import { useAuth } from '../auth/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <section className="flex flex-col gap-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">App</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Dobrodošli, {user?.firstName ?? user?.email}. F3 dodaje task list CRUD i prazna stanja.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Sidebar placeholder for personal lists.
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Task view placeholder for selected list.
        </div>
      </section>
    </section>
  )
}

