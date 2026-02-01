import { Link } from 'react-router-dom'

export default function Teams() {
  return (
    <section className="flex flex-col gap-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Teams</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Team spaces</h1>
        <p className="mt-2 text-sm text-slate-600">
          F5 uvodi timove, clanove i role-aware kontrole.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Placeholder for teams overview.
      </div>

      <Link className="text-sm text-slate-500 hover:underline" to="/app">
        Back to dashboard
      </Link>
    </section>
  )
}

