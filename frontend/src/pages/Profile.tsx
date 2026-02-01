import { Link } from 'react-router-dom'

export default function Profile() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">My profile</h1>
          <p className="mt-2 text-sm text-slate-600">
            F2 will hydrate this page with data from /api/auth/me.
          </p>
        </header>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Placeholder for profile details and logout action.
        </div>
        <Link className="text-sm text-slate-500 hover:underline" to="/app">
          Back to dashboard
        </Link>
      </div>
    </main>
  )
}
