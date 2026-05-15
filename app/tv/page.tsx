'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfDay, subDays, nextFriday } from 'date-fns'
import { tr } from 'date-fns/locale'

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama', products: 'Ürün Listesi', subscription: 'Abonelik',
  human_handover: 'Canlı Destek', complaint: 'Şikayet', order_create: 'Sipariş',
  product_detail: 'Ürün Detay', order_status: 'Sipariş Durumu',
  brand_info: 'Marka', usage_question: 'Kullanım', other: 'Diğer'
}

const INTENT_COLOR: Record<string, string> = {
  greeting: '#7c9059', products: '#a8b885', subscription: '#d97757',
  human_handover: '#c4633f', complaint: '#a64d2e', order_create: '#c4a154',
  product_detail: '#cfd9b4', order_status: '#d9c07a', other: '#928c79'
}

export default function TvPage() {
  const [now, setNow] = useState(new Date())
  const [stats, setStats] = useState({ toplam: 0, bugun: 0, dun: 0, buHafta: 0, canli: 0, kvkk: 0, bot: 0 })
  const [sonMesajlar, setSonMesajlar] = useState<any[]>([])
  const [intents, setIntents] = useState<{ intent: string; count: number }[]>([])
  const [aboneler, setAboneler] = useState<any[]>([])
  const [saatlik, setSaatlik] = useState<{ saat: string; sayi: number }[]>([])
  const [yenilemeGeri, setYenilemeGeri] = useState(30)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => { load(); setYenilemeGeri(30) }, 30000)
    const t2 = setInterval(() => setYenilemeGeri(v => Math.max(0, v - 1)), 1000)
    return () => { clearInterval(t); clearInterval(t2) }
  }, [])

  async function load() {
    const { data } = await supabase.from('wa_sessions').select('*').order('updated_at', { ascending: false }).limit(500)
    const list = data || []
    const today = startOfDay(new Date())
    const yesterday = startOfDay(subDays(new Date(), 1))
    const weekStart = startOfDay(subDays(new Date(), 7))

    const bugun = list.filter((s: any) => new Date(s.updated_at) >= today).length
    const dun = list.filter((s: any) => new Date(s.updated_at) >= yesterday && new Date(s.updated_at) < today).length
    const buHafta = list.filter((s: any) => new Date(s.updated_at) >= weekStart).length
    const canli = list.filter((s: any) => s.bulundugu_menu === 'canli' || s.last_intent === 'human_handover').length
    const bot = list.filter((s: any) => s.bulundugu_menu === 'gpt').length
    const kvkkOnay = list.filter((s: any) => s.kvkk_onay).length
    const kvkk = list.length ? Math.round(kvkkOnay / list.length * 100) : 0

    setStats({ toplam: list.length, bugun, dun, buHafta, canli, kvkk, bot })
    setSonMesajlar(list.slice(0, 10))

    // Intent dağılımı
    const intentMap: Record<string, number> = {}
    list.forEach((s: any) => { const i = s.last_intent || 'other'; intentMap[i] = (intentMap[i] || 0) + 1 })
    setIntents(Object.entries(intentMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([intent, count]) => ({ intent, count })))

    // Saatlik trafik (son 12 saat)
    const buckets: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const h = new Date(Date.now() - i * 3600000)
      buckets[format(h, 'HH')] = 0
    }
    list.forEach((s: any) => {
      const d = new Date(s.updated_at)
      if ((Date.now() - d.getTime()) / 3600000 < 12) {
        const key = format(d, 'HH')
        if (buckets[key] !== undefined) buckets[key]++
      }
    })
    setSaatlik(Object.entries(buckets).map(([saat, sayi]) => ({ saat, sayi })))

    // Aboneler
    const res = await fetch('/api/aboneliker')
    const ab = await res.json()
    setAboneler(ab.subs?.filter((s: any) => s.durum === 'abone') || [])
    setLastUpdated(new Date())
  }

  const maxIntent = Math.max(...intents.map(i => i.count), 1)
  const maxSaatlik = Math.max(...saatlik.map(s => s.sayi), 1)
  const trendBugun = stats.dun > 0 ? Math.round(((stats.bugun - stats.dun) / stats.dun) * 100) : null
  const haftalikAdet = aboneler.reduce((s, a) => s + a.haftalik_adet, 0)
  const haftalikGelir = aboneler.reduce((s, a) => s + (a.haftalik_adet * (a.fiyat_tekil || 130)), 0)

  const bugun2 = new Date()
  const gun = bugun2.getDay()
  const cumaGun = gun === 5 ? 0 : (5 - gun + 7) % 7
  const sonrakiCuma = gun === 5 ? bugun2 : nextFriday(bugun2)

  return (
    <div className="min-h-screen bg-[#0f0e0c] text-cream-50 overflow-hidden" style={{ fontFamily: 'system-ui' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[#2a2820]">
        <div className="flex items-center gap-6">
          <div className="font-display text-3xl text-cream-50">milgo<span className="text-[#7c9059]">.</span></div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#7c9059] animate-pulse" />
            <span className="text-[#928c79] text-xs font-mono uppercase tracking-widest">canlı</span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-[#928c79] text-[10px] font-mono uppercase tracking-widest mb-0.5">Son güncelleme</div>
            <div className="text-cream-300 text-sm font-mono">{format(lastUpdated, 'HH:mm:ss')} · {yenilemeGeri}s</div>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl text-cream-50 tabular-nums">{format(now, 'HH:mm')}<span className="text-[#928c79] text-2xl">:{format(now, 'ss')}</span></div>
            <div className="text-[#928c79] text-xs font-mono">{format(now, "d MMMM yyyy, EEEE", { locale: tr })}</div>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-12 gap-4 h-[calc(100vh-72px)]">

        {/* Sol kolon — metrikler */}
        <div className="col-span-3 flex flex-col gap-4">

          {/* Ana metrikler */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Toplam', value: stats.toplam, color: '#e8d9a8' },
              { label: 'Bu Hafta', value: stats.buHafta, color: '#a8b885' },
              { label: 'Bugün', value: stats.bugun, sub: trendBugun !== null ? `${trendBugun > 0 ? '+' : ''}${trendBugun}% dün` : '', color: '#7c9059' },
              { label: 'Dün', value: stats.dun, color: '#928c79' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-[#1a1916] border border-[#2a2820] rounded-xl p-4">
                <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em] mb-2">{label}</div>
                <div className="font-display text-4xl" style={{ color }}>{value}</div>
                {sub && <div className="text-[10px] font-mono mt-1" style={{ color: trendBugun && trendBugun > 0 ? '#7c9059' : '#c4633f' }}>{sub}</div>}
              </div>
            ))}
          </div>

          {/* Canlı destek */}
          <div className={`border rounded-xl p-4 ${stats.canli > 0 ? 'bg-[#2a1410] border-[#c4633f]' : 'bg-[#1a1916] border-[#2a2820]'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em]">Canlı Destek</div>
              {stats.canli > 0 && <span className="w-2 h-2 rounded-full bg-[#c4633f] animate-pulse" />}
            </div>
            <div className={`font-display text-5xl ${stats.canli > 0 ? 'text-[#c4633f]' : 'text-[#928c79]'}`}>{stats.canli}</div>
            <div className="text-[10px] font-mono text-[#928c79] mt-1">{stats.canli > 0 ? 'temsilci bekliyor!' : 'kuyruk boş'}</div>
          </div>

          {/* Bot vs Canlı */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl p-4 flex-1">
            <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em] mb-3">Bot vs Canlı</div>
            <div className="space-y-2">
              {[
                { label: 'Bot Modunda', value: stats.bot, color: '#7c9059' },
                { label: 'Canlı Destek', value: stats.canli, color: '#c4633f' },
              ].map(({ label, value, color }) => {
                const total = stats.bot + stats.canli
                const pct = total > 0 ? Math.round(value / total * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color }} className="font-mono">{label}</span>
                      <span className="text-[#928c79] font-mono">{value} · %{pct}</span>
                    </div>
                    <div className="h-2 bg-[#2a2820] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-[#2a2820]">
              <div className="flex justify-between text-xs">
                <span className="text-[#928c79]">KVKK Onayı</span>
                <span className="text-[#d9c07a] font-mono font-bold">%{stats.kvkk}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Orta kolon — son konuşmalar + grafik */}
        <div className="col-span-5 flex flex-col gap-4">

          {/* Saatlik trafik */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl p-4">
            <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em] mb-3">Son 12 Saat Trafik</div>
            <div className="flex items-end gap-1 h-16">
              {saatlik.map(({ saat, sayi }) => {
                const pct = maxSaatlik > 0 ? (sayi / maxSaatlik) * 100 : 0
                const isMax = sayi === maxSaatlik && sayi > 0
                return (
                  <div key={saat} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-sm" style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: isMax ? '#c4633f' : '#7c9059',
                      opacity: sayi === 0 ? 0.2 : 1
                    }} />
                    <span className="text-[8px] text-[#928c79] font-mono">{saat}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Son konuşmalar */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl overflow-hidden flex-1">
            <div className="px-5 py-3 border-b border-[#2a2820] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c9059] animate-pulse" />
              <span className="text-[#928c79] text-[10px] uppercase tracking-[0.2em]">Son Konuşmalar</span>
            </div>
            <div className="divide-y divide-[#2a2820]">
              {sonMesajlar.map((s, i) => (
                <div key={s.phone} className="px-5 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[#928c79] font-mono text-xs w-5 shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-mono text-sm text-cream-200">{s.phone}</div>
                      <div className="text-xs text-[#928c79] truncate max-w-[200px]">{s.musteri_yazdigi || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{
                      background: `${INTENT_COLOR[s.last_intent || 'other']}20`,
                      color: INTENT_COLOR[s.last_intent || 'other']
                    }}>
                      {INTENT_LABEL[s.last_intent || 'other']}
                    </span>
                    {s.bulundugu_menu === 'canli' && (
                      <span className="flex items-center gap-1 text-[10px] text-[#c4633f]">
                        <span className="w-1 h-1 rounded-full bg-[#c4633f] animate-pulse" />Canlı
                      </span>
                    )}
                    {s.kvkk_onay && <span className="text-[10px] text-[#7c9059] font-mono">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ kolon — intent + aboneler */}
        <div className="col-span-4 flex flex-col gap-4">

          {/* Intent dağılımı */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl p-4">
            <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em] mb-3">Niyet Dağılımı</div>
            <div className="space-y-2">
              {intents.map(({ intent, count }) => {
                const pct = Math.round((count / maxIntent) * 100)
                return (
                  <div key={intent}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cream-300">{INTENT_LABEL[intent] || intent}</span>
                      <span className="text-[#928c79] font-mono">{count}</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2820] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: INTENT_COLOR[intent] || '#7c9059' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Abonelik özeti */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl p-4">
            <div className="text-[#928c79] text-[10px] uppercase tracking-[0.2em] mb-3">Abonelik</div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <div className="font-display text-3xl text-[#7c9059]">{aboneler.length}</div>
                <div className="text-[10px] text-[#928c79] font-mono">aktif abone</div>
              </div>
              <div>
                <div className="font-display text-3xl text-[#a8b885]">{haftalikAdet}</div>
                <div className="text-[10px] text-[#928c79] font-mono">adet/hafta</div>
              </div>
              <div>
                <div className="font-display text-2xl text-[#d9c07a]">{haftalikGelir.toLocaleString('tr')}</div>
                <div className="text-[10px] text-[#928c79] font-mono">TL/hafta</div>
              </div>
            </div>

            {/* Sonraki teslimat */}
            <div className="border-t border-[#2a2820] pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#928c79] uppercase tracking-[0.2em] mb-1">Sonraki Teslimat</div>
                  <div className="text-sm text-cream-200 font-medium">{format(sonrakiCuma, "d MMMM, EEEE", { locale: tr })}</div>
                </div>
                <div className={`text-center px-3 py-1.5 rounded-xl ${cumaGun <= 1 ? 'bg-[#c4633f]/20 border border-[#c4633f]/30' : 'bg-[#2a2820]'}`}>
                  <div className={`font-display text-2xl ${cumaGun <= 1 ? 'text-[#c4633f]' : 'text-[#7c9059]'}`}>{cumaGun === 0 ? 'Bugün!' : `${cumaGun} gün`}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Abone listesi */}
          <div className="bg-[#1a1916] border border-[#2a2820] rounded-xl overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-[#2a2820]">
              <span className="text-[#928c79] text-[10px] uppercase tracking-[0.2em]">Aktif Aboneler</span>
            </div>
            <div className="divide-y divide-[#2a2820]">
              {aboneler.slice(0, 6).map((a, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#2a2820] flex items-center justify-center text-[10px] text-[#928c79] font-mono">{i+1}</div>
                    <div>
                      <div className="text-sm text-cream-200">{a.ad} {a.soyad}</div>
                      <div className="text-[10px] text-[#928c79] font-mono">{a.iletisim}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-[#7c9059] font-mono font-medium">{a.haftalik_adet} adet</div>
                    <div className="text-[10px] text-[#928c79] font-mono">{(a.haftalik_adet * (a.fiyat_tekil || 130)).toLocaleString('tr')} TL</div>
                  </div>
                </div>
              ))}
              {aboneler.length === 0 && (
                <div className="px-4 py-6 text-center text-[#928c79] font-mono text-xs">henüz abone yok</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
