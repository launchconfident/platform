import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { exportAuditPDF } from '../lib/pdfExport'

export default function AuditPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [audit, setAudit] = useState(null)
  const [product, setProduct] = useState(null)
  const [sections, setSections] = useState([])
  const [progress, setProgress] = useState({})   // itemId -> { checked, note }
  const [totalPoints, setTotalPoints] = useState(0)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [activeSection, setActiveSection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)
  const saveQueue = useRef({})
  const saveTimer = useRef(null)

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    const { data: auditData } = await supabase
      .from('audits').select('*, products(*)').eq('id', id).single()
    if (!auditData || auditData.user_id !== user.id) { navigate('/dashboard'); return }
    setAudit(auditData)
    setProduct(auditData.products)
    setNameValue(auditData.name)

    const { data: sectionsData } = await supabase
      .from('product_sections')
      .select(`*, content_blocks(id, type, title, order, embed_url, body, file_url, file_name,
        checklist_items(id, label, description, points, priority, order))`)
      .eq('product_id', auditData.product_id)
      .order('order')

    if (sectionsData) {
      const sorted = sectionsData.map(s => ({
        ...s,
        content_blocks: [...(s.content_blocks || [])].sort((a, b) => a.order - b.order).map(b => ({
          ...b,
          checklist_items: [...(b.checklist_items || [])].sort((a, b) => a.order - b.order)
        }))
      }))
      setSections(sorted)
      if (sorted.length > 0) setActiveSection(sorted[0].id)
      let total = 0
      for (const s of sorted)
        for (const b of s.content_blocks)
          if (b.type === 'checklist')
            for (const i of b.checklist_items) total += (i.points || 0)
      setTotalPoints(total)
    }

    const { data: progressData } = await supabase
      .from('user_progress').select('item_id, checked, note').eq('audit_id', id)
    if (progressData) {
      const map = {}
      let earned = 0
      for (const p of progressData) map[p.item_id] = { checked: p.checked, note: p.note || '' }
      if (sectionsData)
        for (const s of sectionsData)
          for (const b of s.content_blocks || [])
            if (b.type === 'checklist')
              for (const i of b.checklist_items || [])
                if (map[i.id]?.checked) earned += (i.points || 0)
      setProgress(map)
      setEarnedPoints(earned)
    }
    setLoading(false)
  }

  function toggleItem(item) {
    const cur = progress[item.id] || { checked: false, note: '' }
    const newChecked = !cur.checked
    const delta = newChecked ? (item.points || 0) : -(item.points || 0)
    setProgress(prev => ({ ...prev, [item.id]: { ...cur, checked: newChecked } }))
    setEarnedPoints(prev => prev + delta)
    queueSave(item.id, { checked: newChecked, note: cur.note })
  }

  function updateNote(itemId, note) {
    const cur = progress[itemId] || { checked: false, note: '' }
    setProgress(prev => ({ ...prev, [itemId]: { ...cur, note } }))
    queueSave(itemId, { checked: cur.checked, note })
  }

  function queueSave(itemId, data) {
    saveQueue.current[itemId] = data
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flushSave, 600)
  }

  async function flushSave() {
    const entries = Object.entries(saveQueue.current)
    saveQueue.current = {}
    await Promise.all(entries.map(([itemId, data]) =>
      supabase.from('user_progress').upsert(
        { audit_id: id, item_id: itemId, checked: data.checked, note: data.note, updated_at: new Date().toISOString() },
        { onConflict: 'audit_id,item_id' }
      )
    ))
    await supabase.from('audits').update({ updated_at: new Date().toISOString() }).eq('id', id)
  }

  async function saveName() {
    setEditingName(false)
    if (!nameValue.trim() || nameValue === audit.name) return
    setAudit(a => ({ ...a, name: nameValue }))
    await supabase.from('audits').update({ name: nameValue }).eq('id', id)
  }

  async function archiveAudit() {
    setArchiving(true)
    await flushSave()
    await supabase.from('audits').update({ status: 'archived' }).eq('id', id)
    navigate(`/products/${product.slug}`)
  }

  async function handleExport() {
    setExporting(true)
    const checkedIds = new Set(Object.entries(progress).filter(([, v]) => v?.checked).map(([k]) => k))
    await exportAuditPDF({ audit, product, sections, checkedIds, earnedPoints, totalPoints })
    setExporting(false)
  }

  if (loading) return <Spinner />

  const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
  const hasChecklist = totalPoints > 0

  return (
    <div className="animate-fade-in">
      {/* ── PINK GRADIENT HEADER ────────────────────────────── */}
      <div className="-mx-8 -mt-8 px-6 sm:px-10 py-10 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #fde8f2 0%, #f9dce8 45%, #f4d0e0 100%)' }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 55% 70% at 80% 20%, rgba(255,255,255,0.35) 0%, transparent 60%), radial-gradient(ellipse 40% 50% at 15% 85%, rgba(212,175,55,0.12) 0%, transparent 55%)'
        }} />

        <div className="relative" style={{ zIndex: 1, maxWidth: '600px', margin: '0 auto' }}>
          <button
            onClick={() => navigate(`/products/${product?.slug}`)}
            className="text-xs uppercase tracking-widest mb-5 flex items-center justify-center gap-1.5 mx-auto transition-opacity hover:opacity-60"
            style={{ color: 'rgba(60,28,44,0.5)', fontFamily: 'var(--font-body)', letterSpacing: '0.12em' }}
          >
            ← {product?.name}
          </button>

          {editingName ? (
            <input
              className="text-3xl sm:text-5xl font-bold bg-transparent border-b-2 outline-none w-full text-center"
              style={{ borderColor: 'var(--color-primary)', fontFamily: 'var(--font-display)', color: '#3c1c2c' }}
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              autoFocus
            />
          ) : (
            <h1
              className="text-3xl sm:text-5xl font-bold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ fontFamily: 'var(--font-display)', color: '#3c1c2c', lineHeight: 1.1 }}
              onClick={() => setEditingName(true)}
              title="Klicka för att byta namn"
            >
              {audit?.name} <span style={{ fontSize: '0.5em', opacity: 0.4 }}>✏</span>
            </h1>
          )}

          {hasChecklist && (
            <div className="mt-6 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs" style={{ color: 'rgba(60,28,44,0.5)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}>
                  {earnedPoints} av {totalPoints} klara
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}>
                  {pct}%
                </span>
              </div>
              <div className="progress-bar" style={{ background: 'rgba(60,28,44,0.12)', height: '5px' }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 mt-5">
            {hasChecklist && (
              <button onClick={handleExport} disabled={exporting} className="btn-ghost text-sm"
                style={{ color: 'rgba(60,28,44,0.5)' }}>
                {exporting ? '…' : '↓ PDF'}
              </button>
            )}
            <button onClick={() => setShowArchiveModal(true)} className="btn-ghost text-sm"
              style={{ color: 'rgba(60,28,44,0.5)' }}>
              Arkivera
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────── */}
      <div className="flex p-6 sm:p-8">
        {/* Section nav – desktop */}
        <nav className="hidden lg:flex flex-col gap-0.5 w-64 flex-shrink-0 mr-8">
          {sections.map(s => {
            const { earned, total } = sectionScore(s, progress)
            const sPct = total > 0 ? Math.round((earned / total) * 100) : null
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="text-left px-3 py-2.5 transition-all duration-150 flex items-center justify-between gap-2"
                style={{
                  borderRadius: '6px',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  background: isActive ? 'rgba(255,90,141,0.06)' : 'transparent',
                  color: isActive ? 'var(--color-ink)' : 'var(--color-muted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span className="truncate">{s.title}</span>
                {sPct !== null && (
                  <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-semibold"
                    style={{ background: 'var(--color-yellow)', color: '#6b4f00', fontSize: '10px' }}>
                    {sPct}%
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Content – flex col so dropdown stacks above items on mobile */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 max-w-2xl">
          {/* Section select – mobile */}
          <div className="lg:hidden">
            <select className="input" value={activeSection || ''} onChange={e => setActiveSection(e.target.value)}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          {/* Content blocks */}
          {sections.filter(s => s.id === activeSection).map(section => (
            <SectionContent key={section.id} section={section} progress={progress}
              onToggle={toggleItem} onNote={updateNote} onOpenDrawer={setDrawerItem} />
          ))}
        </div>
      </div>

      {/* Knowledge drawer */}
      <KnowledgeDrawer
        item={drawerItem}
        checked={drawerItem ? !!progress[drawerItem.id]?.checked : false}
        onClose={() => setDrawerItem(null)}
        onToggle={() => { if (drawerItem) toggleItem(drawerItem) }}
      />

      {/* Archive modal */}
      <Modal open={showArchiveModal} onClose={() => setShowArchiveModal(false)} title="Arkivera audit">
        <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
          Är du säker på att du vill arkivera <strong>{audit?.name}</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowArchiveModal(false)} className="btn-ghost">Avbryt</button>
          <button onClick={archiveAudit} disabled={archiving} className="btn-primary"
            style={{ background: 'var(--color-coral)' }}>
            {archiving ? 'Arkiverar…' : 'Arkivera'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function SectionContent({ section, progress, onToggle, onNote, onOpenDrawer }) {
  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
        {section.title}
      </h2>
      {section.content_blocks.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Inget innehåll ännu.</p>
      )}
      {section.content_blocks.map(block => (
        <ContentBlock key={block.id} block={block} progress={progress} onToggle={onToggle} onNote={onNote} onOpenDrawer={onOpenDrawer} />
      ))}
    </div>
  )
}

function ContentBlock({ block, progress, onToggle, onNote, onOpenDrawer }) {
  if (block.type === 'video')     return <VideoBlock block={block} />
  if (block.type === 'audio')     return <AudioBlock block={block} />
  if (block.type === 'richtext')  return <RichTextBlock block={block} />
  if (block.type === 'file')      return <FileBlock block={block} />
  if (block.type === 'checklist') return <ChecklistBlock block={block} progress={progress} onToggle={onToggle} onNote={onNote} onOpenDrawer={onOpenDrawer} />
  return null
}

function VideoBlock({ block }) {
  const url = toEmbedUrl(block.embed_url)
  return (
    <div className="card p-0 overflow-hidden">
      {block.title && <div className="px-5 pt-5 pb-3"><h3 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{block.title}</h3></div>}
      {url ? (
        <div className="relative" style={{ paddingBottom: '56.25%' }}>
          <iframe src={url} className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen title={block.title || 'Video'} />
        </div>
      ) : (
        <div className="px-5 pb-4"><a href={block.embed_url} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: 'var(--color-primary)' }}>{block.embed_url}</a></div>
      )}
    </div>
  )
}

function AudioBlock({ block }) {
  return (
    <div className="card">
      {block.title && <h3 className="font-bold text-lg mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{block.title}</h3>}
      <audio controls className="w-full" src={block.embed_url}>Din webbläsare stöder inte ljud.</audio>
    </div>
  )
}

function RichTextBlock({ block }) {
  return (
    <div className="card">
      {block.title && <h3 className="font-bold text-xl mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>{block.title}</h3>}
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}
        dangerouslySetInnerHTML={{ __html: block.body || '' }} />
    </div>
  )
}

function FileBlock({ block }) {
  return (
    <a href={block.file_url} target="_blank" rel="noreferrer" download
      className="card flex items-center gap-4 hover:shadow-lg transition-all duration-150 no-underline"
      style={{ textDecoration: 'none' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
        style={{ background: 'var(--color-yellow)' }}>📄</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-ink)', fontFamily: 'var(--font-body)' }}>{block.file_name || block.title || 'Dokument'}</p>
        {block.title && block.file_name && <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{block.title}</p>}
      </div>
      <span className="text-sm flex-shrink-0 font-medium" style={{ color: 'var(--color-primary)' }}>↓ Ladda ned</span>
    </a>
  )
}

function ChecklistBlock({ block, progress, onToggle, onNote, onOpenDrawer }) {
  const { earned, total } = blockScore(block, progress)
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0
  return (
    <div>
      {block.title && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>{block.title}</p>
          {total > 0 && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded ${scoreClass(pct)}`}>{earned}/{total}p</span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        {block.checklist_items.map(item => (
          <CheckItem key={item.id} item={item}
            checked={!!progress[item.id]?.checked}
            note={progress[item.id]?.note || ''}
            onToggle={() => onToggle(item)}
            onNote={note => onNote(item.id, note)}
            onOpenDrawer={() => onOpenDrawer(item)} />
        ))}
        {block.checklist_items.length === 0 && <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Inga punkter ännu.</p>}
      </div>
    </div>
  )
}

function CheckItem({ item, checked, note, onToggle, onNote, onOpenDrawer }) {
  const [noteOpen, setNoteOpen] = useState(!!note)
  const priority = item.priority || 'viktig'

  return (
    <div className="card" style={{ padding: '14px 18px', borderColor: checked ? 'var(--color-primary)' : undefined, opacity: checked ? 0.75 : 1 }}>
      <div className="flex items-start gap-3">
        <div className={`check-box mt-0.5 ${checked ? 'checked' : ''}`} onClick={onToggle}>
          {checked && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex-shrink-0" style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 7px',
                background: 'rgba(212,175,55,0.15)',
                color: '#8a6c00',
                borderRadius: '4px',
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-body)',
              }}>
                {priority === 'kritisk' ? 'Kritisk' : priority === 'viktig' ? 'Viktig' : 'Bra att ha'}
              </span>
              <button
                onClick={onOpenDrawer}
                className={`text-sm font-medium leading-snug text-left transition-colors hover:underline ${checked ? 'line-through' : ''}`}
                style={{ color: checked ? 'var(--color-muted)' : 'var(--color-ink)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {item.label}
              </button>
            </div>
            <span className="text-xs flex-shrink-0 font-semibold px-2 py-0.5 rounded"
              style={{ background: 'var(--color-yellow)', color: '#6b4f00', fontFamily: 'var(--font-body)' }}>
              {item.points}p
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            {item.description && (
              <button onClick={onOpenDrawer} className="text-xs transition-colors flex items-center gap-1"
                style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.8 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Läs mer
              </button>
            )}
            <button onClick={() => setNoteOpen(v => !v)} className="text-xs transition-colors"
              style={{ color: note ? 'var(--color-primary)' : 'var(--color-muted)', fontFamily: 'var(--font-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {noteOpen ? '✕ Stäng anteckning' : note ? '📝 Anteckning' : '+ Anteckning'}
            </button>
          </div>

          {noteOpen && (
            <div className="mt-3 animate-fade-in">
              <textarea
                className="w-full text-sm rounded-lg px-3 py-2 outline-none transition-all resize-none"
                style={{
                  border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
                  color: 'var(--color-ink)', fontFamily: 'var(--font-body)', minHeight: '72px',
                }}
                placeholder="Skriv din anteckning…"
                value={note}
                onChange={e => onNote(e.target.value)}
                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KnowledgeDrawer({ item, checked, onClose, onToggle }) {
  const priority = item?.priority || 'viktig'
  const priorityLabel = priority === 'kritisk' ? 'Kritisk' : priority === 'viktig' ? 'Viktig' : 'Bra att ha'

  // Close on Escape
  useEffect(() => {
    if (!item) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(20,10,16,0.35)',
          backdropFilter: 'blur(2px)',
          opacity: item ? 1 : 0,
          pointerEvents: item ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 40,
        }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 92vw)',
        background: 'var(--color-surface)',
        boxShadow: '-8px 0 40px rgba(20,10,16,0.12)',
        transform: item ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Pink gradient header */}
        <div style={{
          padding: '28px 28px 24px',
          background: 'linear-gradient(145deg, #fde8f2 0%, #f9dce8 100%)',
          borderBottom: '1px solid rgba(255,90,141,0.12)',
          flexShrink: 0,
        }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 8px', marginBottom: '10px',
                background: 'rgba(212,175,55,0.18)', color: '#8a6c00',
                borderRadius: '4px', fontSize: '9px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                fontFamily: 'var(--font-body)',
              }}>{priorityLabel}</span>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.3rem',
                fontWeight: 700, color: '#3c1c2c', lineHeight: 1.25,
              }}>{item?.label}</h2>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(60,28,44,0.08)', border: 'none', cursor: 'pointer',
              flexShrink: 0, color: '#3c1c2c', fontSize: '16px',
              transition: 'background 0.15s',
            }}>✕</button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span style={{
              fontSize: '11px', fontFamily: 'var(--font-body)',
              color: 'rgba(60,28,44,0.5)',
            }}>{item?.points} poäng</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px', flex: 1 }}>
          {item?.description ? (
            <div>
              <p style={{
                fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: 'var(--color-muted)',
                fontFamily: 'var(--font-body)', marginBottom: '12px',
              }}>Fördjupning</p>
              <p style={{
                fontSize: '14px', lineHeight: 1.75,
                color: 'var(--color-ink)', fontFamily: 'var(--font-body)',
              }}>{item.description}</p>
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--color-muted)', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
              Ingen fördjupning tillagd för den här punkten ännu.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 28px',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { onToggle(); onClose() }}
            className="btn-primary w-full justify-center"
            style={{ background: checked ? 'var(--color-muted)' : 'var(--color-primary)' }}
          >
            {checked ? '↩ Markera som ej klar' : '✓ Markera som klar'}
          </button>
        </div>
      </div>
    </>
  )
}

function toEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  const lo = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (lo) return `https://www.loom.com/embed/${lo[1]}`
  return null
}

function sectionScore(section, progress) {
  let earned = 0, total = 0
  for (const b of section.content_blocks)
    if (b.type === 'checklist')
      for (const item of b.checklist_items) {
        total += (item.points || 0)
        if (progress[item.id]?.checked) earned += (item.points || 0)
      }
  return { earned, total }
}

function blockScore(block, progress) {
  let earned = 0, total = 0
  for (const item of block.checklist_items) {
    total += (item.points || 0)
    if (progress[item.id]?.checked) earned += (item.points || 0)
  }
  return { earned, total }
}

function scoreClass(pct) {
  if (pct >= 70) return 'score-bg-high'
  if (pct >= 40) return 'score-bg-mid'
  return 'score-bg-low'
}

function Spinner() {
  return (
    <div className="flex items-center gap-2 p-8" style={{ color: 'var(--color-muted)' }}>
      <div className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
      Laddar audit…
    </div>
  )
}
