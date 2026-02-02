import type { TeamMember, TeamMemberRole } from '../api/types'
import Badge from './Badge'
import Button from './Button'
import Select from './Select'

interface MemberRowProps {
  member: TeamMember
  isOwnerView: boolean
  isCurrentUser: boolean
  isUpdatingRole: boolean
  isRemoving: boolean
  onRoleChange: (member: TeamMember, nextRole: TeamMemberRole) => void
  onRemove: (member: TeamMember) => void
}

function getMemberDisplayName(member: TeamMember) {
  const fullName = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ')
  return fullName || member.user.email
}

export default function MemberRow({
  member,
  isOwnerView,
  isCurrentUser,
  isUpdatingRole,
  isRemoving,
  onRoleChange,
  onRemove
}: MemberRowProps) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{getMemberDisplayName(member)}</p>
          <p className="text-xs text-slate-500">{member.user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={member.role === 'OWNER' ? 'blue' : 'slate'}>{member.role}</Badge>
          {isCurrentUser ? <Badge tone="green">You</Badge> : null}
        </div>
      </div>

      {isOwnerView ? (
        <div className="mt-3 flex flex-wrap items-end justify-end gap-2">
          <div className="w-full max-w-[180px]">
            <Select
              disabled={isUpdatingRole || isRemoving}
              id={`member-role-${member.id}`}
              label="Role"
              onChange={(event) => onRoleChange(member, event.target.value as TeamMemberRole)}
              options={[
                { value: 'MEMBER', label: 'MEMBER' },
                { value: 'OWNER', label: 'OWNER' }
              ]}
              value={member.role}
            />
          </div>

          {!isCurrentUser ? (
            isRemoving ? (
              <span className="px-2 py-2 text-xs font-medium text-slate-500">Removing...</span>
            ) : (
              <Button
                disabled={isUpdatingRole}
                onClick={() => onRemove(member)}
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
