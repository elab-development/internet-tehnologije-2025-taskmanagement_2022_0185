import type { Task, TaskPriority, TaskStatus } from '../api/types'
import Badge from './Badge'
import Button from './Button'
import Select from './Select'

interface TaskCardProps {
  task: Task
  showDueSoon: boolean
  showOverdue: boolean
  isArchivedList: boolean
  isUpdating: boolean
  isDeleting: boolean
  onStatusChange: (task: Task, status: TaskStatus) => void
  onPriorityChange: (task: Task, priority: TaskPriority) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
}

const statusOptions = [
  { value: 'TODO', label: 'TODO' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'DONE', label: 'DONE' }
]

const priorityOptions = [
  { value: 'LOW', label: 'LOW' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'HIGH', label: 'HIGH' }
]

function formatDueDate(value: string | null) {
  if (!value) {
    return 'No due date'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Invalid due date'
  }

  return date.toLocaleString()
}

function formatCompletedAt(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function TaskCard({
  task,
  showDueSoon,
  showOverdue,
  isArchivedList,
  isUpdating,
  isDeleting,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onDelete
}: TaskCardProps) {
  const completedAtLabel = formatCompletedAt(task.completedAt)
  const descriptionPreview =
    task.description && task.description.length > 180
      ? `${task.description.slice(0, 180)}...`
      : task.description

  return (
    <article
      className={`rounded-xl border p-4 transition ${task.status === 'DONE' ? 'border-slate-200 bg-slate-50/70' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base font-semibold ${task.status === 'DONE' ? 'text-slate-500' : 'text-slate-900'}`}>
              {task.title}
            </h3>
            {task.status === 'DONE' ? <Badge tone="green">Done</Badge> : null}
            {showDueSoon ? <Badge tone="amber">Due soon</Badge> : null}
            {showOverdue ? <Badge tone="red">Overdue</Badge> : null}
          </div>

          {descriptionPreview ? (
            <p className={`mt-2 text-sm ${task.status === 'DONE' ? 'text-slate-500' : 'text-slate-600'}`}>
              {descriptionPreview}
            </p>
          ) : null}

          <p
            className={`mt-2 text-xs ${task.status === 'DONE' ? 'text-slate-500' : 'text-slate-500'}`}
            title={completedAtLabel ? `Completed at ${completedAtLabel}` : undefined}
          >
            Due: {formatDueDate(task.dueDate)}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <Select
            disabled={isArchivedList || isUpdating || isDeleting}
            id={`task-status-${task.id}`}
            label="Status"
            onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
            options={statusOptions}
            value={task.status}
          />

          <Select
            disabled={isArchivedList || isUpdating || isDeleting}
            id={`task-priority-${task.id}`}
            label="Priority"
            onChange={(event) => onPriorityChange(task, event.target.value as TaskPriority)}
            options={priorityOptions}
            value={task.priority}
          />

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              disabled={isArchivedList || isUpdating || isDeleting}
              onClick={() => onEdit(task)}
              type="button"
              variant="secondary"
            >
              Edit
            </Button>

            {isDeleting ? (
              <span className="inline-flex items-center px-2 py-2 text-xs font-medium text-slate-500">Deleting...</span>
            ) : (
              <Button
                disabled={isArchivedList || isUpdating}
                onClick={() => onDelete(task)}
                type="button"
                variant="ghost"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
