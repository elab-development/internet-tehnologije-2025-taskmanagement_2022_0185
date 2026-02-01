import type { ReactNode } from 'react'

interface SidebarSectionProps {
  title: string
  children: ReactNode
  rightSlot?: ReactNode
}

export default function SidebarSection({ title, children, rightSlot }: SidebarSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
        {rightSlot}
      </header>
      {children}
    </section>
  )
}
