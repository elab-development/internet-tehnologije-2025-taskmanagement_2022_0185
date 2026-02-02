import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { firstValidationMessage, extractValidationDetails, mapApiCodeToMessage } from '../api/error-messages'
import { isApiError } from '../api/http'
import {
  addTeamMember,
  getTeamDetails,
  leaveTeam,
  removeTeamMember,
  updateTeamMember
} from '../api/teams'
import type { Team, TeamMember, TeamMemberRole, ValidationDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Badge from '../components/Badge'
import Button from '../components/Button'
import MemberRow from '../components/MemberRow'
import Modal from '../components/Modal'
import Spinner from '../components/Spinner'
import TextField from '../components/TextField'

type FeedbackState = {
  kind: 'success' | 'error'
  message: string
}

export default function TeamDetails() {
  const navigate = useNavigate()
  const { teamId } = useParams()
  const { user } = useAuth()

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(true)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [addFieldErrors, setAddFieldErrors] = useState<ValidationDetails>({})
  const [addFormError, setAddFormError] = useState<string | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const [updatingMemberIds, setUpdatingMemberIds] = useState<Record<string, true>>({})
  const [removeMemberCandidate, setRemoveMemberCandidate] = useState<TeamMember | null>(null)
  const [removeMemberError, setRemoveMemberError] = useState<string | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [isLeavingTeam, setIsLeavingTeam] = useState(false)

  const loadTeam = useCallback(async () => {
    if (!teamId) {
      setTeamError('Team not found.')
      setIsLoadingTeam(false)
      return
    }

    setIsLoadingTeam(true)
    setTeamError(null)

    try {
      const response = await getTeamDetails(teamId)
      setTeam(response.team)
      setMembers(response.members)
    } catch (error) {
      setTeam(null)
      setMembers([])

      if (isApiError(error)) {
        if (error.code === 'FORBIDDEN') {
          setTeamError('You are not a member of this team.')
        } else {
          setTeamError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setTeamError('Failed to load team.')
      }
    } finally {
      setIsLoadingTeam(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadTeam()
  }, [loadTeam])

  const myMembership = useMemo(
    () => members.find((member) => member.user.id === user?.id) ?? null,
    [members, user?.id]
  )
  const myRole = myMembership?.role ?? null
  const isOwner = myRole === 'OWNER'

  const setMemberUpdating = (memberId: string, updating: boolean) => {
    setUpdatingMemberIds((current) => {
      if (updating) {
        return { ...current, [memberId]: true }
      }

      const next = { ...current }
      delete next[memberId]
      return next
    })
  }

  const closeAddMemberModal = () => {
    if (isAddingMember) {
      return
    }

    setIsAddMemberModalOpen(false)
  }

  const closeRemoveMemberModal = () => {
    if (isRemovingMember) {
      return
    }

    setRemoveMemberCandidate(null)
    setRemoveMemberError(null)
  }

  const closeLeaveModal = () => {
    if (isLeavingTeam) {
      return
    }

    setIsLeaveModalOpen(false)
    setLeaveError(null)
  }

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!teamId) {
      return
    }

    const validationErrors: ValidationDetails = {}
    const trimmedEmail = memberEmail.trim()

    if (!trimmedEmail) {
      validationErrors.email = 'Email is required.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setAddFieldErrors(validationErrors)
      setAddFormError(firstValidationMessage(validationErrors))
      return
    }

    setAddFieldErrors({})
    setAddFormError(null)
    setFeedback(null)
    setIsAddingMember(true)

    try {
      await addTeamMember(teamId, { email: trimmedEmail })
      setIsAddMemberModalOpen(false)
      await loadTeam()
      setFeedback({ kind: 'success', message: 'Member added.' })
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'VALIDATION_ERROR') {
          const validationDetails = extractValidationDetails(error)
          setAddFieldErrors(validationDetails)
          const validationMessage = firstValidationMessage(validationDetails)
          setAddFormError(validationMessage ?? mapApiCodeToMessage(error.code, error.message))
        } else {
          setAddFormError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setAddFormError('Failed to add member.')
      }
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRoleChange = async (member: TeamMember, nextRole: TeamMemberRole) => {
    if (!teamId || member.role === nextRole) {
      return
    }

    setFeedback(null)
    setMemberUpdating(member.id, true)

    try {
      await updateTeamMember(teamId, member.id, { role: nextRole })
      await loadTeam()
      setFeedback({ kind: 'success', message: 'Member role updated.' })
    } catch (error) {
      if (isApiError(error)) {
        setFeedback({ kind: 'error', message: mapApiCodeToMessage(error.code, error.message) })
      } else {
        setFeedback({ kind: 'error', message: 'Failed to update member role.' })
      }
    } finally {
      setMemberUpdating(member.id, false)
    }
  }

  const handleRemoveMember = async () => {
    if (!teamId || !removeMemberCandidate) {
      return
    }

    setRemoveMemberError(null)
    setFeedback(null)
    setIsRemovingMember(true)

    try {
      await removeTeamMember(teamId, removeMemberCandidate.id)
      setRemoveMemberCandidate(null)
      await loadTeam()
      setFeedback({ kind: 'success', message: 'Member removed.' })
    } catch (error) {
      if (isApiError(error)) {
        setRemoveMemberError(mapApiCodeToMessage(error.code, error.message))
      } else {
        setRemoveMemberError('Failed to remove member.')
      }
    } finally {
      setIsRemovingMember(false)
    }
  }

  const handleLeaveTeam = async () => {
    if (!teamId) {
      return
    }

    setLeaveError(null)
    setFeedback(null)
    setIsLeavingTeam(true)

    try {
      await leaveTeam(teamId)
      navigate('/app/teams', { replace: true })
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'OWNER_MUST_TRANSFER') {
          setLeaveError('You must transfer ownership before leaving the team.')
        } else {
          setLeaveError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setLeaveError('Failed to leave team.')
      }
    } finally {
      setIsLeavingTeam(false)
    }
  }

  if (isLoadingTeam) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-16 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-16 animate-pulse rounded bg-slate-100" />
          <div className="mt-4">
            <Spinner label="Loading members..." />
          </div>
        </div>
      </section>
    )
  }

  if (teamError || !team) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {teamError ?? 'Team not found.'}
        </div>
        <Link className="text-sm text-slate-600 hover:underline" to="/app/teams">
          Back to teams
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Team</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">{team.name}</h1>
          <Badge tone={isOwner ? 'blue' : 'slate'}>You are {isOwner ? 'OWNER' : 'MEMBER'}</Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">{team.description ?? 'No description provided.'}</p>
      </header>

      {feedback ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Members</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isOwner ? 'You can add members and manage roles.' : 'Only owners can manage members.'}
            </p>
          </div>
          {isOwner ? (
            <Button
              onClick={() => {
                setMemberEmail('')
                setAddFieldErrors({})
                setAddFormError(null)
                setIsAddMemberModalOpen(true)
              }}
              type="button"
            >
              + Add member
            </Button>
          ) : null}
        </div>

        <ul className="mt-5 space-y-3">
          {members.map((member) => (
            <MemberRow
              isCurrentUser={member.user.id === user?.id}
              isOwnerView={isOwner}
              isRemoving={isRemovingMember && removeMemberCandidate?.id === member.id}
              isUpdatingRole={Boolean(updatingMemberIds[member.id])}
              key={member.id}
              member={member}
              onRemove={(candidate) => {
                setRemoveMemberCandidate(candidate)
                setRemoveMemberError(null)
              }}
              onRoleChange={handleRoleChange}
            />
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm text-slate-600 hover:underline" to="/app/teams">
          Back to teams
        </Link>

        <Button
          disabled={isLeavingTeam}
          onClick={() => {
            setLeaveError(null)
            setIsLeaveModalOpen(true)
          }}
          type="button"
          variant="secondary"
        >
          Leave team
        </Button>
      </div>

      <Modal
        closeDisabled={isAddingMember}
        description="Invite a user by email."
        footer={
          <>
            <Button disabled={isAddingMember} onClick={closeAddMemberModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button form="add-member-form" isLoading={isAddingMember} type="submit">
              Add member
            </Button>
          </>
        }
        isOpen={isAddMemberModalOpen}
        onClose={closeAddMemberModal}
        title="Add member"
      >
        <form className="space-y-4" id="add-member-form" onSubmit={handleAddMember}>
          {addFormError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{addFormError}</div>
          ) : null}

          <TextField
            error={addFieldErrors.email}
            label="Email"
            onChange={(event) => setMemberEmail(event.target.value)}
            required
            type="email"
            value={memberEmail}
          />
        </form>
      </Modal>

      <Modal
        closeDisabled={isRemovingMember}
        description={
          removeMemberCandidate
            ? `Remove ${removeMemberCandidate.user.email} from this team?`
            : 'Remove selected member?'
        }
        footer={
          <>
            <Button disabled={isRemovingMember} onClick={closeRemoveMemberModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button isLoading={isRemovingMember} onClick={handleRemoveMember} type="button">
              Remove member
            </Button>
          </>
        }
        isOpen={Boolean(removeMemberCandidate)}
        onClose={closeRemoveMemberModal}
        title="Confirm remove member"
      >
        {removeMemberError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{removeMemberError}</div>
        ) : null}
      </Modal>

      <Modal
        closeDisabled={isLeavingTeam}
        description="Are you sure you want to leave this team?"
        footer={
          <>
            <Button disabled={isLeavingTeam} onClick={closeLeaveModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button isLoading={isLeavingTeam} onClick={handleLeaveTeam} type="button">
              Leave team
            </Button>
          </>
        }
        isOpen={isLeaveModalOpen}
        onClose={closeLeaveModal}
        title="Leave team"
      >
        {leaveError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{leaveError}</div>
        ) : null}
      </Modal>
    </section>
  )
}

