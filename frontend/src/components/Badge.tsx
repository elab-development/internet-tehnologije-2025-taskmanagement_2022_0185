import type { ReactNode } from 'react'

type BadgeTone = 'slate' | 'blue' | 'amber' | 'red' | 'green'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

export default function Badge({ children, tone = 'slate' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
