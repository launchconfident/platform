import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { nanoid } from '../lib/nanoid'
import Modal from '../components/Modal'

const BLOCK_TYPES = [
  { type: 'checklist', label: '☑️ Checklista', desc: 'Checkboxar med poäng' },
  { type: 'video',     label: '🎬 Video',      desc: 'YouTube, Vimeo eller Loom' },
  { type: 'audio',     label: '🎧 Audio',      desc: 'Länk till ljudfil' },
  { type: 'richtext',  label: '📝 Text',       desc: 'Formaterad brödtext' },
  { type: 'file',      label: '📄 Fil',        desc: 'Nedladdningsbar fil' },
]

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('products')
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Generate link
  const [genEmail, setGenEmail] = useState('')
  const [genProduct, setGenProduct] = useState('')
  const [genLink, setGenLink] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productForm, setProductForm] = useState({ name: '', description: '', slug: '' })
  const [savingProduct, setSavingProduct] = useState(false)

  // Expanded product + sections
  const [expandedProduct, setExpandedProduct] = useState(null)
  const [sections, setSections] = useState({})

  // Section modal
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [sectionForm, setSectionForm] = useState({ title: '', product_id: '' })
  const [savingSection, setSavingSection] = useState(false)

  // Block modal
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockForm, setBlockForm] = useState({ type: 'checklist', title: '', embed_url: '', body: '', file_url: '', file_name: '', section_id: '' })
  const [savingBlock, setSavingBlock] = useState(false)

  // Checklist item modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [itemForm, setItemForm] = useState({ label: '', description: '', points: 10, priority: 'viktig', block_id: '', section_id: '' })
  const [savingItem, setSavingItem] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: prods }, { data: userProds }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('user_products').select('*, profiles(display_name), products(name)').order('granted_at', { ascending: false }),
    ])
    setProducts(prods || [])
    const userMap = {}
    for (const up of (userProds || [])) {
      if (!up.profiles) continue
      const key = up.user_id
      if (!userMap[key]) userMap[key] = { user_id: up.user_id, display_name: up.profiles?.display_name, granted_at: up.granted_at, products: [] }
      userMap[key].products.push(up.products?.name)
    }
    setUsers(Object.values(userMap))
    if (prods?.length > 0) setGenProduct(prods[0].id)
    setLoading(false)
  }

  async function fetchSections(productId) {
    const { data } = await supabase
      .from('product_sections')
      .select(`*, content_blocks(id, type, title, order, embed_url, body, file_url, file_name, checklist_items(id, label, description, points, priority, order))`)
      .eq('product_id', productId)
      .order('order')
    setSections(prev => ({
      ...prev,
      [productId]: (data || []).map(s => ({
        ...s,
        content_blocks: [...(s.content_blocks || [])].sort((a, b) => a.order - b.order).map(b => ({
          ...b,
          checklist_items: [...(b.checklist_items || [])].sort((a, b) => a.order - b.order)
        }))
      }))
    }))
  }

  function toggleProduct(id) {
    if (expandedProduct === id) { setExpandedProduct(null); return }
    setExpandedProduct(id)
    if (!sections[id]) fetchSections(id)
  }

  // Product CRUD
  function openNewProduct() {
    setEditingProduct(null)
    setProductForm({ name: '', description: '', slug: '' })
    setShowProductModal(true)
  }
  function openEditProduct(p) {
    setEditingProduct(p)
    setProductForm({ name: p.name, description: p.description || '', slug: p.slug })
    setShowProductModal(true)
  }
  function autoSlug(name) {
    return name.toLowerCase().replace(/å/g,'a').replace(/ä/g,'a').replace(/ö/g,'o').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
  }
  async function saveProduct() {
    setSavingProduct(true)
    if (editingProduct) {
      await supabase.from('products').update(productForm).eq('id', editingProduct.id)
    } else {
      await supabase.from('products').insert(productForm)
    }
    await fetchAll()
    setSavingProduct(false)
    setShowProductModal(false)
  }
  async function deleteProduct(id) {
    if (!confirm('Är du säker? Allt innehåll tas bort.')) return
    await supabase.from('products').delete().eq('id', id)
    await fetchAll()
  }

  // Section CRUD
  function openNewSection(productId) {
    setSectionForm({ title: '', product_id: productId })
    setShowSectionModal(true)
  }
  async function saveSection() {
    setSavingSection(true)
    const existing = sections[sectionForm.product_id] || []
    await supabase.from('product_sections').insert({ ...sectionForm, order: existing.length + 1 })
    await fetchSections(sectionForm.product_id)
    setSavingSection(false)
    setShowSectionModal(false)
  }
  async function deleteSection(section) {
    if (!confirm(`Ta bort sektionen "${section.title}"?`)) return
    await supabase.from('product_sections').delete().eq('id', section.id)
    await fetchSections(section.product_id)
  }

  // Block CRUD
  function openNewBlock(sectionId) {
    setBlockForm({ type: 'checklist', title: '', embed_url: '', body: '', file_url: '', file_name: '', section_id: sectionId })
    setShowBlockModal(true)
  }
  async function saveBlock() {
    setSavingBlock(true)
    const productId = Object.entries(sections).find(([, secs]) => secs.some(s => s.id === blockForm.section_id))?.[0]
    const sec = sections[productId]?.find(s => s.id === blockForm.section_id)
    const order = (sec?.content_blocks?.length || 0) + 1
    await supabase.from('content_blocks').insert({ ...blockForm, order })
    if (productId) await fetchSections(productId)
    setSavingBlock(false)
    setShowBlockModal(false)
  }
  async function deleteBlock(block, productId) {
    if (!confirm(`Ta bort blocket "${block.title || block.type}"?`)) return
    await supabase.from('content_blocks').delete().eq('id', block.id)
    await fetchSections(productId)
  }

  // Checklist item CRUD
  function openNewItem(blockId, sectionId) {
    setEditingItem(null)
    setItemForm({ label: '', description: '', points: 10, priority: 'viktig', block_id: blockId, section_id: sectionId })
    setShowItemModal(true)
  }
  function openEditItem(item, blockId, sectionId) {
    setEditingItem(item)
    setItemForm({ label: item.label, description: item.description || '', points: item.points || 10, priority: item.priority || 'viktig', block_id: blockId, section_id: sectionId })
    setShowItemModal(true)
  }
  async function saveItem() {
    setSavingItem(true)
    const productId = Object.entries(sections).find(([, secs]) => secs.some(s => s.id === itemForm.section_id))?.[0]
    if (editingItem) {
      await supabase.from('checklist_items').update({
        label: itemForm.label,
        description: itemForm.description,
        points: itemForm.points,
        priority: itemForm.priority,
      }).eq('id', editingItem.id)
    } else {
      const sec = sections[productId]?.find(s => s.id === itemForm.section_id)
      const block = sec?.content_blocks?.find(b => b.id === itemForm.block_id)
      const order = (block?.checklist_items?.length || 0) + 1
      await supabase.from('checklist_items').insert({ label: itemForm.label, description: itemForm.description, points: itemForm.points, priority: itemForm.priority, section_id: itemForm.section_id, block_id: itemForm.block_id, order })
    }
    if (productId) await fetchSections(productId)
    setSavingItem(false)
    setShowItemModal(false)
  }
  async function deleteItem(item, productId) {
    if (!confirm(`Ta bort "${item.label}"?`)) return
    await supabase.from('checklist_items').delete().eq('id', item.id)
    await fetchSections(productId)
  }

  // Registration link
  async function generateLink() {
    if (!genEmail.trim() || !genProduct) return
    setGenerating(true); setGenLink('')
    const token = nanoid(32)
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('registration_tokens').insert({ token, product_id: genProduct, email: genEmail.trim().toLowerCase(), expires_at: expires })
    setGenLink(`${window.location.origin}/register?token=${token}`)
    setGenerating(false)
  }
  async function copyLink() {
    await navigator.clipboard.writeText(genLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl font-semibold mb-6" style={{ color: 'var(--color-ink)' }}>Admin</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--color-border)' }}>
        {[['products','Produkter'],['links','Registreringslänkar'],['users','Användare']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
            style={tab === key ? { background: 'white', color: 'var(--color-ink)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: 'var(--color-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-4 max-w-3xl">
            <h2 className="font-semibold text-base" style={{ color: 'var(--color-ink)' }}>Produkter</h2>
            <button onClick={openNewProduct} className="btn-primary text-sm">+ Ny produkt</button>
          </div>

          {loading ? <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Laddar…</p>
          : products.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Inga produkter ännu.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-3xl">
              {products.map(p => (
                <div key={p.id} className="card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => toggleProduct(p.id)} className="font-semibold text-left" style={{ color: 'var(--color-ink)' }}>
                          {expandedProduct === p.id ? '▾' : '▸'} {p.name}
                        </button>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>/{p.slug}</span>
                      </div>
                      {p.description && <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-muted)' }}>{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" className="btn-ghost text-sm py-1.5 px-3">👁 Förhandsgranska</a>
                      <button onClick={() => openEditProduct(p)} className="btn-ghost text-sm py-1.5 px-3">Redigera</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-sm px-3 py-1.5 rounded-xl" style={{ color: 'var(--color-coral)' }}>Ta bort</button>
                    </div>
                  </div>

                  {expandedProduct === p.id && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>Sektioner</p>
                        <button onClick={() => openNewSection(p.id)} className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>+ Sektion</button>
                      </div>

                      {(sections[p.id] || []).length === 0
                        ? <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Inga sektioner ännu.</p>
                        : (
                          <div className="flex flex-col gap-3">
                            {(sections[p.id] || []).map(s => (
                              <div key={s.id} className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
                                {/* Section header */}
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>{s.title}</p>
                                  <div className="flex gap-2">
                                    <button onClick={() => openNewBlock(s.id)} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>+ Block</button>
                                    <button onClick={() => deleteSection(s)} className="text-xs" style={{ color: 'var(--color-coral)' }}>Ta bort sektion</button>
                                  </div>
                                </div>

                                {/* Blocks */}
                                <div className="flex flex-col gap-2">
                                  {s.content_blocks.map(block => (
                                    <div key={block.id} className="rounded-lg p-2.5 border" style={{ background: 'white', borderColor: 'var(--color-border)' }}>
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-border)', color: 'var(--color-muted)' }}>
                                            {BLOCK_TYPES.find(b => b.type === block.type)?.label || block.type}
                                          </span>
                                          {block.title && <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{block.title}</span>}
                                        </div>
                                        <div className="flex gap-2">
                                          {block.type === 'checklist' && (
                                            <button onClick={() => openNewItem(block.id, s.id)} className="text-xs" style={{ color: 'var(--color-primary)' }}>+ Punkt</button>
                                          )}
                                          <button onClick={() => deleteBlock(block, p.id)} className="text-xs" style={{ color: 'var(--color-coral)' }}>✕</button>
                                        </div>
                                      </div>

                                      {/* Block preview */}
                                      {block.type === 'video' && block.embed_url && (
                                        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>🔗 {block.embed_url}</p>
                                      )}
                                      {block.type === 'audio' && block.embed_url && (
                                        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>🔗 {block.embed_url}</p>
                                      )}
                                      {block.type === 'richtext' && block.body && (
                                        <p className="text-xs truncate" style={{ color: 'var(--color-muted)' }}>{block.body.replace(/<[^>]*>/g, '').slice(0, 80)}…</p>
                                      )}
                                      {block.type === 'file' && (
                                        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{block.file_name || '—'}</p>
                                      )}
                                      {block.type === 'checklist' && (
                                        <div className="mt-1 flex flex-col gap-0.5">
                                          {block.checklist_items.map(item => (
                                            <div key={item.id} className="flex items-center justify-between gap-2 py-1 px-1 rounded-lg hover:bg-gray-50 group">
                                              <div className="flex-1 min-w-0">
                                                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>○ {item.label}</span>
                                                {item.description && (
                                                  <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(155,143,133,0.7)', fontStyle: 'italic' }}>{item.description}</p>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-yellow)', color: '#6b4f00' }}>{item.points}p</span>
                                                <button onClick={() => openEditItem(item, block.id, s.id)} className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-primary)' }}>Redigera</button>
                                                <button onClick={() => deleteItem(item, p.id)} className="text-xs" style={{ color: 'var(--color-coral)' }}>✕</button>
                                              </div>
                                            </div>
                                          ))}
                                          {block.checklist_items.length === 0 && (
                                            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Inga punkter ännu.</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {s.content_blocks.length === 0 && (
                                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Inga block ännu. Klicka "+ Block" för att lägga till innehåll.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LINKS TAB */}
      {tab === 'links' && (
        <div className="card max-w-lg">
          <h2 className="font-semibold text-base mb-4">Generera registreringslänk</h2>
          <div className="flex flex-col gap-3 mb-3">
            <input type="email" className="input" placeholder="köparens@epost.se" value={genEmail} onChange={e => setGenEmail(e.target.value)} />
            <select className="input" value={genProduct} onChange={e => setGenProduct(e.target.value)}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button onClick={generateLink} className="btn-primary" disabled={generating || !genEmail.trim()}>
              {generating ? '…' : 'Generera länk'}
            </button>
          </div>
          {genLink && (
            <div className="flex items-center gap-2 mt-3">
              <input type="text" className="input flex-1 text-xs" value={genLink} readOnly />
              <button onClick={copyLink} className="btn-primary whitespace-nowrap">{copied ? '✓ Kopierat' : 'Kopiera'}</button>
            </div>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div className="card">
          <h2 className="font-semibold text-base mb-4">Användare ({users.length})</h2>
          {loading ? <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Laddar…</p>
          : users.length === 0 ? <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Inga användare ännu.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <th className="pb-2 pr-4 font-medium" style={{ color: 'var(--color-muted)' }}>Namn</th>
                  <th className="pb-2 pr-4 font-medium" style={{ color: 'var(--color-muted)' }}>Registrerad</th>
                  <th className="pb-2 font-medium" style={{ color: 'var(--color-muted)' }}>Produkter</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-ink)' }}>{u.display_name || '—'}</td>
                    <td className="py-3 pr-4" style={{ color: 'var(--color-muted)' }}>{new Date(u.granted_at).toLocaleDateString('sv-SE')}</td>
                    <td className="py-3" style={{ color: 'var(--color-muted)' }}>{u.products.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Product modal */}
      <Modal open={showProductModal} onClose={() => setShowProductModal(false)} title={editingProduct ? 'Redigera produkt' : 'Ny produkt'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Namn</label>
            <input className="input" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value, slug: editingProduct ? f.slug : autoSlug(e.target.value) }))} placeholder="Pre-Launch Audit" autoFocus />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input className="input" value={productForm.slug} onChange={e => setProductForm(f => ({ ...f, slug: e.target.value }))} placeholder="pre-launch-audit" />
          </div>
          <div>
            <label className="label">Beskrivning</label>
            <input className="input" value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} placeholder="Kort beskrivning" />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowProductModal(false)} className="btn-ghost">Avbryt</button>
            <button onClick={saveProduct} className="btn-primary" disabled={savingProduct || !productForm.name || !productForm.slug}>
              {savingProduct ? '…' : 'Spara'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Section modal */}
      <Modal open={showSectionModal} onClose={() => setShowSectionModal(false)} title="Ny sektion">
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Namn på sektionen</label>
            <input className="input" value={sectionForm.title} onChange={e => setSectionForm(f => ({ ...f, title: e.target.value }))} placeholder="t.ex. Modul 1 – Grunden" autoFocus onKeyDown={e => e.key === 'Enter' && saveSection()} />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowSectionModal(false)} className="btn-ghost">Avbryt</button>
            <button onClick={saveSection} className="btn-primary" disabled={savingSection || !sectionForm.title}>
              {savingSection ? '…' : 'Skapa sektion'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Block modal */}
      <Modal open={showBlockModal} onClose={() => setShowBlockModal(false)} title="Lägg till block">
        <div className="flex flex-col gap-4">
          {/* Type picker */}
          <div>
            <label className="label">Typ av innehåll</label>
            <div className="grid grid-cols-2 gap-2">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => setBlockForm(f => ({ ...f, type: bt.type }))}
                  className="text-left px-3 py-2.5 rounded-xl border transition-all"
                  style={blockForm.type === bt.type
                    ? { borderColor: 'var(--color-primary)', background: 'rgba(255,90,141,0.06)' }
                    : { borderColor: 'var(--color-border)', background: 'white' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{bt.label}</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{bt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="label">Rubrik {blockForm.type === 'checklist' ? '(valfri)' : ''}</label>
            <input className="input" value={blockForm.title} onChange={e => setBlockForm(f => ({ ...f, title: e.target.value }))} placeholder={blockForm.type === 'video' ? 'Videotitel' : blockForm.type === 'file' ? 'Filens beskrivning' : 'Rubrik'} />
          </div>

          {/* Type-specific fields */}
          {(blockForm.type === 'video' || blockForm.type === 'audio') && (
            <div>
              <label className="label">{blockForm.type === 'video' ? 'Video-URL (YouTube, Vimeo, Loom)' : 'Ljud-URL'}</label>
              <input className="input" value={blockForm.embed_url} onChange={e => setBlockForm(f => ({ ...f, embed_url: e.target.value }))} placeholder="https://…" />
            </div>
          )}

          {blockForm.type === 'richtext' && (
            <div>
              <label className="label">Text (HTML är ok)</label>
              <textarea className="input" rows={5} value={blockForm.body} onChange={e => setBlockForm(f => ({ ...f, body: e.target.value }))} placeholder="<p>Skriv din text här…</p>" style={{ resize: 'vertical' }} />
              <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Tips: använd &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;&lt;li&gt; osv.</p>
            </div>
          )}

          {blockForm.type === 'file' && (
            <>
              <div>
                <label className="label">Filnamn (visas för användaren)</label>
                <input className="input" value={blockForm.file_name} onChange={e => setBlockForm(f => ({ ...f, file_name: e.target.value }))} placeholder="Mall – Lansieringsplan.pdf" />
              </div>
              <div>
                <label className="label">Fil-URL</label>
                <input className="input" value={blockForm.file_url} onChange={e => setBlockForm(f => ({ ...f, file_url: e.target.value }))} placeholder="https://…" />
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Ladda upp filen i Supabase Storage och klistra in URL:en här.</p>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowBlockModal(false)} className="btn-ghost">Avbryt</button>
            <button onClick={saveBlock} className="btn-primary" disabled={savingBlock}>
              {savingBlock ? '…' : 'Lägg till'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Checklist item modal */}
      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? 'Redigera punkt' : 'Ny checklistpunkt'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Punkt</label>
            <input className="input" value={itemForm.label} onChange={e => setItemForm(f => ({ ...f, label: e.target.value }))} placeholder="Vad ska vara klart?" autoFocus />
          </div>
          <div>
            <label className="label">Fördjupning (visas i kunskapspanelen)</label>
            <textarea
              className="input"
              rows={5}
              style={{ resize: 'vertical' }}
              value={itemForm.description}
              onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Förklara varför det här steget är viktigt, ge exempel eller tips på hur man gör det…"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Syns när kunden klickar på punktens namn i auditen.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="label">Prioritet</label>
              <select className="input" value={itemForm.priority} onChange={e => setItemForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="kritisk">Kritisk</option>
                <option value="viktig">Viktig</option>
                <option value="bra-att-ha">Bra att ha</option>
              </select>
            </div>
            <div className="w-28">
              <label className="label">Poäng</label>
              <input type="number" className="input" value={itemForm.points} onChange={e => setItemForm(f => ({ ...f, points: parseInt(e.target.value) || 10 }))} min="1" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowItemModal(false)} className="btn-ghost">Avbryt</button>
            <button onClick={saveItem} className="btn-primary" disabled={savingItem || !itemForm.label}>
              {savingItem ? '…' : editingItem ? 'Spara ändringar' : 'Lägg till'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
