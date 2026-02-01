import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { firstValidationMessage, extractValidationDetails, mapApiCodeToMessage } from '../api/error-messages'
import { isApiError } from '../api/http'
import type { ValidationDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/Button'
import TextField from '../components/TextField'

type LoginLocationState = {
  from?: string
  registered?: boolean
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ValidationDetails>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const state = (location.state as LoginLocationState | null) ?? null

  const redirectPath = useMemo(() => {
    if (state?.from && state.from.startsWith('/app')) {
      return state.from
    }

    return '/app'
  }, [state?.from])

  const showRegisterSuccess = Boolean(state?.registered)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate(redirectPath, { replace: true })
    } catch (error) {
      if (isApiError(error)) {
        const validationDetails = extractValidationDetails(error)
        setFieldErrors(validationDetails)

        if (error.code === 'VALIDATION_ERROR') {
          const firstValidationError = firstValidationMessage(validationDetails)
          setFormError(firstValidationError ?? mapApiCodeToMessage(error.code, error.message))
        } else {
          setFormError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setFormError('Došlo je do neočekivane greške. Pokušajte ponovo.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Auth</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Log in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Prijavite se da biste pristupili task dashboard-u.
          </p>
        </div>

        {showRegisterSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Uspešna registracija. Sada se prijavite.
          </div>
        ) : null}

        {formError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <TextField
            autoComplete="email"
            error={fieldErrors.email}
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <TextField
            autoComplete="current-password"
            error={fieldErrors.password}
            label="Password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <Button isLoading={isSubmitting} type="submit">
            Log in
          </Button>
        </form>

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
