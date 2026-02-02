import { Link } from 'react-router-dom'
import type { TeamMembership } from '../api/types'
import Badge from './Badge'

interface TeamCardProps {
  membership: TeamMembership
}

export default function TeamCard({ membership }: TeamCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{membership.team.name}</h3>
          {membership.team.description ? (
            <p className="mt-1 text-sm text-slate-600">{membership.team.description}</p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No description provided.</p>
          )}
        </div>
        <Badge tone={membership.myRole === 'OWNER' ? 'blue' : 'slate'}>{membership.myRole}</Badge>
      </div>

      <div className="mt-4">
        <Link
          className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:border-slate-400"
          to={`/app/teams/${membership.team.id}`}
        >
          Open team
        </Link>
      </div>
    </article>
  )
}
