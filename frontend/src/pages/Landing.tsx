import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-12">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Task Management
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
            Organize work and personal tasks with clarity.
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Plan lists, track deadlines, and keep teams aligned in a clean, focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            to="/login"
          >
            Log in
          </Link>
          <Link
            className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            to="/register"
          >
            Create account
          </Link>
        </div>
        <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            Personal lists, team lists, and shared context in one place.
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            Due soon badges keep priorities visible for the next 24 hours.
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            Fast filters for status, priority, and deadlines.
          </div>
        </div>
      </div>
    </main>
  )
}

