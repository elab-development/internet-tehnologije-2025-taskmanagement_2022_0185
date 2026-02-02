import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { firstValidationMessage, extractValidationDetails, mapApiCodeToMessage } from '../api/error-messages'
import { isApiError } from '../api/http'
import {
  createTaskList,
  deleteTaskList,
  getPersonalTaskLists,
  getTeamTaskLists,
  updateTaskList,
  type TaskListScope
} from '../api/task-lists'
import { getTeams } from '../api/teams'
import type { ValidationDetails } from '../api/types'
import Button from '../components/Button'
import Modal from '../components/Modal'
import SidebarSection from '../components/SidebarSection'
import Spinner from '../components/Spinner'
import TaskPanel from '../components/TaskPanel'
import TaskListItem, { type SidebarTaskList } from '../components/TaskListItem'
import TextField from '../components/TextField'

type FeedbackState = {
  kind: 'success' | 'error'
  message: string
}

function FeedbackAlert({ feedback }: { feedback: FeedbackState }) {
  const classes =
    feedback.kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return <div className={`rounded-md border px-3 py-2 text-sm ${classes}`}>{feedback.message}</div>
}

export default function Dashboard() {
  const [taskLists, setTaskLists] = useState<SidebarTaskList[]>([])
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [isLoadingLists, setIsLoadingLists] = useState(true)
  const [listsError, setListsError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)

  const [teamOptions, setTeamOptions] = useState<Array<{ id: string; name: string }>>([])

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createScope, setCreateScope] = useState<TaskListScope>('personal')
  const [createTeamId, setCreateTeamId] = useState('')
  const [createFieldErrors, setCreateFieldErrors] = useState<ValidationDetails>({})
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [isCreatingList, setIsCreatingList] = useState(false)

  const [editList, setEditList] = useState<SidebarTaskList | null>(null)
  const [editName, setEditName] = useState('')
  const [editFieldErrors, setEditFieldErrors] = useState<ValidationDetails>({})
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [deleteList, setDeleteList] = useState<SidebarTaskList | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingListId, setDeletingListId] = useState<string | null>(null)

  const [archiveUpdatingListId, setArchiveUpdatingListId] = useState<string | null>(null)

  const loadTaskLists = useCallback(async (preferredActiveListId?: string | null) => {
    setIsLoadingLists(true)
    setListsError(null)

    try {
      const [personalResult, teamsResult] = await Promise.all([getPersonalTaskLists(), getTeams()])
      const teamIdToName = new Map(teamsResult.items.map((item) => [item.team.id, item.team.name]))

      const teamListResults = await Promise.all(
        teamsResult.items.map(async (item) => {
          const response = await getTeamTaskLists(item.team.id)
          return {
            teamId: item.team.id,
            items: response.items
          }
        })
      )

      const personalLists: SidebarTaskList[] = personalResult.items.map((item) => ({
        ...item,
        scope: 'personal'
      }))

      const teamLists: SidebarTaskList[] = teamListResults.flatMap((entry) =>
        entry.items.map((item) => ({
          ...item,
          scope: 'team',
          teamName: teamIdToName.get(entry.teamId) ?? 'Team'
        }))
      )

      const mergedLists = [...personalLists, ...teamLists]

      setTeamOptions(teamsResult.items.map((item) => ({ id: item.team.id, name: item.team.name })))
      setTaskLists(mergedLists)
      setActiveListId((currentId) => {
        const candidateId = preferredActiveListId ?? currentId
        if (candidateId && mergedLists.some((item) => item.id === candidateId)) {
          return candidateId
        }

        return mergedLists[0]?.id ?? null
      })
    } catch {
      setListsError('Failed to load lists.')
    } finally {
      setIsLoadingLists(false)
    }
  }, [])

  useEffect(() => {
    void loadTaskLists()
  }, [loadTaskLists])

  const personalLists = useMemo(
    () => taskLists.filter((item) => item.scope === 'personal'),
    [taskLists]
  )
  const teamLists = useMemo(() => taskLists.filter((item) => item.scope === 'team'), [taskLists])
  const activeList = useMemo(
    () => taskLists.find((item) => item.id === activeListId) ?? null,
    [activeListId, taskLists]
  )

  const hasNoLists = taskLists.length === 0
  const canCreateTeamList = teamOptions.length > 0
  const isMutating = Boolean(isCreatingList || isSavingEdit || deletingListId || archiveUpdatingListId)

  const openCreateModal = () => {
    setCreateFieldErrors({})
    setCreateFormError(null)
    setCreateName('')
    setCreateScope('personal')
    setCreateTeamId(teamOptions[0]?.id ?? '')
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    if (isCreatingList) {
      return
    }

    setIsCreateModalOpen(false)
  }

  const openEditModal = (item: SidebarTaskList) => {
    setEditList(item)
    setEditName(item.name)
    setEditFieldErrors({})
    setEditFormError(null)
  }

  const closeEditModal = () => {
    if (isSavingEdit) {
      return
    }

    setEditList(null)
  }

  const openDeleteModal = (item: SidebarTaskList) => {
    setDeleteList(item)
    setDeleteError(null)
  }

  const closeDeleteModal = () => {
    if (deletingListId) {
      return
    }

    setDeleteList(null)
    setDeleteError(null)
  }

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors: ValidationDetails = {}
    const trimmedName = createName.trim()

    if (trimmedName.length < 2) {
      validationErrors.name = 'Name must be at least 2 characters.'
    }

    if (createScope === 'team' && !createTeamId) {
      validationErrors.teamId = 'Team is required for team scope.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setCreateFieldErrors(validationErrors)
      setCreateFormError(firstValidationMessage(validationErrors))
      return
    }

    setCreateFieldErrors({})
    setCreateFormError(null)
    setFeedback(null)
    setIsCreatingList(true)

    try {
      const response = await createTaskList({
        name: trimmedName,
        scope: createScope,
        teamId: createScope === 'team' ? createTeamId : undefined
      })

      setIsCreateModalOpen(false)
      await loadTaskLists(response.item.id)
      setFeedback({ kind: 'success', message: 'List created successfully.' })
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'VALIDATION_ERROR') {
          const validationDetails = extractValidationDetails(error)
          setCreateFieldErrors(validationDetails)
          const validationMessage = firstValidationMessage(validationDetails)
          setCreateFormError(validationMessage ?? mapApiCodeToMessage(error.code, error.message))
        } else {
          setCreateFormError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setCreateFormError('Failed to create list.')
      }
    } finally {
      setIsCreatingList(false)
    }
  }

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editList) {
      return
    }

    const validationErrors: ValidationDetails = {}
    const trimmedName = editName.trim()

    if (trimmedName.length < 2) {
      validationErrors.name = 'Name must be at least 2 characters.'
    }

    if (Object.keys(validationErrors).length > 0) {
      setEditFieldErrors(validationErrors)
      setEditFormError(firstValidationMessage(validationErrors))
      return
    }

    setEditFieldErrors({})
    setEditFormError(null)
    setFeedback(null)
    setIsSavingEdit(true)

    try {
      await updateTaskList(editList.id, { name: trimmedName })
      setEditList(null)
      await loadTaskLists(editList.id)
      setFeedback({ kind: 'success', message: 'List name updated.' })
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'VALIDATION_ERROR') {
          const validationDetails = extractValidationDetails(error)
          setEditFieldErrors(validationDetails)
          const validationMessage = firstValidationMessage(validationDetails)
          setEditFormError(validationMessage ?? mapApiCodeToMessage(error.code, error.message))
        } else {
          setEditFormError(mapApiCodeToMessage(error.code, error.message))
        }
      } else {
        setEditFormError('Failed to update list.')
      }
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleArchiveToggle = async (item: SidebarTaskList) => {
    setFeedback(null)
    setArchiveUpdatingListId(item.id)

    try {
      await updateTaskList(item.id, { archived: !item.archived })
      await loadTaskLists(item.id)
      setFeedback({
        kind: 'success',
        message: item.archived ? 'List unarchived.' : 'List archived.'
      })
    } catch (error) {
      if (isApiError(error)) {
        setFeedback({ kind: 'error', message: mapApiCodeToMessage(error.code, error.message) })
      } else {
        setFeedback({ kind: 'error', message: 'Failed to update archive state.' })
      }
    } finally {
      setArchiveUpdatingListId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteList) {
      return
    }

    setDeleteError(null)
    setFeedback(null)
    setDeletingListId(deleteList.id)

    try {
      await deleteTaskList(deleteList.id)
      setDeleteList(null)
      await loadTaskLists()
      setFeedback({ kind: 'success', message: 'List deleted.' })
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'LIST_NOT_EMPTY') {
          setDeleteError('List contains tasks and cannot be deleted.')
        } else {
          const message = mapApiCodeToMessage(error.code, error.message)
          setDeleteError(message)
          setFeedback({ kind: 'error', message })
        }
      } else {
        setDeleteError('Failed to delete list.')
      }
    } finally {
      setDeletingListId(null)
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[320px,1fr]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Task lists</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Dashboard</h1>
          </div>
          <Button disabled={isLoadingLists || isMutating} onClick={openCreateModal} type="button">
            + New list
          </Button>
        </div>

        {feedback ? <div className="mt-4"><FeedbackAlert feedback={feedback} /></div> : null}

        {listsError ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {listsError}
          </div>
        ) : null}

        {isLoadingLists && hasNoLists ? (
          <div className="mt-6 flex justify-center">
            <Spinner label="Loading lists..." />
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-5">
            <SidebarSection title="Personal lists">
              {personalLists.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                  No personal lists yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {personalLists.map((item) => {
                    const isDeleting = deletingListId === item.id
                    const isBusy = isLoadingLists || isMutating || isDeleting

                    return (
                      <TaskListItem
                        isActive={activeListId === item.id}
                        isBusy={isBusy}
                        isDeleting={isDeleting}
                        item={item}
                        key={item.id}
                        onDelete={openDeleteModal}
                        onEdit={openEditModal}
                        onSelect={setActiveListId}
                        onToggleArchive={handleArchiveToggle}
                      />
                    )
                  })}
                </ul>
              )}
            </SidebarSection>

            <SidebarSection title="Team lists">
              {teamLists.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">
                  No team lists yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {teamLists.map((item) => {
                    const isDeleting = deletingListId === item.id
                    const isBusy = isLoadingLists || isMutating || isDeleting

                    return (
                      <TaskListItem
                        isActive={activeListId === item.id}
                        isBusy={isBusy}
                        isDeleting={isDeleting}
                        item={item}
                        key={item.id}
                        onDelete={openDeleteModal}
                        onEdit={openEditModal}
                        onSelect={setActiveListId}
                        onToggleArchive={handleArchiveToggle}
                      />
                    )
                  })}
                </ul>
              )}
            </SidebarSection>
          </div>
        )}
      </aside>

      <TaskPanel activeList={activeList} hasNoLists={hasNoLists} isLoadingLists={isLoadingLists} />

      <Modal
        closeDisabled={isCreatingList}
        description="Choose scope and create a new list."
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="New list"
        footer={
          <>
            <Button disabled={isCreatingList} onClick={closeCreateModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              form="create-list-form"
              isLoading={isCreatingList}
              type="submit"
              disabled={createScope === 'team' && !canCreateTeamList}
            >
              Create list
            </Button>
          </>
        }
      >
        <form className="space-y-4" id="create-list-form" onSubmit={handleCreateSubmit}>
          {createFormError ? <FeedbackAlert feedback={{ kind: 'error', message: createFormError }} /> : null}

          <TextField
            error={createFieldErrors.name}
            label="Name"
            name="name"
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Sprint backlog"
            required
            value={createName}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="scope-select">
              Scope
            </label>
            <select
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              id="scope-select"
              onChange={(event) => {
                const value = event.target.value as TaskListScope
                setCreateScope(value)
                if (value === 'team' && !createTeamId && teamOptions.length > 0) {
                  setCreateTeamId(teamOptions[0].id)
                }
              }}
              value={createScope}
            >
              <option value="personal">personal</option>
              <option value="team">team</option>
            </select>
            {createFieldErrors.scope ? <p className="text-sm text-red-600">{createFieldErrors.scope}</p> : null}
          </div>

          {createScope === 'team' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="team-select">
                Team
              </label>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                id="team-select"
                onChange={(event) => setCreateTeamId(event.target.value)}
                value={createTeamId}
              >
                {teamOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {createFieldErrors.teamId ? <p className="text-sm text-red-600">{createFieldErrors.teamId}</p> : null}
              {!canCreateTeamList ? (
                <p className="text-sm text-slate-500">You are not a member of any team yet.</p>
              ) : null}
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        closeDisabled={isSavingEdit}
        description="Rename the selected list."
        isOpen={Boolean(editList)}
        onClose={closeEditModal}
        title="Edit list"
        footer={
          <>
            <Button disabled={isSavingEdit} onClick={closeEditModal} type="button" variant="secondary">
              Cancel
            </Button>
            <Button form="edit-list-form" isLoading={isSavingEdit} type="submit">
              Save changes
            </Button>
          </>
        }
      >
        <form className="space-y-4" id="edit-list-form" onSubmit={handleEditSubmit}>
          {editFormError ? <FeedbackAlert feedback={{ kind: 'error', message: editFormError }} /> : null}

          <TextField
            error={editFieldErrors.name}
            label="Name"
            name="editName"
            onChange={(event) => setEditName(event.target.value)}
            required
            value={editName}
          />
        </form>
      </Modal>

      <Modal
        closeDisabled={Boolean(deletingListId)}
        description={
          deleteList
            ? `Delete list \"${deleteList.name}\"? This action cannot be undone.`
            : 'Delete selected list?'
        }
        isOpen={Boolean(deleteList)}
        onClose={closeDeleteModal}
        title="Confirm delete"
        footer={
          <>
            <Button
              disabled={Boolean(deletingListId)}
              onClick={closeDeleteModal}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button isLoading={Boolean(deletingListId)} onClick={handleDeleteConfirm} type="button">
              Delete list
            </Button>
          </>
        }
      >
        {deleteError ? <FeedbackAlert feedback={{ kind: 'error', message: deleteError }} /> : null}
      </Modal>
    </section>
  )
}
