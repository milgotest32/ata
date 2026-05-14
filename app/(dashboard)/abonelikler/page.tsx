'use client'

import { useEffect, useState } from 'react'
import { Repeat, TrendingUp, Calendar, RefreshCw, DollarSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

type Subscription = {
  id?: string; ad: string; soyad: string; haftalik_adet: number
  iletisim: string; urun?: string; fiyat_tekil?: number
  durum: string; created_at?: string; submitted_at?: string
}

export default function AboneliklerPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'abone'|'bekliyor'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/aboneliker')
      const data = await res.json()
      setSubs(data.subs || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? subs : subs.filter(s => s.durum === filter)
  const aktif = subs.filter(s => s.durum === 'abone').length
  const bekleyen = subs.filter(s => s.durum !== 'abone').length
  const toplamHaftalikAdet = subs.filter(s => s.durum === 'abone').reduce((sum, s) => sum + s.haftalik_adet, 0)
  const toplamGelir = subs.filter(s => s.durum === 'abone').reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130) * 4), 0)
  const haftalikGelir = subs.filter(s => s.durum === 'abone').reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130)), 0)

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">aylık tekrarlı gelir</p>
          <h1 className="font-display text-5xl text-ink-900 tracking-tight">Abonelikler</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /><span className="font-mono">yenile</span>
        </button>
      </header>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-moss-50 border border-moss-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-moss-600">Aktif Abone</span>
            <Repeat className="w-4 h-4 text-moss-500" strokeWidth={1.5} />
          </div>
          <div className="font-display text-4xl text-moss-700">{aktif}</div>
          <p className="text-xs text-moss-500 font-mono mt-1">{toplamHaftalikAdet} adet/hafta</p>
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300">Bekleyen</span>
            <Calendar className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
          </div>
          <div className="font-display text-4xl text-ink-900">{bekleyen}</div>
          <p className="text-xs text-ink-300 font-mono mt-1">ödeme bekliyor</p>
        </div>

        <div className="bg-cream-100 border border-cream-300 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-500">Haftalık Gelir</span>
            <TrendingUp className="w-4 h-4 text-ink-500" strokeWidth={1.5} />
          </div>
          <div className="font-display text-3xl text-ink-900">{haftalikGelir.toLocaleString('tr')} <span className="text-lg text-ink-500">TL</span></div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300">Aylık Gelir</span>
            <DollarSign className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
          </div>
          <div className="font-display text-3xl text-cream-50">{toplamGelir.toLocaleString('tr')} <span className="text-lg text-ink-400">TL</span></div>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-6">
        {[{v:'all',l:'Hepsi'},{v:'abone',l:'Aktif'},{v:'bekliyor',l:'Bekleyen'}].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? 'bg-ink-900 text-cream-50' : 'bg-white border border-cream-200 text-ink-500 hover:text-ink-700'}`}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3].map(i => <div key={i} className="animate-pulse h-14 bg-cream-100 rounded-xl mx-4" />)}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-cream-50">
              <tr>
                {['Müşteri','Telefon','Ürün','Haftalık Adet','Aylık Tutar','Durum','Kayıt'].map(h => (
                  <th key={h} className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s,i) => {
                const fiyat = s.fiyat_tekil || 130
                const aylik = s.haftalik_adet * fiyat * 4
                return (
                  <tr key={s.id||i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-ink-700 font-medium">{s.ad} {s.soyad}</td>
                    <td className="px-6 py-4 font-mono text-sm text-ink-500">{s.iletisim}</td>
                    <td className="px-6 py-4 text-sm text-ink-500">{s.urun || 'Çiğ Süt'}</td>
                    <td className="px-6 py-4 font-mono text-sm text-ink-700">{s.haftalik_adet} adet</td>
                    <td className="px-6 py-4 font-mono text-sm text-ink-700 font-medium">{aylik.toLocaleString('tr')} TL</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium ${s.durum === 'abone' ? 'bg-moss-100 text-moss-700' : 'bg-cream-200 text-ink-600'}`}>
                        {s.durum === 'abone' ? '✓ Aktif' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-300 font-mono">
                      {s.created_at || s.submitted_at ? formatDistanceToNow(new Date(s.created_at || s.submitted_at!), { addSuffix: true, locale: tr }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center">
            <Repeat className="w-10 h-10 mx-auto text-cream-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-ink-500">Henüz abone yok</p>
          </div>
        )}
      </div>
    </div>
  )
}
