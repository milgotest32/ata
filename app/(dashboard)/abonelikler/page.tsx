'use client'

import { useEffect, useState } from 'react'
import { Repeat, TrendingUp, Calendar, RefreshCw, DollarSign, Truck, AlertTriangle, CheckCircle2, Droplets, TrendingDown, Send, MessageSquare } from 'lucide-react'
import { format, nextFriday, addWeeks, startOfDay, differenceInWeeks, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'

type Subscription = {
  id?: string; ad: string; soyad: string; haftalik_adet: number
  iletisim: string; urun?: string; fiyat_tekil?: number
  durum: string; created_at?: string; submitted_at?: string
  adres?: string; ilce?: string; sehir?: string
}

type AbonenTeslimat = {
  sub: Subscription
  ilkCuma: Date
  teslimatlar: Date[]
  kacincıHafta: number
  sonrakiTeslimat: Date | null
  durum: 'devam' | 'sonHafta' | 'yenileme' | 'bitti'
}

function ilkTeslimatCumasi(created_at: string): Date {
  const kayit = startOfDay(new Date(created_at))
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
  const [tab, setTab] = useState<'liste' | 'takvim' | 'planlama' | 'churn'>('liste')
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
  const haftalikGelir = aktifSubs.reduce((sum, s) => sum + (s.haftalik_adet * (s.fiyat_tekil || 130)), 0)
  const aylikGelir = haftalikGelir * 4
  const teslimatBilgileri = aktifSubs.map(hesaplaTeslimat)
  const yenilemeGereken = teslimatBilgileri.filter(t => t.durum === 'sonHafta' || t.durum === 'yenileme' || t.durum === 'bitti')
  const cumalar = getHaftaninCumalari(8)

  // 7. Gelir tahmini — önümüzdeki 3 ay
  const buAyGelir = aylikGelir
  const yenilemeOrani = aktif > 0 ? (aktif - yenilemeGereken.length) / aktif : 0.8
  const gelirTahmini = [
    { ay: 'Bu Ay', gelir: buAyGelir, abone: aktif },
    { ay: 'Gelecek Ay', gelir: Math.round(buAyGelir * yenilemeOrani * 1.05), abone: Math.round(aktif * yenilemeOrani * 1.05) },
    { ay: '2. Ay', gelir: Math.round(buAyGelir * yenilemeOrani * 1.1), abone: Math.round(aktif * yenilemeOrani * 1.1) },
    { ay: '3. Ay', gelir: Math.round(buAyGelir * yenilemeOrani * 1.15), abone: Math.round(aktif * yenilemeOrani * 1.15) },
  ]

  // 8. Teslimat planlama — her Cuma kaç litre
  const teslimatPlan = cumalar.map(cuma => {
    const buCumadakiler = teslimatBilgileri.filter(t => t.teslimatlar.some(td => isSameDay(td, cuma)))
    const toplamAdet = buCumadakiler.reduce((sum, t) => sum + t.sub.haftalik_adet, 0)
    return {
      tarih: cuma,
      adet: toplamAdet,
      litre: toplamAdet * 2, // 2L paket
      aboneSayisi: buCumadakiler.length,
      tutar: buCumadakiler.reduce((sum, t) => sum + (t.sub.haftalik_adet * (t.sub.fiyat_tekil || 130)), 0)
    }
  })

  // 9. Churn takibi — 4. haftasını bitirmiş ama yenilememiş
  const churnRisk = teslimatBilgileri.filter(t => t.durum === 'bitti' || t.durum === 'yenileme')
  const churnOrani = aktif > 0 ? Math.round((churnRisk.length / aktif) * 100) : 0

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 md:mb-8 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">aylık · her cuma · 4 teslimat</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Abonelikler</h1>
        </div>
        <div className="flex items-center gap-3">
          <a href="/api/teslimat-pdf" target="_blank"
            className="flex items-center gap-2 text-xs px-3 py-2 bg-ink-900 text-cream-50 rounded-xl hover:bg-ink-700 transition-colors">
            🖨️ Yazdır
          </a>
          <button onClick={load} className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-700">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Yenileme uyarısı */}
      {yenilemeGereken.length > 0 && (
        <div className="mb-4 bg-ember-50 border border-ember-200 rounded-2xl px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-ember-500 shrink-0" strokeWidth={1.5} />
            <span className="text-ember-700 font-medium text-sm">{yenilemeGereken.length} abonelik yenileme gerektiriyor</span>
          </div>
          <div className="space-y-1.5">
            {yenilemeGereken.map(({ sub, durum, kacincıHafta }) => (
              <div key={sub.id || sub.iletisim} className="flex items-center justify-between bg-white border border-ember-100 rounded-xl px-3 py-2">
                <span className="font-mono text-xs text-ink-700">{sub.iletisim} — {sub.ad} {sub.soyad}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${durum === 'bitti' || durum === 'yenileme' ? 'bg-ember-100 text-ember-700' : 'bg-cream-200 text-ink-600'}`}>
                  {durum === 'bitti' ? 'Bitti' : durum === 'yenileme' ? 'Yenileme' : `${kacincıHafta}/4 Son`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-moss-50 border border-moss-200 rounded-2xl p-4 md:p-6">
          <div className="flex items-start justify-between mb-3"><span className="text-xs uppercase tracking-[0.2em] text-moss-600">Aktif Abone</span><Repeat className="w-4 h-4 text-moss-500" strokeWidth={1.5} /></div>
          <div className="font-display text-3xl md:text-4xl text-moss-700">{aktif}</div>
          <p className="text-xs text-moss-500 font-mono mt-1">{toplamHaftalikAdet} adet/hafta</p>
        </div>
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <div className="flex items-start justify-between mb-3"><span className="text-xs uppercase tracking-[0.2em] text-ink-300">Bekleyen</span><Calendar className="w-4 h-4 text-ink-300" strokeWidth={1.5} /></div>
          <div className="font-display text-3xl md:text-4xl text-ink-900">{bekleyen}</div>
          <p className="text-xs text-ink-300 font-mono mt-1">ödeme bekliyor</p>
        </div>
        <div className="bg-cream-100 border border-cream-300 rounded-2xl p-4 md:p-6">
          <div className="flex items-start justify-between mb-3"><span className="text-xs uppercase tracking-[0.2em] text-ink-500">Haftalık</span><TrendingUp className="w-4 h-4 text-ink-500" strokeWidth={1.5} /></div>
          <div className="font-display text-2xl md:text-3xl text-ink-900">{haftalikGelir.toLocaleString('tr')} <span className="text-base text-ink-500">TL</span></div>
        </div>
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-4 md:p-6">
          <div className="flex items-start justify-between mb-3"><span className="text-xs uppercase tracking-[0.2em] text-ink-300">Aylık</span><DollarSign className="w-4 h-4 text-ink-300" strokeWidth={1.5} /></div>
          <div className="font-display text-2xl md:text-3xl text-cream-50">{aylikGelir.toLocaleString('tr')} <span className="text-base text-ink-400">TL</span></div>
        </div>
      </div>

      {/* Tablar */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-white border border-cream-200 rounded-xl p-1">
        {[
          { v: 'liste', l: 'Abone Listesi' },
          { v: 'takvim', l: 'Teslimat Takvimi' },
          { v: 'planlama', l: '📦 Teslimat Planı' },
          { v: 'churn', l: '📉 Churn Takibi' },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all ${tab === t.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Liste */}
      {tab === 'liste' && (
        <>
          <div className="flex gap-2 mb-4">
            {[{v:'all',l:'Hepsi'},{v:'abone',l:'Aktif'},{v:'bekliyor',l:'Bekleyen'}].map(f => (
              <button key={f.v} onClick={() => setFilter(f.v as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.v ? 'bg-moss-700 text-cream-50' : 'bg-white border border-cream-200 text-ink-500'}`}>
                {f.l}
              </button>
            ))}
          </div>
          <div className="space-y-2 md:hidden">
            {filtered.map((s, i) => {
              const bilgi = s.durum === 'abone' ? hesaplaTeslimat(s) : null
              return (
                <div key={s.id || i} className="bg-white border border-cream-200 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{s.ad} {s.soyad}</div>
                      <div className="font-mono text-xs text-ink-400">{s.iletisim}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.durum === 'abone' ? 'bg-moss-100 text-moss-700' : 'bg-cream-200 text-ink-600'}`}>
                      {s.durum === 'abone' ? '✓ Aktif' : 'Bekliyor'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {bilgi && [1,2,3,4].map(h => (
                        <div key={h} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${h < bilgi.kacincıHafta ? 'bg-moss-500 text-white' : h === bilgi.kacincıHafta ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-400'}`}>{h}</div>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono text-ink-700">{s.haftalik_adet} adet/hafta</div>
                      <div className="text-xs font-mono text-ink-400">{(s.haftalik_adet * (s.fiyat_tekil || 130) * 4).toLocaleString('tr')} TL/ay</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="hidden md:block bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-cream-50">
                <tr>{['Müşteri','Telefon','Haftalık Adet','Aylık Tutar','Hafta','Durum','Kayıt'].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const bilgi = s.durum === 'abone' ? hesaplaTeslimat(s) : null
                  return (
                    <tr key={s.id || i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-ink-700 font-medium">{s.ad} {s.soyad}</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-500">{s.iletisim}</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-700">{s.haftalik_adet} adet</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-700">{(s.haftalik_adet * (s.fiyat_tekil || 130) * 4).toLocaleString('tr')} TL</td>
                      <td className="px-5 py-4">
                        {bilgi ? <div className="flex gap-1">{[1,2,3,4].map(h => <div key={h} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${h < bilgi.kacincıHafta ? 'bg-moss-500 text-white' : h === bilgi.kacincıHafta ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-400'}`}>{h}</div>)}</div> : <span className="text-ink-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium ${
                          bilgi?.durum === 'bitti' || bilgi?.durum === 'yenileme' ? 'bg-ember-100 text-ember-700' :
                          bilgi?.durum === 'sonHafta' ? 'bg-cream-200 text-ink-600' :
                          s.durum === 'abone' ? 'bg-moss-100 text-moss-700' : 'bg-cream-200 text-ink-600'
                        }`}>
                          {bilgi?.durum === 'bitti' ? 'Yenile' : bilgi?.durum === 'yenileme' ? 'Yenileme' : bilgi?.durum === 'sonHafta' ? 'Son Hafta' : s.durum === 'abone' ? '✓ Aktif' : 'Bekliyor'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-300 font-mono">{s.created_at ? format(new Date(s.created_at), 'd MMM yyyy', { locale: tr }) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="p-12 text-center"><Repeat className="w-8 h-8 mx-auto text-cream-300 mb-2" strokeWidth={1.5} /><p className="text-sm text-ink-500">Henüz abone yok</p></div>}
          </div>
        </>
      )}

      {/* Takvim */}
      {tab === 'takvim' && (
        <div className="space-y-3">
          {cumalar.map((cuma, idx) => {
            const buCumadakiler = teslimatBilgileri.filter(t => t.teslimatlar.some(td => isSameDay(td, cuma)))
            const toplamAdet = buCumadakiler.reduce((sum, t) => sum + t.sub.haftalik_adet, 0)
            const toplamTutar = buCumadakiler.reduce((sum, t) => sum + (t.sub.haftalik_adet * (t.sub.fiyat_tekil || 130)), 0)
            const isThisWeek = idx === 0
            return (
              <div key={cuma.toISOString()} className={`bg-white border rounded-2xl overflow-hidden ${isThisWeek ? 'border-moss-300' : 'border-cream-200'}`}>
                <div className={`px-4 md:px-6 py-3 md:py-4 flex items-center justify-between ${isThisWeek ? 'bg-moss-50' : 'bg-cream-50'}`}>
                  <div className="flex items-center gap-3">
                    <Truck className={`w-4 h-4 shrink-0 ${isThisWeek ? 'text-moss-600' : 'text-ink-400'}`} strokeWidth={1.5} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${isThisWeek ? 'text-moss-900' : 'text-ink-700'}`}>
                          {format(cuma, "d MMMM, EEEE", { locale: tr })}
                        </span>
                        {isThisWeek && <span className="text-[10px] bg-moss-500 text-white px-2 py-0.5 rounded-full">Bu Hafta</span>}
                      </div>
                      <span className="text-xs text-ink-400 font-mono">{buCumadakiler.length} abone · {toplamAdet} adet · {toplamTutar.toLocaleString('tr')} TL</span>
                    </div>
                  </div>
                </div>
                {buCumadakiler.length > 0 && (
                  <div className="divide-y divide-cream-100">
                    {buCumadakiler.map(({ sub, kacincıHafta, durum }) => (
                      <div key={sub.id || sub.iletisim} className="px-4 md:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            {[1,2,3,4].map(h => <div key={h} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${h < kacincıHafta ? 'bg-moss-400 text-white' : h === kacincıHafta ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-300'}`}>{h}</div>)}
                          </div>
                          <div>
                            <span className="text-sm text-ink-700 font-medium">{sub.ad} {sub.soyad}</span>
                            <span className="text-xs text-ink-400 font-mono ml-2 hidden md:inline">{sub.iletisim}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-ink-700">{sub.haftalik_adet} adet</span>
                          {durum === 'sonHafta' && <span className="text-[10px] bg-ember-100 text-ember-600 px-2 py-0.5 rounded-full hidden md:block">Son</span>}
                          {durum === 'devam' && <CheckCircle2 className="w-4 h-4 text-moss-400" strokeWidth={1.5} />}
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

      {/* 8. Teslimat Planlama */}
      {tab === 'planlama' && (
        <div className="space-y-4">
          {/* Bildirim gönder */}
          <BildirimPanel aktifSubs={aktifSubs} teslimatPlan={teslimatPlan} />

          <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6 mb-4">
            <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-1">Teslimat Planı</h2>
            <p className="text-xs text-ink-400 font-mono mb-6">Her Cuma için hazırlanması gereken litre miktarı</p>
            <div className="space-y-3">
              {teslimatPlan.map((plan, idx) => {
                const maxLitre = Math.max(...teslimatPlan.map(p => p.litre), 1)
                const isThisWeek = idx === 0
                return (
                  <div key={plan.tarih.toISOString()} className={`rounded-2xl p-4 border ${isThisWeek ? 'bg-moss-50 border-moss-200' : 'bg-white border-cream-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isThisWeek ? 'text-moss-900' : 'text-ink-700'}`}>
                            {format(plan.tarih, "d MMMM, EEEE", { locale: tr })}
                          </span>
                          {isThisWeek && <span className="text-[10px] bg-moss-500 text-white px-2 py-0.5 rounded-full">Bu Hafta</span>}
                        </div>
                        <span className="text-xs text-ink-400 font-mono">{plan.aboneSayisi} abone · {plan.tutar.toLocaleString('tr')} TL</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Droplets className={`w-4 h-4 ${isThisWeek ? 'text-moss-600' : 'text-ink-400'}`} strokeWidth={1.5} />
                          <span className={`font-display text-2xl ${isThisWeek ? 'text-moss-700' : 'text-ink-900'}`}>{plan.litre}L</span>
                        </div>
                        <span className="text-xs text-ink-400 font-mono">{plan.adet} paket</span>
                      </div>
                    </div>
                    <div className="h-2 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(plan.litre / maxLitre) * 100}%`, background: isThisWeek ? '#7c9059' : '#a8b885' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Gelir tahmini — 7. madde */}
          <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
            <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-1">Gelir Tahmini</h2>
            <p className="text-xs text-ink-400 font-mono mb-6">Mevcut yenileme oranına göre 3 aylık projeksiyon</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gelirTahmini.map((g, i) => (
                <div key={g.ay} className={`rounded-2xl p-4 border ${i === 0 ? 'bg-ink-900 border-ink-700' : 'bg-cream-50 border-cream-200'}`}>
                  <div className={`text-[10px] uppercase tracking-[0.2em] mb-2 ${i === 0 ? 'text-ink-300' : 'text-ink-400'}`}>{g.ay}</div>
                  <div className={`font-display text-xl md:text-2xl mb-1 ${i === 0 ? 'text-cream-50' : 'text-ink-900'}`}>{g.gelir.toLocaleString('tr')} <span className={`text-sm ${i === 0 ? 'text-ink-400' : 'text-ink-400'}`}>TL</span></div>
                  <div className={`text-xs font-mono ${i === 0 ? 'text-ink-400' : 'text-ink-300'}`}>{g.abone} abone</div>
                  {i > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-moss-500" strokeWidth={2} />
                      <span className="text-[10px] text-moss-600 font-mono">+{Math.round((g.gelir / gelirTahmini[0].gelir - 1) * 100)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-300 font-mono mt-4">* Tahmin %{Math.round(yenilemeOrani * 100)} yenileme oranı ve %5 büyüme varsayımına dayanır</p>
          </div>
        </div>
      )}

      {/* 9. Churn Takibi */}
      {tab === 'churn' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-ember-50 border border-ember-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-ember-600">Churn Riski</span>
                <TrendingDown className="w-4 h-4 text-ember-500" strokeWidth={1.5} />
              </div>
              <div className="font-display text-4xl text-ember-700">{churnRisk.length}</div>
              <p className="text-xs text-ember-500 font-mono mt-1">yenileme gerekiyor</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-ink-400">Churn Oranı</span>
                <AlertTriangle className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
              </div>
              <div className={`font-display text-4xl ${churnOrani > 30 ? 'text-ember-600' : churnOrani > 15 ? 'text-cream-600' : 'text-moss-600'}`}>%{churnOrani}</div>
              <p className="text-xs text-ink-300 font-mono mt-1">{churnOrani > 30 ? 'yüksek risk' : churnOrani > 15 ? 'orta risk' : 'düşük risk'}</p>
            </div>
            <div className="bg-moss-50 border border-moss-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs uppercase tracking-[0.2em] text-moss-600">Aktif Kalan</span>
                <CheckCircle2 className="w-4 h-4 text-moss-500" strokeWidth={1.5} />
              </div>
              <div className="font-display text-4xl text-moss-700">{aktif - churnRisk.length}</div>
              <p className="text-xs text-moss-500 font-mono mt-1">sağlıklı abone</p>
            </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-cream-100 bg-cream-50">
              <h2 className="font-display text-xl text-ink-900">Churn Riski Yüksek Aboneler</h2>
              <p className="text-xs text-ink-400 font-mono mt-0.5">4. haftasını bitirmiş veya yenileme zamanı geçmiş</p>
            </div>
            {churnRisk.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto text-moss-300 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-ink-500 font-medium">Harika! Churn riski yok</p>
                <p className="text-xs text-ink-300 mt-1">Tüm aboneler aktif döngüde</p>
              </div>
            ) : (
              <div className="divide-y divide-cream-100">
                {churnRisk.map(({ sub, durum, kacincıHafta, ilkCuma }) => {
                  const sonTeslimat = addWeeks(ilkCuma, 3)
                  const bekleyenGun = Math.max(0, Math.floor((new Date().getTime() - sonTeslimat.getTime()) / 86400000))
                  return (
                    <div key={sub.id || sub.iletisim} className="px-4 md:px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${durum === 'bitti' ? 'bg-ember-100 text-ember-700' : 'bg-cream-200 text-ink-600'}`}>
                          {sub.ad[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-ink-900">{sub.ad} {sub.soyad}</div>
                          <div className="text-xs text-ink-400 font-mono">{sub.iletisim}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${durum === 'bitti' ? 'bg-ember-100 text-ember-700' : 'bg-cream-200 text-ink-600'}`}>
                          {durum === 'bitti' ? `${bekleyenGun} gün önce bitti` : 'Yenileme Zamanı'}
                        </span>
                        <div className="text-xs text-ink-300 font-mono mt-1">
                          Son teslimat: {format(sonTeslimat, "d MMM", { locale: tr })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BildirimPanel({ aktifSubs, teslimatPlan }: { aktifSubs: any[], teslimatPlan: any[] }) {
  const [mesaj, setMesaj] = useState('')
  const [gonderiyor, setGonderiyor] = useState(false)
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null)
  const [onay, setOnay] = useState(false)
  const [gonderildi, setGonderildi] = useState(false)
  const [mevcutLog, setMevcutLog] = useState<any>(null)

  const buHaftaPlan = teslimatPlan[0]
  const buHaftaAboneler = aktifSubs.filter(s => s.durum === 'abone')

  const varsayilanMesaj = `Merhaba! 🥛\nBu Cuma (${format(buHaftaPlan?.tarih || new Date(), 'd MMMM', { locale: tr })}) teslimatınız saat 10:00-14:00 arası yapılacaktır.\nSorularınız için bize yazabilirsiniz. İyi günler! 🌿`

  useEffect(() => { setMesaj(varsayilanMesaj) }, [buHaftaPlan?.tarih])

  useEffect(() => {
    // Bu hafta gönderildi mi kontrol et
    fetch('/api/bildirim/toplu').then(r => r.json()).then(d => {
      if (d.gonderildi) { setGonderildi(true); setMevcutLog(d.log) }
    })
  }, [])

  async function gonder() {
    if (!onay) { setSonuc({ ok: false, mesaj: 'Lütfen onay kutusunu işaretleyin.' }); return }
    setGonderiyor(true)
    setSonuc(null)
    try {
      const res = await fetch('/api/bildirim/toplu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesaj,
          telefonlar: buHaftaAboneler.map(s => ({ telefon: s.iletisim, ad: s.ad, adet: s.haftalik_adet }))
        })
      })
      const data = await res.json()
      setSonuc({ ok: data.ok, mesaj: data.mesaj || (data.ok ? 'Bildirimler gönderildi!' : 'Hata oluştu.') })
      setOnay(false)
    } catch {
      setSonuc({ ok: false, mesaj: 'Bağlantı hatası.' })
    }
    setGonderiyor(false)
  }

  return (
    <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-moss-100 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-moss-600" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="font-display text-xl text-ink-900">Teslimat Bildirimi Gönder</h2>
          <p className="text-xs text-ink-400 font-mono">{buHaftaAboneler.length} aktif aboneye WhatsApp mesajı</p>
        </div>
      </div>

      {/* Daha önce gönderildiyse uyarı */}
      {gonderildi && mevcutLog && (
        <div className="mb-4 p-4 bg-moss-50 border border-moss-200 rounded-xl">
          <p className="text-sm text-moss-700 font-medium">✅ Bu hafta bildirim gönderildi</p>
          <p className="text-xs text-moss-600 font-mono mt-1">{mevcutLog.gonderilen_sayi} kişiye · {new Date(mevcutLog.created_at).toLocaleString('tr')}</p>
          <p className="text-xs text-moss-500 mt-2">Tekrar göndermek için Supabase'de <span className="font-mono">bildirim_log</span> tablosundan bu haftanın kaydını silin.</p>
        </div>
      )}

      {/* Alıcılar */}
      <div className="bg-cream-50 border border-cream-200 rounded-xl p-3 mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-2">Alıcılar ({buHaftaAboneler.length})</p>
        <div className="flex flex-wrap gap-2">
          {buHaftaAboneler.map(s => (
            <span key={s.iletisim} className="text-xs bg-white border border-cream-200 px-2.5 py-1 rounded-full text-ink-600 font-mono">
              {s.ad} · {s.iletisim}
            </span>
          ))}
          {buHaftaAboneler.length === 0 && <span className="text-xs text-ink-300">Bu hafta teslimat yok</span>}
        </div>
      </div>

      {/* Mesaj */}
      <div className="mb-4">
        <label className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-2 block">Mesaj</label>
        <textarea
          value={mesaj}
          onChange={e => setMesaj(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-cream-50 border border-cream-200 rounded-xl text-sm text-ink-700 focus:outline-none focus:border-moss-400 transition-colors resize-none font-mono"
        />
        <p className="text-[10px] text-ink-300 font-mono mt-1">{mesaj.length} karakter</p>
      </div>

      {/* Onay */}
      <label className="flex items-center gap-3 cursor-pointer mb-4 p-3 bg-cream-50 border border-cream-200 rounded-xl">
        <input type="checkbox" checked={onay} onChange={e => setOnay(e.target.checked)} className="w-4 h-4 accent-moss-600" />
        <span className="text-sm text-ink-600">{buHaftaAboneler.length} kişiye WhatsApp mesajı gönderileceğini onaylıyorum</span>
      </label>

      {/* Sonuç */}
      {sonuc && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${sonuc.ok ? 'bg-moss-50 border border-moss-200 text-moss-700' : 'bg-ember-50 border border-ember-200 text-ember-700'}`}>
          {sonuc.ok ? '✅' : '❌'} {sonuc.mesaj}
        </div>
      )}

      <button
        onClick={gonder}
        disabled={gonderiyor || buHaftaAboneler.length === 0 || gonderildi}
        className="w-full flex items-center justify-center gap-2 py-3 bg-ink-900 text-cream-50 rounded-xl text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-40"
      >
        {gonderiyor ? (
          <div className="w-4 h-4 border-2 border-cream-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {gonderildi ? 'Bu Hafta Gönderildi ✅' : gonderiyor ? 'Gönderiliyor...' : `${buHaftaAboneler.length} Kişiye Bildirim Gönder`}
      </button>
    </div>
  )
}
