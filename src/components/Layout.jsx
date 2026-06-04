import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const firstName = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'du'

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 flex flex-col border-r transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `} style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>

        {/* Logo */}
        <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}>Välkommen till</p>
          <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>
            Launch{' '}
            <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-primary)' }}>Confident</em>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
          <NavItem to="/dashboard" label="Dashboard" onClick={() => setMobileOpen(false)} />
          {profile?.is_admin && <NavItem to="/admin" label="Admin" onClick={() => setMobileOpen(false)} />}
          <NavItem to="/settings" label="Inställningar" onClick={() => setMobileOpen(false)} />
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
              style={{ background: 'var(--color-primary)' }}>
              {firstName[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>{firstName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{user?.email}</p>
            </div>
            <button onClick={handleSignOut} title="Logga ut"
              className="text-xs rounded px-1.5 py-1 transition-colors hover:bg-border"
              style={{ color: 'var(--color-muted)' }}>
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 rounded" style={{ color: 'var(--color-muted)' }}>☰</button>
          <span className="text-base font-semibold" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>
            Launch <em style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--color-primary)' }}>Confident</em>
          </span>
        </header>

        <main className="flex-1 animate-fade-in px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="flex items-center text-sm transition-all duration-150 relative"
      style={({ isActive }) => ({
        padding: '8px 12px',
        borderRadius: '6px',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        fontSize: '11px',
        color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
        borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
        background: isActive ? 'rgba(255,90,141,0.06)' : 'transparent',
      })}
    >
      {label}
    </NavLink>
  )
}
