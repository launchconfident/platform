import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const firstName = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'du'

  useEffect(() => { fetchProducts() }, [user])

  async function fetchProducts() {
    if (!user) return
    const { data } = await supabase
      .from('user_products')
      .select('product_id, products(id, name, description, slug)')
      .eq('user_id', user.id)
    if (data) {
      const productList = data.map(d => d.products).filter(Boolean)
      const withCounts = await Promise.all(productList.map(async p => {
        const { count } = await supabase.from('audits')
          .select('id', { count: 'exact', head: true })
          .eq('product_id', p.id).eq('user_id', user.id).eq('status', 'active')
        return { ...p, auditCount: count || 0 }
      }))
      setProducts(withCounts)
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in p-6 sm:p-8 max-w-4xl">
      {/* Greeting */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
          Din översikt
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
          Hej, <em>{firstName}!</em>
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
          Välkommen tillbaka. Här är dina produkter.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
          <div className="w-5 h-5 rounded-full border-2 border-border animate-spin" style={{ borderTopColor: 'var(--color-primary)' }} />
          Laddar…
        </div>
      ) : products.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onOpen={() => navigate(`/products/${p.slug}`)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product, onOpen }) {
  return (
    <div className="card cursor-pointer group transition-all duration-200 hover:shadow-lg" onClick={onOpen}
      style={{ padding: '28px' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ fontFamily: 'var(--font-body)', letterSpacing: '0.1em', color: 'var(--color-muted)' }}>
              Produkt
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ background: 'var(--color-yellow)', color: '#6b4f00', fontFamily: 'var(--font-body)' }}>
              {product.auditCount} aktiv{product.auditCount !== 1 ? 'a' : ''}
            </span>
          </div>
          <h2 className="text-xl font-bold leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
            {product.name}
          </h2>
          {product.description && (
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
              {product.description}
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'rgba(255,90,141,0.08)', color: 'var(--color-primary)' }}>
          →
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card text-center py-16" style={{ maxWidth: '420px' }}>
      <p className="text-4xl mb-4">🚀</p>
      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink)' }}>
        Inga produkter <em>ännu</em>
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-body)' }}>
        Din produkt dyker upp här när ditt köp är aktiverat.
      </p>
      <a href="mailto:emma@launchconfident.se" className="btn-primary">Kontakta oss</a>
    </div>
  )
}
