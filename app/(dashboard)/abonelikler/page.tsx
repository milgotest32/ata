'use client'

import { useEffect, useState } from 'react'
import { Repeat, TrendingUp, Calendar } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { tr } from 'date-fns/locale'

type Subscription = {
  id?: string
  ad: string
  soyad: string
  haftalik_adet: number
  iletisim: string
  urun?: string
  fiyat_tekil?: number
  durum: string
  created_at?: string
  submitted_at?: string
}

export default function AboneliklerPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/aboneliker')
      const data = await res.json()
      setSubs(data.subs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const aktif = subs.filter((s) => s.durum === 'abone').length
  const bekleyen = subs.filter((s) => s.durum !== 'abone').length
  const toplamGelir = subs
    .filter((s) => s.durum === 'abone')
    .reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130) * 4), 0)

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">
          aylık tekrarlı gelir
        </p>
        <h1 className="font-display text-5xl text-ink-900 tracking-tight">
          Abonelikler
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 stagger">
        <div className="bg-moss-50 border border-moss-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-moss-600">
              Aktif Abonelikler
            </span>
            <Repeat className="w-4 h-4 text-moss-500" strokeWidth={1.5} />
          </div>
          <div className="font-display text-4xl text-moss-700">{aktif}</div>
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300">
              Bekleyen Ödeme
            </span>
            <Calendar className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
          </div>
          <div className="font-display text-4xl text-ink-900">{bekleyen}</div>
        </div>

        <div className="bg-cream-100 border border-cream-300 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
              Tahmini Aylık Gelir
            </span>
            <TrendingUp className="w-4 h-4 text-ink-500" strokeWidth={1.5} />
          </div>
          <div className="font-display text-4xl text-ink-900">
            {toplamGelir.toLocaleString('tr')}{' '}
            <span className="text-xl text-ink-500">TL</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Müşteri
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Telefon
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Ürün
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Haftalık Adet
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Aylık Tutar
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Durum
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Kayıt
              </th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s, i) => {
              const fiyat = s.fiyat_tekil || 130
              const aylik = s.haftalik_adet * fiyat * 4
              return (
                <tr
                  key={s.id || i}
                  className="border-t border-cream-100 hover:bg-cream-50"
                >
                  <td className="px-6 py-4 text-sm text-ink-700">
                    {s.ad} {s.soyad}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-ink-500">
                    {s.iletisim}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-500">
                    {s.urun || 'Çiğ Süt'}
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-ink-700">
                    {s.haftalik_adet} adet
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-ink-700">
                    {aylik.toLocaleString('tr')} TL
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium ${
                        s.durum === 'abone'
                          ? 'bg-moss-100 text-moss-700'
                          : 'bg-cream-200 text-ink-700'
                      }`}
                    >
                      {s.durum === 'abone' ? 'Aktif' : 'Bekliyor'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-ink-300 font-mono">
                    {s.created_at || s.submitted_at
                      ? formatDistanceToNow(
                          new Date(s.created_at || s.submitted_at!),
                          { addSuffix: true, locale: tr }
                        )
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">
            yükleniyor...
          </div>
        )}
        {!loading && subs.length === 0 && (
          <div className="p-12 text-center">
            <Repeat
              className="w-10 h-10 mx-auto text-cream-300 mb-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-ink-500">Henüz abone yok</p>
          </div>
        )}
      </div>
    </div>
  )
}
