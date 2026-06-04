import React, { useEffect } from 'react'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md card animate-fade-in" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'var(--color-muted)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
