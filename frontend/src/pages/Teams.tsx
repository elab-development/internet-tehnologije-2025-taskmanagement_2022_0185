import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { firstValidationMessage, extractValidationDetails, mapApiCodeToMessage } from '../api/error-messages'
import { isApiError } from '../api/http'
import { createTeam, getTeams } from '../api/teams'
import type { TeamMembership, ValidationDetails } from '../api/types'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import TeamCard from '../components/TeamCard'
import TextField from '../components/TextField'

export default function Teams() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<TeamMembership[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [description, setDescription] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ValidationDetails>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)

  const loadTeams = useCallback(async () => {
    setIsLoadingTeams(true)
    setTeamsError(null)

    try {
      const response = await getTeams()
      setTeams(response.items)
    } catch {
      setTeamsError('Failed to load teams.')
    } finally {
      setIsLoadingTeams(false)
    }
  }, [])

  useEffect(() => {
    void loadTeams()
  }, [loadTeams])

  const closeCreateModal = () => {
    if (isCreatingTeam) {
      return
    }

    setIsCreateModalOpen(false)
  }

  const handleCreateTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors: ValidationDetails = {}
    const trimmedName = teamName.trim()

    if (trimmedName.length < 2) {
      validationErrors.name = 'Name must be at least 2 characters.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setFormError(firstValidationMessage(validationErrors))
      return
    }

    setFieldErrors({})
    setFormError(null)
    setIsCreatingTeam(true)

    try {
      const response = await createTeam({
        name: trimmedName,
        description: description.trim() || undefined
      })

      setIsCreateModalOpen(false)
      navigate(`/app/teams/${response.team.id}`)
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'VALIDATION_ERROR') {
          const validationDetails = extractValidationDetails(error)
          setFieldErrors(validationDetails)
          const validationMessage = firstValidationMessage(validationDetails)
          setFormError(validationMessage ?? mapApiCodeToMessage(error.code, error.message))
        } else {
          setFormError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setFormError('Failed to create team.')
      }
    } finally {
      setIsCreatingTeam(false)
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Teams</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Team spaces</h1>
            <p className="mt-2 text-sm text-slate-600">Manage teams and navigate to member controls.</p>
          </div>
          <Button
            disabled={isCreatingTeam}
            onClick={() => {
              setTeamName('')
              setDescription('')
              setFieldErrors({})
              setFormError(null)
              setIsCreateModalOpen(true)
            }}
            type="button"
          >
            + New team
          </Button>
        </div>
      </header>

      {teamsError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{teamsError}</div>
      ) : null}

      {isLoadingTeams ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-20 animate-pulse rounded bg-slate-100" />
          <div className="h-20 animate-pulse rounded bg-slate-100" />
          <div className="pt-2">
            <Spinner label="Loading teams..." />
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          You are not a member of any team yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((membership) => (
            <TeamCard key={membership.team.id} membership={membership} />
          ))}
        </div>
      )}

      <Modal
        closeDisabled={isCreatingTeam}
        description="Create a new team and become its owner."
        footer={
          <>
            <Button disabled={isCreatingTeam} onClick={closeCreateModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button form="create-team-form" isLoading={isCreatingTeam} type="submit">
              Create team
            </Button>
          </>
        }
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create team"
      >
        <form className="space-y-4" id="create-team-form" onSubmit={handleCreateTeam}>
          {formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
          ) : null}

          <TextField
            error={fieldErrors.name}
            label="Name"
            onChange={(event) => setTeamName(event.target.value)}
            required
            value={teamName}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="team-description">
              Description (optional)
            </label>
            <textarea
              className="min-h-24 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300"
              id="team-description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
            {fieldErrors.description ? <p className="text-sm text-red-600">{fieldErrors.description}</p> : null}
          </div>
        </form>
      </Modal>
    </section>
  )
}

