'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Session } from '@/lib/supabase'
import StatCard from '@/components/StatCard'
import { MessagesSquare, Users, Headphones, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { formatDistanceToNow, format, startOfDay, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

type Stats = {
  toplam: number; bugun: number; dun: number; canli: number
  kvkkOnayli: number; kvkkOranı: number
  son24Saat: { saat: string; sayi: number }[]
  intentDagilimi: { intent: string; count: number }[]
}

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama', products: 'Ürün Listesi', product_detail: 'Ürün Detay',
  order_status: 'Sipariş Durumu', order_create: 'Sipariş Oluştur', subscription: 'Abonelik',
  human_handover: 'Canlı Destek', complaint: 'Şikayet', brand_info: 'Marka Bilgi',
  usage_question: 'Kullanım Sorusu', menu: 'Menü', smalltalk: 'Sohbet', other: 'Diğer',
}

const TONE: Record<string, string> = {
  greeting: '#7c9059', products: '#a8b885', product_detail: '#cfd9b4',
  order_status: '#d9c07a', order_create: '#c4a154', subscription: '#d97757',
  human_handover: '#c4633f', complaint: '#a64d2e', brand_info: '#928c79',
  usage_question: '#c8c4b7', menu: '#3d3a30', smalltalk: '#e8d9a8', other: '#5a7041',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Klavye kısayolları
  useEffect(() => {
    const keys: string[] = []
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      keys.push(e.key.toLowerCase())
      if (keys.length > 2) keys.shift()
      const combo = keys.join('')
      if (combo === 'gd') router.push('/')
      if (combo === 'gc') router.push('/canli-destek')
      if (combo === 'gk') router.push('/konusmalar')
      if (combo === 'gs') router.push('/siparisler')
      if (combo === 'ga') router.push('/abonelikler')
      if (combo === 'gr') router.push('/raporlar')
      if (e.key === 'Escape') router.push('/')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [router])

  // Otomatik logout - 30 dk inaktif
  useEffect(() => {
    let timer: NodeJS.Timeout
    function reset() {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await fetch('/api/auth', { method: 'DELETE' })
        router.push('/login')
      }, 30 * 60 * 1000)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    reset()
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
    }
  }, [router])

  const load = useCallback(async () => {
    const { data: all } = await supabase.from('wa_sessions').select('*').order('updated_at', { ascending: false }).limit(500)
    const list = (all || []) as Session[]
    const now = new Date()
    const today = startOfDay(now)
    const yesterday = startOfDay(subDays(now, 1))

    const bugun = list.filter(s => new Date(s.updated_at) >= today).length
    const dun = list.filter(s => new Date(s.updated_at) >= yesterday && new Date(s.updated_at) < today).length
    const canli = list.filter(s => s.last_intent === 'human_handover' || s.bulundugu_menu === 'canli').length
    const kvkkOnayli = list.filter(s => s.kvkk_onay === true).length
    const kvkkOranı = list.length ? Math.round((kvkkOnayli / list.length) * 100) : 0

    const buckets: Record<string, number> = {}
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 3600000)
      buckets[format(h, 'HH:00')] = 0
    }
    list.forEach(s => {
      const d = new Date(s.updated_at)
      if ((now.getTime() - d.getTime()) / 3600000 < 24) {
        const key = format(d, 'HH:00')
        if (buckets[key] !== undefined) buckets[key]++
      }
    })

    const intentMap: Record<string, number> = {}
    list.forEach(s => { const i = s.last_intent || 'other'; intentMap[i] = (intentMap[i] || 0) + 1 })
    const intentDagilimi = Object.entries(intentMap).sort((a,b) => b[1]-a[1]).map(([intent, count]) => ({ intent, count }))

    setStats({ toplam: list.length, bugun, dun, canli, kvkkOnayli, kvkkOranı, son24Saat: Object.entries(buckets).map(([saat, sayi]) => ({ saat, sayi })), intentDagilimi })
    setSessions(list.slice(0, 8))
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  if (loading) return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="mb-12 space-y-3">
        <div className="h-4 w-48 bg-cream-200 rounded animate-pulse" />
        <div className="h-10 w-64 bg-cream-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-12">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-cream-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const trendBugun = stats!.dun > 0 ? Math.round(((stats!.bugun - stats!.dun) / stats!.dun) * 100) : null

  return (
    <div className="p-10 max-w-7xl mx-auto">

      {/* Canlı destek alert */}
      {stats!.canli > 0 && (
        <div className="mb-6 bg-ember-50 border border-ember-200 rounded-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-ember-500 shrink-0" strokeWidth={1.5} />
            <div>
              <span className="text-ember-700 font-medium text-sm">{stats!.canli} müşteri canlı destek bekliyor</span>
              <span className="text-ember-500 text-xs ml-2 font-mono">hemen yanıtla</span>
            </div>
          </div>
          <a href="/canli-destek" className="px-4 py-2 bg-ember-600 text-white text-xs font-medium rounded-xl hover:bg-ember-700 transition-colors">
            Canlı Destek →
          </a>
        </div>
      )}

      <header className="mb-12">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink-300 font-medium mb-3">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: tr })}
            </p>
            <h1 className="font-display text-5xl text-ink-900 tracking-tight">Genel Bakış</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-ink-300 font-mono uppercase tracking-widest mb-1">Kısayollar</p>
              <p className="text-[10px] text-ink-300 font-mono">G+D · G+C · G+K · G+R</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-500">
              <span className="w-2 h-2 rounded-full bg-moss-400 animate-pulse" />
              <span className="font-mono">canlı yayın</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard label="Toplam Müşteri" value={stats!.toplam} delta={`${stats!.bugun} bugün aktif`} icon={Users} />
        <StatCard
          label="Bugün Aktif"
          value={stats!.bugun}
          delta={trendBugun !== null ? `${trendBugun > 0 ? '+' : ''}${trendBugun}% dünden` : 'ilk gün'}
          icon={MessagesSquare}
          tone="moss"
        />
        <StatCard
          label="Canlı Destek"
          value={stats!.canli}
          delta={stats!.canli > 0 ? 'temsilci bekliyor' : 'kuyruk boş'}
          icon={Headphones}
          tone={stats!.canli > 0 ? 'ember' : 'default'}
        />
        <StatCard label="KVKK Onayı" value={`%${stats!.kvkkOranı}`} delta={`${stats!.kvkkOnayli} onaylı kullanıcı`} icon={CheckCircle2} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
        <div className="lg:col-span-2 bg-white border border-cream-200 rounded-2xl p-8">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-ink-900 tracking-tight">Son 24 Saat</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300">
              <TrendingUp className="inline w-3 h-3 mr-1" strokeWidth={1.5} />saatlik trafik
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats!.son24Saat} margin={{ top: 8, right: 8, bottom: 8, left: -10 }}>
              <XAxis dataKey="saat" tick={{ fontSize: 10, fill: '#928c79' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(124,144,89,0.08)' }} contentStyle={{ background: '#fdfcf7', border: '1px solid #e8d9a8', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }} />
              <Bar dataKey="sayi" radius={[4,4,0,0]}>
                {stats!.son24Saat.map((e,i) => (
                  <Cell key={i} fill={e.sayi === Math.max(...stats!.son24Saat.map(h=>h.sayi)) && e.sayi > 0 ? '#c4633f' : '#7c9059'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-8">
          <h2 className="font-display text-2xl text-ink-900 tracking-tight mb-8">Niyet Dağılımı</h2>
          <div className="space-y-3">
            {stats!.intentDagilimi.slice(0,6).map(item => {
              const total = stats!.intentDagilimi.reduce((a,b) => a+b.count, 0)
              const pct = total ? Math.round((item.count/total)*100) : 0
              return (
                <div key={item.intent}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-700 font-medium">{INTENT_LABEL[item.intent] || item.intent}</span>
                    <span className="text-ink-300 font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: TONE[item.intent] || '#7c9059' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Son konuşmalar */}
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <div className="px-8 py-6 border-b border-cream-200 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ink-900 tracking-tight">Son Konuşmalar</h2>
          <a href="/konusmalar" className="text-xs uppercase tracking-[0.2em] text-moss-600 hover:text-moss-700">Hepsini Gör →</a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-cream-50 text-left">
              {['Müşteri', 'Son Mesaj', 'Niyet', 'Durum', 'Zaman'].map(h => (
                <th key={h} className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.phone} className="border-t border-cream-100 hover:bg-cream-50 transition-colors cursor-pointer" onClick={() => router.push('/konusmalar')}>
                <td className="px-8 py-4 font-mono text-sm text-ink-700">{s.phone}</td>
                <td className="px-8 py-4 text-sm text-ink-500 max-w-xs truncate">{s.musteri_yazdigi || '—'}</td>
                <td className="px-8 py-4">
                  <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium"
                    style={{ background: `${TONE[s.last_intent||'other']}20`, color: TONE[s.last_intent||'other'] }}>
                    {INTENT_LABEL[s.last_intent||'other'] || 'Diğer'}
                  </span>
                </td>
                <td className="px-8 py-4">
                  {s.bulundugu_menu === 'canli' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ember-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />Canlı Destek
                    </span>
                  ) : <span className="text-xs text-moss-500">Bot Modunda</span>}
                </td>
                <td className="px-8 py-4 text-xs text-ink-300 font-mono">
                  {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true, locale: tr })}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-ink-300 font-mono text-sm">henüz konuşma yok</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Klavye kısayol ipucu */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        {[['G+D','Genel Bakış'],['G+C','Canlı Destek'],['G+K','Konuşmalar'],['G+S','Siparişler'],['G+A','Abonelikler'],['G+R','Raporlar']].map(([k,l]) => (
          <div key={k} className="flex items-center gap-2 text-[10px] text-ink-300 font-mono">
            <span className="px-2 py-0.5 bg-cream-100 border border-cream-200 rounded text-ink-400">{k}</span>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
