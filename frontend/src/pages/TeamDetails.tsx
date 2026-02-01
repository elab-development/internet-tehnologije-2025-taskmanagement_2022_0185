import { Link, useParams } from 'react-router-dom'

export default function TeamDetails() {
  const { teamId } = useParams()

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Team</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Team {teamId ?? 'detail'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            F5 will add members list, roles, and team task lists.
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Team task lists placeholder.
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Members panel placeholder.
          </div>
        </div>
        <Link className="text-sm text-slate-500 hover:underline" to="/app/teams">
          Back to teams
        </Link>
      </div>
    </main>
  )
}
