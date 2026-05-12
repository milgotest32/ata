'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { Search, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama',
  products: 'Ürün Listesi',
  product_detail: 'Ürün Detay',
  order_status: 'Sipariş Durumu',
  order_create: 'Sipariş Oluştur',
  subscription: 'Abonelik',
  human_handover: 'Canlı Destek',
  complaint: 'Şikayet',
  brand_info: 'Marka Bilgi',
  usage_question: 'Kullanım Sorusu',
  menu: 'Menü',
  smalltalk: 'Sohbet',
  other: 'Diğer',
}

export default function KonusmalarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'canli' | 'gpt' | 'kvkk'>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Session | null>(null)

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setLoading(true)
    let q = supabase
      .from('wa_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (filter === 'canli') q = q.eq('bulundugu_menu', 'canli')
    else if (filter === 'gpt') q = q.eq('bulundugu_menu', 'gpt')
    else if (filter === 'kvkk') q = q.eq('kvkk_onay', false)

    const { data } = await q
    setSessions((data || []) as Session[])
    setLoading(false)
  }

  const filtered = sessions.filter(
    (s) =>
      !search ||
      s.phone.includes(search) ||
      (s.musteri_yazdigi || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">
          {sessions.length} kayıt
        </p>
        <h1 className="font-display text-5xl text-ink-900 tracking-tight">
          Konuşmalar
        </h1>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            placeholder="Telefon veya mesaj ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-cream-200 rounded-xl text-ink-700 placeholder-ink-300 focus:outline-none focus:border-moss-400 transition-colors"
          />
        </div>
        <div className="flex bg-white border border-cream-200 rounded-xl p-1 gap-1">
          {[
            { v: 'all', l: 'Hepsi' },
            { v: 'gpt', l: 'Bot Modu' },
            { v: 'canli', l: 'Canlı' },
            { v: 'kvkk', l: 'KVKK Bekleyen' },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f.v
                  ? 'bg-ink-900 text-cream-50'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Telefon
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Son Mesaj
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Niyet
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Durum
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                KVKK
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Güncelleme
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.phone}
                onClick={() => setSelected(s)}
                className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-mono text-sm text-ink-700">
                  {s.phone}
                </td>
                <td className="px-6 py-4 text-sm text-ink-500 max-w-xs truncate">
                  {s.musteri_yazdigi || '—'}
                </td>
                <td className="px-6 py-4 text-xs text-ink-500">
                  {INTENT_LABEL[s.last_intent || 'other'] || s.last_intent || '—'}
                </td>
                <td className="px-6 py-4">
                  {s.bulundugu_menu === 'canli' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ember-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-ember-500" />
                      Canlı
                    </span>
                  ) : s.bulundugu_menu === 'kvkk' ? (
                    <span className="text-xs text-cream-500">KVKK</span>
                  ) : (
                    <span className="text-xs text-moss-500">Bot</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium ${
                      s.kvkk_onay ? 'text-moss-500' : 'text-ember-500'
                    }`}
                  >
                    {s.kvkk_onay ? '✓ Onaylı' : '✗ Yok'}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-ink-300 font-mono">
                  {formatDistanceToNow(new Date(s.updated_at), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">
            yükleniyor...
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">
            sonuç bulunamadı
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-cream-50 h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-cream-200">
              <div className="text-xs uppercase tracking-[0.2em] text-ink-300 mb-2">
                Müşteri Detayı
              </div>
              <div className="font-mono text-lg text-ink-900">
                {selected.phone}
              </div>
            </div>
            <dl className="p-8 space-y-5">
              {[
                ['Durum', selected.bulundugu_menu],
                ['Son Niyet', INTENT_LABEL[selected.last_intent || 'other'] || '—'],
                ['Bekleyen Aksiyon', selected.pending_action || '—'],
                ['KVKK', selected.kvkk_onay ? 'Onaylı' : 'Yok'],
                [
                  'KVKK Tarihi',
                  selected.kvkk_onay_tarihi
                    ? new Date(selected.kvkk_onay_tarihi).toLocaleString('tr')
                    : '—',
                ],
                ['Son Mesaj', selected.musteri_yazdigi || '—'],
                ['Slack Thread', selected.slack_thread_ts || '—'],
                ['Son Güncelleme', new Date(selected.updated_at).toLocaleString('tr')],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-1">
                    {label}
                  </dt>
                  <dd className="text-sm text-ink-700 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="p-8 pt-0">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-3 bg-ink-900 text-cream-50 rounded-xl text-sm font-medium"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
