'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { Search, X, MessageSquare, ShoppingCart, Package } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama', products: 'Ürün Listesi', product_detail: 'Ürün Detay',
  order_status: 'Sipariş Durumu', order_create: 'Sipariş Oluştur', subscription: 'Abonelik',
  human_handover: 'Canlı Destek', complaint: 'Şikayet', brand_info: 'Marka Bilgi',
  usage_question: 'Kullanım Sorusu', menu: 'Menü', smalltalk: 'Sohbet', other: 'Diğer',
}

const TONE: Record<string, string> = {
  greeting: '#7c9059', products: '#a8b885', subscription: '#d97757',
  human_handover: '#c4633f', complaint: '#a64d2e', order_create: '#c4a154', other: '#928c79',
}

type FilterType = 'all' | 'canli' | 'gpt' | 'kvkk' | 'sepet'

export default function KonusmalarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase.from('wa_sessions').select('*').order('updated_at', { ascending: false }).limit(500)
    if (filter === 'canli') q = q.eq('bulundugu_menu', 'canli')
    else if (filter === 'gpt') q = q.eq('bulundugu_menu', 'gpt')
    else if (filter === 'kvkk') q = q.eq('kvkk_onay', false)
    const { data } = await q
    let list = (data || []) as Session[]
    if (filter === 'sepet') list = list.filter(s => s.pending_action && String(s.pending_action).includes('order:'))
    setSessions(list)
    setLoading(false)
  }

  const filtered = sessions.filter(s =>
    !search || s.phone.includes(search) || (s.musteri_yazdigi || '').toLowerCase().includes(search.toLowerCase())
  )

  const filters: { v: FilterType; l: string }[] = [
    { v: 'all', l: 'Hepsi' },
    { v: 'gpt', l: 'Bot' },
    { v: 'canli', l: 'Canlı' },
    { v: 'kvkk', l: 'KVKK Yok' },
    { v: 'sepet', l: 'Sepet' },
  ]

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">{sessions.length} kayıt</p>
        <h1 className="font-display text-5xl text-ink-900 tracking-tight">Konuşmalar</h1>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input type="text" placeholder="Telefon veya mesaj ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-cream-200 rounded-xl text-ink-700 placeholder-ink-300 focus:outline-none focus:border-moss-400 transition-colors text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex bg-white border border-cream-200 rounded-xl p-1 gap-1">
          {filters.map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="animate-pulse flex gap-4 px-6 py-3">
                <div className="h-4 bg-cream-200 rounded w-32" />
                <div className="h-4 bg-cream-100 rounded flex-1" />
                <div className="h-4 bg-cream-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-50">
              <tr>
                {['Telefon', 'Son Mesaj', 'Niyet', 'Durum', 'KVKK', 'Güncelleme'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.phone} onClick={() => setSelected(s)}
                  className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-ink-700">{s.phone}</td>
                  <td className="px-6 py-4 text-sm text-ink-500 max-w-xs truncate">{s.musteri_yazdigi || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide"
                      style={{ background: `${TONE[s.last_intent||'other']}20`, color: TONE[s.last_intent||'other'] }}>
                      {INTENT_LABEL[s.last_intent||'other'] || 'Diğer'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.bulundugu_menu === 'canli' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-ember-600"><span className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />Canlı</span>
                    ) : s.bulundugu_menu === 'kvkk' ? (
                      <span className="text-xs text-cream-500">KVKK</span>
                    ) : (
                      <span className="text-xs text-moss-500">Bot</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${s.kvkk_onay ? 'text-moss-500' : 'text-ember-400'}`}>
                      {s.kvkk_onay ? '✓ Onaylı' : '✗ Yok'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-ink-300 font-mono">
                    {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: tr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">sonuç bulunamadı</div>
        )}
      </div>

      {/* Müşteri Profil Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-cream-50 h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-cream-200 z-10">
              <div className="p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-moss-100 flex items-center justify-center">
                    <span className="text-lg font-display text-moss-700">{selected.phone.slice(-2)}</span>
                  </div>
                  <div>
                    <div className="font-mono text-ink-900">{selected.phone}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        selected.bulundugu_menu === 'canli' ? 'bg-ember-100 text-ember-700' :
                        selected.bulundugu_menu === 'kvkk' ? 'bg-cream-200 text-ink-500' : 'bg-moss-100 text-moss-700'
                      }`}>
                        {selected.bulundugu_menu === 'canli' ? '🔴 Canlı Destek' :
                         selected.bulundugu_menu === 'kvkk' ? '⏳ KVKK' : '🤖 Bot'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${selected.kvkk_onay ? 'bg-moss-50 text-moss-600' : 'bg-ember-50 text-ember-600'}`}>
                        {selected.kvkk_onay ? '✓ KVKK' : '✗ KVKK Yok'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream-100 text-ink-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">

              {/* Son mesaj */}
              {selected.musteri_yazdigi && (
                <div className="bg-white border border-cream-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-ink-300" strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-ink-300">Son Mesaj</span>
                  </div>
                  <p className="text-sm text-ink-700 italic">"{selected.musteri_yazdigi}"</p>
                </div>
              )}

              {/* Detaylar */}
              <div className="bg-white border border-cream-200 rounded-xl divide-y divide-cream-100">
                {[
                  { label: 'Son Niyet', value: INTENT_LABEL[selected.last_intent||'other'] || '—', emoji: '🎯' },
                  { label: 'Bekleyen Aksiyon', value: selected.pending_action || '—', emoji: '⏳' },
                  { label: 'KVKK Tarihi', value: selected.kvkk_onay_tarihi ? new Date(selected.kvkk_onay_tarihi).toLocaleString('tr') : '—', emoji: '📋' },
                  { label: 'Son Güncelleme', value: new Date(selected.updated_at).toLocaleString('tr'), emoji: '🕐' },
                  { label: 'Slack Thread', value: selected.slack_thread_ts ? `${selected.slack_thread_ts.slice(0,12)}...` : '—', emoji: '💬' },
                ].map(({ label, value, emoji }) => (
                  <div key={label} className="flex items-start gap-3 px-4 py-3">
                    <span className="text-base mt-0.5 shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.15em] text-ink-300 mb-0.5">{label}</dt>
                      <dd className="text-sm text-ink-700 break-all">{value}</dd>
                    </div>
                  </div>
                ))}
              </div>

              {/* Baktığı ürünler */}
              {selected.last_products && (() => {
                try {
                  const prods = typeof selected.last_products === 'string' ? JSON.parse(selected.last_products) : selected.last_products
                  const items = Array.isArray(prods) ? prods : (prods.items || prods.products || [])
                  if (!items.length) return null
                  return (
                    <div className="bg-white border border-cream-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Package className="w-3.5 h-3.5 text-ink-300" strokeWidth={1.5} />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-300">Baktığı Ürünler</span>
                      </div>
                      <div className="space-y-2">
                        {items.slice(0,5).map((p: any, i: number) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm text-ink-700 truncate flex-1">{p.title||p.ad||p.name||'—'}</span>
                            {p.price && <span className="text-xs text-ink-400 font-mono ml-2">{p.price} ₺</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}

              {/* Sepet */}
              {selected.pending_action && String(selected.pending_action).includes('order:') && (
                <div className="bg-moss-50 border border-moss-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3.5 h-3.5 text-moss-600" strokeWidth={1.5} />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-moss-600">Aktif Sepet</span>
                  </div>
                  <p className="text-sm text-moss-700 font-mono break-all">{String(selected.pending_action)}</p>
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="space-y-2 pt-2">
                {selected.slack_thread_ts && (
                  <a href="/canli-destek" className="w-full flex items-center justify-center gap-2 py-3 bg-ember-600 text-white rounded-xl text-sm font-medium hover:bg-ember-700 transition-colors">
                    💬 Canlı Destek'te Aç →
                  </a>
                )}
                <button onClick={() => setSelected(null)} className="w-full py-3 bg-ink-900 text-cream-50 rounded-xl text-sm font-medium hover:bg-ink-700 transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
