import type { TaskList } from '../api/types'
import Button from './Button'

export interface SidebarTaskList extends TaskList {
  scope: 'personal' | 'team'
  teamName?: string
}

interface TaskListItemProps {
  item: SidebarTaskList
  isActive: boolean
  isBusy: boolean
  isDeleting: boolean
  onSelect: (id: string) => void
  onEdit: (item: SidebarTaskList) => void
  onToggleArchive: (item: SidebarTaskList) => void
  onDelete: (item: SidebarTaskList) => void
}

export default function TaskListItem({
  item,
  isActive,
  isBusy,
  isDeleting,
  onSelect,
  onEdit,
  onToggleArchive,
  onDelete
}: TaskListItemProps) {
  const containerClasses = [
    'rounded-lg border p-3 transition',
    isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900',
    item.archived ? 'opacity-70' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const textMutedClass = isActive ? 'text-slate-200' : 'text-slate-500'
  const badgeClass = isActive
    ? 'rounded bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100'
    : 'rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600'

  return (
    <li className={containerClasses}>
      <button
        className="w-full text-left"
        onClick={() => onSelect(item.id)}
        type="button"
      >
        <p className="text-sm font-semibold">{item.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.scope === 'team' && item.teamName ? <span className={badgeClass}>{item.teamName}</span> : null}
          {item.archived ? <span className={badgeClass}>Archived</span> : null}
        </div>
      </button>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button
          className="px-2 py-1 text-xs"
          disabled={isBusy}
          onClick={() => onEdit(item)}
          type="button"
          variant="secondary"
        >
          Edit
        </Button>
        <Button
          className="px-2 py-1 text-xs"
          disabled={isBusy}
          onClick={() => onToggleArchive(item)}
          type="button"
          variant="secondary"
        >
          {item.archived ? 'Unarchive' : 'Archive'}
        </Button>
        {isDeleting ? (
          <span className={`px-2 py-1 text-xs font-medium ${textMutedClass}`}>Deleting...</span>
        ) : (
          <Button
            className="px-2 py-1 text-xs"
            disabled={isBusy}
            onClick={() => onDelete(item)}
            type="button"
            variant="ghost"
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  )
}
