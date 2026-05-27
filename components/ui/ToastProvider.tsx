'use client'
import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' },
        success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
      }}
    />
  )
}
