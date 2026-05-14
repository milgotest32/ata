'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import StatCard from '@/components/StatCard'
import {
  MessagesSquare,
  Users,
  Headphones,
  CheckCircle2,
  TrendingUp,
  Clock,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { formatDistanceToNow, format, startOfDay, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'

type Stats = {
  toplam: number
  bugun: number
  canli: number
  kvkkOnayli: number
  kvkkOranı: number
  son24Saat: { saat: string; sayi: number }[]
  intentDagilimi: { intent: string; count: number }[]
}

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

const TONE: Record<string, string> = {
  greeting: '#7c9059',
  products: '#a8b885',
  product_detail: '#cfd9b4',
  order_status: '#d9c07a',
  order_create: '#c4a154',
  subscription: '#d97757',
  human_handover: '#c4633f',
  complaint: '#a64d2e',
  brand_info: '#928c79',
  usage_question: '#c8c4b7',
  menu: '#3d3a30',
  smalltalk: '#e8d9a8',
  other: '#5a7041',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  async function load() {
    const { data: all } = await supabase
      .from('wa_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500)

    const list = (all || []) as Session[]
    const now = new Date()
    const today = startOfDay(now)

    const bugun = list.filter((s) => new Date(s.updated_at) >= today).length
    const canli = list.filter((s) => s.last_intent === 'human_handover' || s.bulundugu_menu === 'canli').length
    const kvkkOnayli = list.filter((s) => s.kvkk_onay === true).length
    const kvkkOranı = list.length ? Math.round((kvkkOnayli / list.length) * 100) : 0

    // Son 24 saat — saatlik
    const buckets: Record<string, number> = {}
    for (let i = 23; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000)
      const key = format(h, 'HH:00')
      buckets[key] = 0
    }
    list.forEach((s) => {
      const d = new Date(s.updated_at)
      const diff = (now.getTime() - d.getTime()) / (60 * 60 * 1000)
      if (diff < 24) {
        const key = format(d, 'HH:00')
        if (buckets[key] !== undefined) buckets[key]++
      }
    })

    const son24Saat = Object.entries(buckets).map(([saat, sayi]) => ({
      saat,
      sayi,
    }))

    // Intent dağılımı
    const intentMap: Record<string, number> = {}
    list.forEach((s) => {
      const i = s.last_intent || 'other'
      intentMap[i] = (intentMap[i] || 0) + 1
    })
    const intentDagilimi = Object.entries(intentMap)
      .sort((a, b) => b[1] - a[1])
      .map(([intent, count]) => ({ intent, count }))

    setStats({
      toplam: list.length,
      bugun,
      canli,
      kvkkOnayli,
      kvkkOranı,
      son24Saat,
      intentDagilimi,
    })
    setSessions(list.slice(0, 8))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-ink-300 font-mono text-sm animate-pulse">
          yükleniyor...
        </div>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {/* Hero header */}
      <header className="mb-12 animate-slide-up">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink-300 font-medium mb-3">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: tr })}
            </p>
            <h1 className="font-display text-5xl text-ink-900 tracking-tight">
              Genel Bakış
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span className="w-2 h-2 rounded-full bg-moss-400 animate-pulse-soft" />
            <span className="font-mono">canlı yayın</span>
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 stagger">
        <StatCard
          label="Toplam Müşteri"
          value={stats!.toplam}
          delta={`${stats!.bugun} bugün aktif`}
          icon={Users}
        />
        <StatCard
          label="Aktif Konuşma"
          value={stats!.bugun}
          delta="son 24 saatte"
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
        <StatCard
          label="KVKK Onayı"
          value={`%${stats!.kvkkOranı}`}
          delta={`${stats!.kvkkOnayli} onaylı kullanıcı`}
          icon={CheckCircle2}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
        {/* 24h activity */}
        <div className="lg:col-span-2 bg-white border border-cream-200 rounded-2xl p-8 animate-fade-in">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-2xl text-ink-900 tracking-tight">
              Son 24 Saat
            </h2>
            <span className="text-xs uppercase tracking-[0.2em] text-ink-300">
              <TrendingUp className="inline w-3 h-3 mr-1" strokeWidth={1.5} />
              saatlik trafik
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stats!.son24Saat}
              margin={{ top: 8, right: 8, bottom: 8, left: -10 }}
            >
              <XAxis
                dataKey="saat"
                tick={{ fontSize: 10, fill: '#928c79' }}
                axisLine={false}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#928c79' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(124,144,89,0.08)' }}
                contentStyle={{
                  background: '#fdfcf7',
                  border: '1px solid #e8d9a8',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="sayi" fill="#7c9059" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Intent breakdown */}
        <div className="bg-white border border-cream-200 rounded-2xl p-8 animate-fade-in">
          <h2 className="font-display text-2xl text-ink-900 tracking-tight mb-8">
            Niyet Dağılımı
          </h2>
          <div className="space-y-3">
            {stats!.intentDagilimi.slice(0, 6).map((item) => {
              const total = stats!.intentDagilimi.reduce((a, b) => a + b.count, 0)
              const pct = total ? Math.round((item.count / total) * 100) : 0
              return (
                <div key={item.intent}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-700 font-medium">
                      {INTENT_LABEL[item.intent] || item.intent}
                    </span>
                    <span className="text-ink-300 font-mono">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: TONE[item.intent] || '#7c9059',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden animate-fade-in">
        <div className="px-8 py-6 border-b border-cream-200 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-ink-900 tracking-tight">
            Son Konuşmalar
          </h2>
          <a
            href="/konusmalar"
            className="text-xs uppercase tracking-[0.2em] text-moss-600 hover:text-moss-700"
          >
            Hepsini Gör →
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-cream-50 text-left">
              <th className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">
                Müşteri
              </th>
              <th className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">
                Son Mesaj
              </th>
              <th className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">
                Niyet
              </th>
              <th className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">
                Durum
              </th>
              <th className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-300 font-medium">
                Zaman
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.phone}
                className="border-t border-cream-100 hover:bg-cream-50 transition-colors"
              >
                <td className="px-8 py-4 font-mono text-sm text-ink-700">
                  {s.phone}
                </td>
                <td className="px-8 py-4 text-sm text-ink-500 max-w-xs truncate">
                  {s.musteri_yazdigi || '—'}
                </td>
                <td className="px-8 py-4">
                  <span
                    className="inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium"
                    style={{
                      background: `${TONE[s.last_intent || 'other']}20`,
                      color: TONE[s.last_intent || 'other'],
                    }}
                  >
                    {INTENT_LABEL[s.last_intent || 'other'] || 'Diğer'}
                  </span>
                </td>
                <td className="px-8 py-4">
                  {s.bulundugu_menu === 'canli' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-ember-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />
                      Canlı Destek
                    </span>
                  ) : (
                    <span className="text-xs text-moss-500">Bot Modunda</span>
                  )}
                </td>
                <td className="px-8 py-4 text-xs text-ink-300 font-mono">
                  {formatDistanceToNow(new Date(s.updated_at), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-8 py-12 text-center text-ink-300 font-mono text-sm"
                >
                  henüz konuşma yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
