import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user, profile, refetchProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [error, setError] = useState('')

  async function saveName(e) {
    e.preventDefault()
    setSavingName(true)
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', user.id)
    await refetchProfile()
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function sendReset() {
    setResetting(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email)
    setResetting(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div className="animate-fade-in max-w-lg">
      <h1 className="font-display text-3xl font-semibold mb-8" style={{ color: 'var(--color-ink)' }}>Inställningar</h1>

      {/* Display name */}
      <div className="card mb-4">
        <h2 className="font-display text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>Ditt namn</h2>
        <form onSubmit={saveName} className="flex gap-3">
          <input
            type="text"
            className="input flex-1"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Förnamn Efternamn"
          />
          <button type="submit" className="btn-primary" disabled={savingName}>
            {nameSaved ? '✓ Sparat' : savingName ? '…' : 'Spara'}
          </button>
        </form>
      </div>

      {/* Email (read only) */}
      <div className="card mb-4">
        <h2 className="font-display text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>E-post</h2>
        <input type="email" className="input" value={user?.email || ''} readOnly style={{ color: 'var(--color-muted)', cursor: 'not-allowed' }} />
        <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>E-postadressen kan inte ändras. Kontakta oss om du behöver hjälp.</p>
      </div>

      {/* Password */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Lösenord</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>Vi skickar en länk till din e-post där du kan sätta ett nytt lösenord.</p>
        {resetSent ? (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#f0fdf4', color: '#166534' }}>
            ✓ Länk skickad till {user?.email}
          </div>
        ) : (
          <button onClick={sendReset} className="btn-primary" disabled={resetting}>
            {resetting ? 'Skickar…' : 'Skicka återställningslänk'}
          </button>
        )}
        {error && <p className="text-sm mt-2" style={{ color: 'var(--color-coral)' }}>{error}</p>}
      </div>
    </div>
  )
}
