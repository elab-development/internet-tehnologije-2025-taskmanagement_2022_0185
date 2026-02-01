import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              App
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              F2 will add authenticated shell, navigation, and task list layout.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              to="/app/teams"
            >
              Teams
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              to="/app/profile"
            >
              Profile
            </Link>
          </div>
        </header>
        <section className="grid gap-4 lg:grid-cols-[280px,1fr]">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Sidebar placeholder for personal lists.
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Task view placeholder for selected list.
          </div>
        </section>
      </div>
    </main>
  )
}
