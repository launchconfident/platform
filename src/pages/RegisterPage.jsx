import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()

  const [tokenData, setTokenData] = useState(null)
  const [tokenError, setTokenError] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setTokenError('Ingen registreringslänk hittades.'); setLoading(false); return }
    validateToken()
  }, [token])

  async function validateToken() {
    const { data, error } = await supabase.from('registration_tokens')
      .select('*, products(name)').eq('token', token).single()
    if (error || !data) { setTokenError('Ogiltig länk.'); setLoading(false); return }
    if (data.used) { setTokenError('Den här länken har redan använts.'); setLoading(false); return }
    if (new Date(data.expires_at) < new Date()) { setTokenError('Länken har gått ut. Kontakta oss för en ny.'); setLoading(false); return }
    setTokenData(data)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Lösenorden matchar inte.'); return }
    if (password.length < 6) { setError('Lösenordet måste vara minst 6 tecken.'); return }
    setSubmitting(true)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: tokenData.email, password,
      options: { data: { display_name: displayName } },
    })
    if (signUpError) { setError(signUpError.message); setSubmitting(false); return }
    const userId = authData.user.id
    await supabase.from('profiles').upsert({ id: userId, display_name: displayName, is_admin: false })
    await supabase.from('user_products').insert({ user_id: userId, product_id: tokenData.product_id })
    await supabase.from('registration_tokens').update({ used: true }).eq('token', token)
    navigate('/dashboard')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-border animate-spin" style={{ borderTopColor: 'var(--color-primary)' }} />
    </div>
  )

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="card max-w-sm w-full text-center" style={{ padding: '40px' }}>
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>Något gick fel</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>{tokenError}</p>
        <a href="mailto:emma@launchconfident.se" className="btn-primary">Kontakta oss</a>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}>
            Launch Confident
          </p>
          <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
            Skapa ditt <em>konto.</em>
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
            Få tillgång till <strong>{tokenData?.products?.name}</strong>
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">E-post</label>
              <input type="email" className="input" value={tokenData?.email || ''} readOnly
                style={{ color: 'var(--color-muted)', cursor: 'not-allowed' }} />
            </div>
            <div>
              <label className="label">Ditt namn</label>
              <input type="text" className="input" placeholder="Förnamn Efternamn"
                value={displayName} onChange={e => setDisplayName(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="label">Välj lösenord</label>
              <input type="password" className="input" placeholder="Minst 6 tecken"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label">Bekräfta lösenord</label>
              <input type="password" className="input" placeholder="Upprepa lösenordet"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fff1f0', color: 'var(--color-coral)', fontFamily: 'var(--font-body)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting} style={{ padding: '12px' }}>
              {submitting ? 'Skapar konto…' : 'Skapa konto och logga in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
