import { Link } from 'react-router-dom'

export default function Login() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Auth</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Log in</h1>
          <p className="mt-2 text-sm text-slate-600">
            F2 will bring the full login form and validations.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Placeholder for login form.
        </div>
        <div className="text-sm text-slate-600">
          Need an account?{' '}
          <Link className="font-semibold text-slate-900 hover:underline" to="/register">
            Register
          </Link>
        </div>
        <Link className="text-sm text-slate-500 hover:underline" to="/">
          Back to landing
        </Link>
      </div>
    </main>
  )
}
