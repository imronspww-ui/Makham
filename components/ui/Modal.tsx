'use client'
import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

const maxWidthClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={[
          'relative z-10 w-full bg-white rounded-2xl shadow-xl',
          maxWidthClass[maxWidth],
          'max-h-[90vh] overflow-y-auto',
        ].join(' ')}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
