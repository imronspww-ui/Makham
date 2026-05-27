interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }

export function Spinner({ size = 'md', text }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <svg
        className={`animate-spin text-orange-500 ${sizeMap[size]}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  )
}
