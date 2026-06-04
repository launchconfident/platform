import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Fel e-post eller lösenord. Försök igen.'); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}>
            Launch Confident
          </p>
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
            Välkommen <em>tillbaka.</em>
          </h1>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">E-post</label>
              <input type="email" className="input" placeholder="du@exempel.se"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Lösenord</label>
              <input type="password" className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fff1f0', color: 'var(--color-coral)', fontFamily: 'var(--font-body)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full mt-1" disabled={loading} style={{ padding: '12px' }}>
              {loading ? 'Loggar in…' : 'Logga in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-5" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
          Fick du ingen länk?{' '}
          <a href="mailto:emma@launchconfident.se" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
            Kontakta oss
          </a>
        </p>
      </div>
    </div>
  )
}
