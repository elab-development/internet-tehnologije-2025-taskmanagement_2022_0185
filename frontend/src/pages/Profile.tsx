import { useAuth } from '../auth/AuthContext'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export default function Profile() {
  const { user } = useAuth()

  return (
    <section className="flex flex-col gap-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Profile</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">My profile</h1>
        <p className="mt-2 text-sm text-slate-600">
          Podaci dolaze iz <code>/api/auth/me</code> preko AuthContext-a.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">First name</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user?.firstName ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Last name</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user?.lastName ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">{user?.email ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Joined</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900">
              {user?.createdAt ? formatDate(user.createdAt) : '-'}
            </dd>
          </div>
        </dl>
      </section>
    </section>
  )
}

