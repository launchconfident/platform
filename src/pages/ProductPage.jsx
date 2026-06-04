import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

export default function ProductPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [audits, setAudits] = useState([])
  const [archived, setArchived] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [slug, user])

  async function fetchAll() {
    const { data: prod } = await supabase.from('products').select('*').eq('slug', slug).single()
    if (!prod) { navigate('/dashboard'); return }
    setProduct(prod)

    const { data: allAudits } = await supabase
      .from('audits')
      .select('*')
      .eq('product_id', prod.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (allAudits) {
      const active = []
      const arch = []
      for (const a of allAudits) {
        const score = await getAuditScore(a.id, prod.id)
        const entry = { ...a, score }
        if (a.status === 'active') active.push(entry)
        else arch.push(entry)
      }
      setAudits(active)
      setArchived(arch)
    }
    setLoading(false)
  }

  async function getAuditScore(auditId, productId) {
    const { data: items } = await supabase
      .from('checklist_items')
      .select('id, points, product_sections!inner(product_id)')
      .eq('product_sections.product_id', productId)
    const { data: progress } = await supabase
      .from('user_progress')
      .select('item_id, checked')
      .eq('audit_id', auditId)
      .eq('checked', true)
    if (!items) return { earned: 0, total: 0 }
    const checkedIds = new Set((progress || []).map(p => p.item_id))
    const total = items.reduce((s, i) => s + (i.points || 0), 0)
    const earned = items.filter(i => checkedIds.has(i.id)).reduce((s, i) => s + (i.points || 0), 0)
    return { earned, total }
  }

  async function createAudit() {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase.from('audits').insert({
      user_id: user.id,
      product_id: product.id,
      name: newName.trim(),
      status: 'active',
    }).select().single()
    setCreating(false)
    setShowModal(false)
    setNewName('')
    if (data) navigate(`/audits/${data.id}`)
  }

  if (loading) return <Spinner />

  return (
    <div className="animate-fade-in p-6 sm:p-8 max-w-4xl">
      <button onClick={() => navigate('/dashboard')} className="text-sm mb-6 flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
        ← Dashboard
      </button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{product?.name}</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary whitespace-nowrap">+ Ny audit</button>
      </div>

      {audits.length === 0 && archived.length === 0 ? (
        <EmptyAudits onNew={() => setShowModal(true)} />
      ) : (
        <>
          {audits.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {audits.map(a => <AuditCard key={a.id} audit={a} onClick={() => navigate(`/audits/${a.id}`)} />)}
            </div>
          )}

          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(v => !v)} className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: 'var(--color-muted)' }}>
                {showArchived ? '▾' : '▸'} Arkiverade ({archived.length})
              </button>
              {showArchived && (
                <div className="flex flex-col gap-3">
                  {archived.map(a => <AuditCard key={a.id} audit={a} onClick={() => navigate(`/audits/${a.id}`)} dimmed />)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Starta ny audit">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Namn på auditen</label>
            <input
              type="text"
              className="input"
              placeholder="t.ex. Min lansering v1"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && createAudit()}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowModal(false)} className="btn-ghost">Avbryt</button>
            <button onClick={createAudit} className="btn-primary" disabled={creating || !newName.trim()}>
              {creating ? 'Skapar…' : 'Starta audit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AuditCard({ audit, onClick, dimmed }) {
  const pct = audit.score.total > 0 ? Math.round((audit.score.earned / audit.score.total) * 100) : 0
  const date = new Date(audit.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div
      onClick={onClick}
      className={`card flex items-center gap-4 cursor-pointer hover:shadow-card-hover transition-all duration-200 ${dimmed ? 'opacity-60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base truncate" style={{ color: 'var(--color-ink)' }}>{audit.name}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Skapad {date}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${scoreClass(pct)}`}>
          {audit.score.earned}/{audit.score.total} p
        </span>
      </div>
      <span style={{ color: 'var(--color-muted)' }}>→</span>
    </div>
  )
}

function scoreClass(pct) {
  if (pct >= 70) return 'score-bg-high'
  if (pct >= 40) return 'score-bg-mid'
  return 'score-bg-low'
}

function EmptyAudits({ onNew }) {
  return (
    <div className="card text-center py-12">
      <div className="text-5xl mb-4">📋</div>
      <h2 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--color-ink)' }}>Inga audits ännu</h2>
      <p className="text-sm max-w-xs mx-auto mb-5" style={{ color: 'var(--color-muted)' }}>
        Starta din första audit och börja mäta hur redo du är för din lansering.
      </p>
      <button onClick={onNew} className="btn-primary">+ Starta din första audit</button>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 py-8" style={{ color: 'var(--color-muted)' }}>
      <div className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
      Laddar…
    </div>
  )
}
