'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama', products: 'Ürün', subscription: 'Abonelik',
  human_handover: 'Canlı Destek', complaint: 'Şikayet', order_create: 'Sipariş',
  other: 'Diğer'
}

export default function TvPage() {
  const [now, setNow] = useState(new Date())
  const [stats, setStats] = useState({ toplam: 0, bugun: 0, canli: 0, kvkk: 0 })
  const [sonMesajlar, setSonMesajlar] = useState<any[]>([])
  const [intents, setIntents] = useState<{ intent: string; count: number }[]>([])
  const [aboneler, setAboneler] = useState<any[]>([])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  async function load() {
    const { data } = await supabase.from('wa_sessions').select('*').order('updated_at', { ascending: false }).limit(200)
    const list = data || []
    const today = new Date(); today.setHours(0,0,0,0)
    const bugun = list.filter((s: any) => new Date(s.updated_at) >= today).length
    const canli = list.filter((s: any) => s.bulundugu_menu === 'canli' || s.last_intent === 'human_handover').length
    const kvkk = list.length ? Math.round(list.filter((s: any) => s.kvkk_onay).length / list.length * 100) : 0
    setStats({ toplam: list.length, bugun, canli, kvkk })
    setSonMesajlar(list.slice(0, 8))

    const intentMap: Record<string, number> = {}
    list.forEach((s: any) => { const i = s.last_intent || 'other'; intentMap[i] = (intentMap[i] || 0) + 1 })
    setIntents(Object.entries(intentMap).sort((a,b) => b[1]-a[1]).slice(0,6).map(([intent, count]) => ({ intent, count })))

    const res = await fetch('/api/aboneliker')
    const ab = await res.json()
    setAboneler(ab.subs?.filter((s: any) => s.durum === 'abone') || [])
  }

  const maxIntent = Math.max(...intents.map(i => i.count), 1)

  return (
    <div className="min-h-screen bg-ink-900 text-cream-50 p-8 font-sans" style={{ fontFamily: 'system-ui' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <div className="font-display text-4xl text-cream-50 tracking-tight mb-1">
            milgo<span className="text-moss-400">.</span>
          </div>
          <div className="text-ink-300 text-sm font-mono uppercase tracking-widest">admin dashboard</div>
        </div>
        <div className="text-right">
          <div className="font-display text-5xl text-cream-50 tabular-nums">
            {format(now, 'HH:mm:ss')}
          </div>
          <div className="text-ink-300 text-sm font-mono mt-1">
            {format(now, "EEEE, d MMMM yyyy", { locale: tr })}
          </div>
        </div>
      </div>

      {/* Ana metrikler */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Toplam Müşteri', value: stats.toplam, color: 'text-cream-50', bg: 'bg-ink-800' },
          { label: 'Bugün Aktif', value: stats.bugun, color: 'text-moss-300', bg: 'bg-moss-900/30' },
          { label: 'Canlı Destek', value: stats.canli, color: stats.canli > 0 ? 'text-ember-400' : 'text-ink-400', bg: stats.canli > 0 ? 'bg-ember-900/30' : 'bg-ink-800' },
          { label: 'KVKK Onayı', value: `%${stats.kvkk}`, color: 'text-cream-300', bg: 'bg-ink-800' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-6 border border-ink-700`}>
            <div className="text-ink-400 text-xs uppercase tracking-[0.3em] mb-3">{label}</div>
            <div className={`font-display text-6xl ${color} ${stats.canli > 0 && label === 'Canlı Destek' ? 'animate-pulse' : ''}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Son konuşmalar */}
        <div className="col-span-2 bg-ink-800 border border-ink-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-ink-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-moss-400 animate-pulse" />
            <span className="text-sm font-medium text-ink-200 uppercase tracking-[0.2em]">Son Konuşmalar</span>
          </div>
          <div className="divide-y divide-ink-700">
            {sonMesajlar.map((s, i) => (
              <div key={s.phone} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-mono text-ink-400">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-mono text-sm text-cream-200">{s.phone}</div>
                    <div className="text-xs text-ink-400 truncate max-w-xs">{s.musteri_yazdigi || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ink-700 text-ink-300 font-mono">
                    {INTENT_LABEL[s.last_intent || 'other'] || 'Diğer'}
                  </span>
                  {s.bulundugu_menu === 'canli' && (
                    <span className="flex items-center gap-1 text-xs text-ember-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-ember-400 animate-pulse" />Canlı
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ kolon */}
        <div className="space-y-4">
          {/* Intent dağılımı */}
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6">
            <div className="text-sm font-medium text-ink-200 uppercase tracking-[0.2em] mb-4">Niyet Dağılımı</div>
            <div className="space-y-2.5">
              {intents.map(({ intent, count }) => (
                <div key={intent}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-300">{INTENT_LABEL[intent] || intent}</span>
                    <span className="text-ink-400 font-mono">{count}</span>
                  </div>
                  <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
                    <div className="h-full bg-moss-500 rounded-full" style={{ width: `${(count/maxIntent)*100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Aktif aboneler */}
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-6">
            <div className="text-sm font-medium text-ink-200 uppercase tracking-[0.2em] mb-4">
              Aktif Aboneler
              <span className="ml-2 text-moss-400 font-display text-2xl">{aboneler.length}</span>
            </div>
            <div className="space-y-2">
              {aboneler.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-ink-300">{a.ad} {a.soyad}</span>
                  <span className="font-mono text-xs text-moss-400">{a.haftalik_adet} adet/hafta</span>
                </div>
              ))}
              {aboneler.length === 0 && <p className="text-ink-500 text-sm font-mono">henüz abone yok</p>}
            </div>
          </div>

          {/* Yenileme */}
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs text-ink-400 font-mono">otomatik yenileme</span>
            <span className="flex items-center gap-1.5 text-xs text-moss-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-moss-400 animate-pulse" />
              30s
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
