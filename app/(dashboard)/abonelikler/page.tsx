'use client'

import { useEffect, useState } from 'react'
import { Repeat, TrendingUp, Calendar, RefreshCw, DollarSign, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, nextFriday, addWeeks, startOfDay, differenceInWeeks, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'

type Subscription = {
  id?: string; ad: string; soyad: string; haftalik_adet: number
  iletisim: string; urun?: string; fiyat_tekil?: number
  durum: string; created_at?: string; submitted_at?: string
}

type AbonenTeslimat = {
  sub: Subscription
  ilkCuma: Date
  teslimatlar: Date[]
  kacincıHafta: number // 1-4, 5+ = bitti/yenileme
  sonrakiTeslimat: Date | null
  durum: 'devam' | 'sonHafta' | 'yenileme' | 'bitti'
}

function ilkTeslimatCumasi(created_at: string): Date {
  const kayit = startOfDay(new Date(created_at))
  // Kayıt Cuma ise o gün, değilse sonraki Cuma
  if (kayit.getDay() === 5) return kayit
  return nextFriday(kayit)
}

function hesaplaTeslimat(sub: Subscription): AbonenTeslimat {
  const baslangic = sub.created_at || sub.submitted_at || new Date().toISOString()
  const ilkCuma = ilkTeslimatCumasi(baslangic)
  const teslimatlar = Array.from({ length: 4 }, (_, i) => addWeeks(ilkCuma, i))
  const bugun = startOfDay(new Date())
  const kacincıHafta = differenceInWeeks(bugun, ilkCuma) + 1

  const sonrakiTeslimat = teslimatlar.find(t => t >= bugun) || null

  let durum: AbonenTeslimat['durum'] = 'devam'
  if (kacincıHafta >= 4 && !sonrakiTeslimat) durum = 'bitti'
  else if (kacincıHafta === 4) durum = 'sonHafta'
  else if (kacincıHafta > 4) durum = 'yenileme'

  return { sub, ilkCuma, teslimatlar, kacincıHafta: Math.min(kacincıHafta, 4), sonrakiTeslimat, durum }
}

function getHaftaninCumalari(adet = 6): Date[] {
  const bugun = startOfDay(new Date())
  let ilkCuma = bugun.getDay() === 5 ? bugun : nextFriday(bugun)
  return Array.from({ length: adet }, (_, i) => addWeeks(ilkCuma, i))
}

export default function AboneliklerPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'liste' | 'takvim'>('liste')
  const [filter, setFilter] = useState<'all' | 'abone' | 'bekliyor'>('all')

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

  const aktifSubs = subs.filter(s => s.durum === 'abone')
  const filtered = filter === 'all' ? subs : subs.filter(s => s.durum === filter)
  const aktif = aktifSubs.length
  const bekleyen = subs.filter(s => s.durum !== 'abone').length
  const toplamHaftalikAdet = aktifSubs.reduce((sum, s) => sum + s.haftalik_adet, 0)
  const toplamGelir = aktifSubs.reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130) * 4), 0)
  const haftalikGelir = aktifSubs.reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130)), 0)

  const teslimatBilgileri = aktifSubs.map(hesaplaTeslimat)
  const yenilemeGereken = teslimatBilgileri.filter(t => t.durum === 'sonHafta' || t.durum === 'yenileme' || t.durum === 'bitti')
  const cumalar = getHaftaninCumalari(6)

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">aylık · her cuma · 4 teslimat</p>
          <h1 className="font-display text-5xl text-ink-900 tracking-tight">Abonelikler</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /><span className="font-mono">yenile</span>
        </button>
      </header>

      {/* Yenileme uyarısı */}
      {yenilemeGereken.length > 0 && (
        <div className="mb-6 bg-ember-50 border border-ember-200 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-ember-500 shrink-0" strokeWidth={1.5} />
            <span className="text-ember-700 font-medium text-sm">{yenilemeGereken.length} abonelik yenileme gerektiriyor</span>
          </div>
          <div className="space-y-2">
            {yenilemeGereken.map(({ sub, durum, kacincıHafta }) => (
              <div key={sub.id || sub.iletisim} className="flex items-center justify-between bg-white border border-ember-100 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-ink-700">{sub.iletisim}</span>
                  <span className="text-sm text-ink-500">{sub.ad} {sub.soyad}</span>
                </div>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium uppercase tracking-wide ${
                  durum === 'bitti' ? 'bg-ember-100 text-ember-700' :
                  durum === 'yenileme' ? 'bg-ember-100 text-ember-700' :
                  'bg-cream-200 text-ink-600'
                }`}>
                  {durum === 'bitti' ? 'Bitti · Yenile' : durum === 'yenileme' ? 'Yenileme Zamanı' : `${kacincıHafta}/4 · Son Teslimat`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

      {/* Tab */}
      <div className="flex gap-2 mb-6">
        <div className="flex bg-white border border-cream-200 rounded-xl p-1 gap-1">
          {[{v:'liste',l:'Abone Listesi'},{v:'takvim',l:'Teslimat Takvimi'}].map(t => (
            <button key={t.v} onClick={() => setTab(t.v as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
              {t.l}
            </button>
          ))}
        </div>
        {tab === 'liste' && (
          <div className="flex bg-white border border-cream-200 rounded-xl p-1 gap-1">
            {[{v:'all',l:'Hepsi'},{v:'abone',l:'Aktif'},{v:'bekliyor',l:'Bekleyen'}].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f.v ? 'bg-moss-700 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
                {f.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
      {tab === 'liste' && (
        <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="animate-pulse h-14 bg-cream-100 rounded-xl mx-4" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-cream-50">
                <tr>
                  {['Müşteri','Telefon','Ürün','Haftalık Adet','Aylık Tutar','Hafta','Durum','Kayıt'].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const fiyat = s.fiyat_tekil || 130
                  const aylik = s.haftalik_adet * fiyat * 4
                  const bilgi = s.durum === 'abone' ? hesaplaTeslimat(s) : null
                  return (
                    <tr key={s.id || i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-ink-700 font-medium">{s.ad} {s.soyad}</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-500">{s.iletisim}</td>
                      <td className="px-5 py-4 text-sm text-ink-500">{s.urun || 'Çiğ Süt'}</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-700">{s.haftalik_adet} adet</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-700 font-medium">{aylik.toLocaleString('tr')} TL</td>
                      <td className="px-5 py-4">
                        {bilgi ? (
                          <div className="flex gap-1">
                            {[1,2,3,4].map(h => (
                              <div key={h} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                h < bilgi.kacincıHafta ? 'bg-moss-500 text-white' :
                                h === bilgi.kacincıHafta ? 'bg-ink-900 text-white' :
                                'bg-cream-200 text-ink-400'
                              }`}>{h}</div>
                            ))}
                          </div>
                        ) : <span className="text-ink-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {bilgi ? (
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium ${
                            bilgi.durum === 'bitti' || bilgi.durum === 'yenileme' ? 'bg-ember-100 text-ember-700' :
                            bilgi.durum === 'sonHafta' ? 'bg-cream-200 text-ink-600' :
                            'bg-moss-100 text-moss-700'
                          }`}>
                            {bilgi.durum === 'bitti' ? 'Yenile' : bilgi.durum === 'yenileme' ? 'Yenileme' : bilgi.durum === 'sonHafta' ? 'Son Hafta' : '✓ Aktif'}
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium bg-cream-200 text-ink-600">Bekliyor</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-300 font-mono">
                        {s.created_at ? format(new Date(s.created_at), 'd MMM yyyy', { locale: tr }) : '—'}
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
      )}

      {/* Takvim */}
      {tab === 'takvim' && (
        <div className="space-y-4">
          {cumalar.map((cuma, idx) => {
            // Bu Cumada teslimat yapılacak aboneler
            const buCumadakiler = teslimatBilgileri.filter(t =>
              t.teslimatlar.some(td => isSameDay(td, cuma))
            )
            const toplamAdet = buCumadakiler.reduce((sum, t) => sum + t.sub.haftalik_adet, 0)
            const toplamTutar = buCumadakiler.reduce((sum, t) => sum + (t.sub.haftalik_adet * (t.sub.fiyat_tekil || 130)), 0)
            const isThisWeek = idx === 0

            return (
              <div key={cuma.toISOString()} className={`bg-white border rounded-2xl overflow-hidden ${isThisWeek ? 'border-moss-300 shadow-sm' : 'border-cream-200'}`}>
                {/* Cuma başlığı */}
                <div className={`px-6 py-4 flex items-center justify-between ${isThisWeek ? 'bg-moss-50' : 'bg-cream-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isThisWeek ? 'bg-moss-200' : 'bg-cream-200'}`}>
                      <Truck className={`w-4 h-4 ${isThisWeek ? 'text-moss-700' : 'text-ink-400'}`} strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium text-sm ${isThisWeek ? 'text-moss-900' : 'text-ink-700'}`}>
                          {format(cuma, "d MMMM yyyy, EEEE", { locale: tr })}
                        </span>
                        {isThisWeek && <span className="text-[10px] bg-moss-500 text-white px-2 py-0.5 rounded-full font-medium">Bu Hafta</span>}
                      </div>
                      <span className="text-xs text-ink-400 font-mono">
                        {buCumadakiler.length} abone · {toplamAdet} adet · {toplamTutar.toLocaleString('tr')} TL
                      </span>
                    </div>
                  </div>
                  {buCumadakiler.length === 0 && (
                    <span className="text-xs text-ink-300 font-mono">teslimat yok</span>
                  )}
                </div>

                {/* Aboneler */}
                {buCumadakiler.length > 0 && (
                  <div className="divide-y divide-cream-100">
                    {buCumadakiler.map(({ sub, kacincıHafta, durum }) => (
                      <div key={sub.id || sub.iletisim} className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {[1,2,3,4].map(h => (
                              <div key={h} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                h < kacincıHafta ? 'bg-moss-400 text-white' :
                                h === kacincıHafta ? 'bg-ink-900 text-white' :
                                'bg-cream-200 text-ink-300'
                              }`}>{h}</div>
                            ))}
                          </div>
                          <div>
                            <span className="text-sm text-ink-700 font-medium">{sub.ad} {sub.soyad}</span>
                            <span className="text-xs text-ink-400 font-mono ml-2">{sub.iletisim}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-ink-700 font-mono">{sub.haftalik_adet} adet</span>
                          <span className="text-sm text-ink-500 font-mono">{(sub.haftalik_adet * (sub.fiyat_tekil || 130)).toLocaleString('tr')} TL</span>
                          {durum === 'sonHafta' && (
                            <span className="text-[10px] bg-ember-100 text-ember-600 px-2 py-0.5 rounded-full font-medium">Son Teslimat</span>
                          )}
                          {durum === 'devam' && (
                            <CheckCircle2 className="w-4 h-4 text-moss-400" strokeWidth={1.5} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
