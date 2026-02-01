import type { ButtonHTMLAttributes, ReactNode } from 'react'
import Spinner from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  children: ReactNode
}

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:border-slate-400',
  ghost: 'text-slate-700 hover:bg-slate-100'
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const buttonClassName = [BASE_CLASSES, VARIANT_CLASSES[variant], className].filter(Boolean).join(' ')

  return (
    <button className={buttonClassName} disabled={disabled || isLoading} {...props}>
      {isLoading ? <Spinner className="h-4 w-4 border-2" label="" /> : null}
      {children}
    </button>
  )
}

