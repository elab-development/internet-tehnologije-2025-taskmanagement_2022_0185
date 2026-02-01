import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { firstValidationMessage, extractValidationDetails, mapApiCodeToMessage } from '../api/error-messages'
import { isApiError } from '../api/http'
import type { ValidationDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Button from '../components/Button'
import TextField from '../components/TextField'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ValidationDetails>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const clientValidationErrors: ValidationDetails = {}
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      clientValidationErrors.email = 'Email je obavezan.'
    }

    if (password.length < 8) {
      clientValidationErrors.password = 'Lozinka mora imati najmanje 8 karaktera.'
    }

    if (Object.keys(clientValidationErrors).length > 0) {
      setFieldErrors(clientValidationErrors)
      setFormError(firstValidationMessage(clientValidationErrors) ?? null)
      return
    }

    setFieldErrors({})
    setFormError(null)
    setIsSubmitting(true)

    try {
      await register({
        email: trimmedEmail,
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined
      })

      navigate('/login', {
        replace: true,
        state: { registered: true }
      })
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
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Kreirajte nalog za pristup vašim ličnim i timskim listama.
          </p>
        </div>

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
            autoComplete="new-password"
            error={fieldErrors.password}
            label="Password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          <TextField
            autoComplete="given-name"
            error={fieldErrors.firstName}
            label="First name (optional)"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            type="text"
            value={firstName}
          />

          <TextField
            autoComplete="family-name"
            error={fieldErrors.lastName}
            label="Last name (optional)"
            name="lastName"
            onChange={(event) => setLastName(event.target.value)}
            type="text"
            value={lastName}
          />

          <Button isLoading={isSubmitting} type="submit">
            Create account
          </Button>
        </form>

        <div className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link className="font-semibold text-slate-900 hover:underline" to="/login">
            Log in
          </Link>
        </div>

        <Link className="text-sm text-slate-500 hover:underline" to="/">
          Back to landing
        </Link>
      </div>
    </main>
  )
}
