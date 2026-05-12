'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'
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

const COLORS = ['#7c9059', '#a8b885', '#d9c07a', '#c4a154', '#d97757', '#c4633f', '#928c79', '#5a7041']

export default function RaporlarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('wa_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1000)
    setSessions((data || []) as Session[])
    setLoading(false)
  }

  // Son 14 gün günlük aktif kullanıcı
  const daily: { tarih: string; aktif: number; yeni: number }[] = []
  const now = new Date()
  for (let i = 13; i >= 0; i--) {
    const day = startOfDay(subDays(now, i))
    const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000)
    const aktif = sessions.filter((s) => {
      const u = new Date(s.updated_at)
      return u >= day && u < dayEnd
    }).length
    const yeni = sessions.filter((s) => {
      const c = s.created_at ? new Date(s.created_at) : null
      return c && c >= day && c < dayEnd
    }).length
    daily.push({
      tarih: format(day, 'd MMM', { locale: tr }),
      aktif,
      yeni,
    })
  }

  // Intent dağılımı (pie)
  const intentMap: Record<string, number> = {}
  sessions.forEach((s) => {
    const k = s.last_intent || 'other'
    intentMap[k] = (intentMap[k] || 0) + 1
  })
  const intentData = Object.entries(intentMap)
    .map(([name, value]) => ({
      name: INTENT_LABEL[name] || name,
      value,
    }))
    .sort((a, b) => b.value - a.value)

  // KVKK
  const kvkkOnayli = sessions.filter((s) => s.kvkk_onay).length
  const kvkkData = [
    { name: 'Onaylı', value: kvkkOnayli, fill: '#7c9059' },
    { name: 'Onaysız', value: sessions.length - kvkkOnayli, fill: '#d9c07a' },
  ]

  // Cevaplanamayan mesajlar
  const fallback = sessions.filter(
    (s) => s.last_intent === 'other' || !s.last_intent
  )

  if (loading) {
    return (
      <div className="p-10 text-ink-300 font-mono text-sm">yükleniyor...</div>
    )
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">
          {sessions.length} kayıt üzerinden
        </p>
        <h1 className="font-display text-5xl text-ink-900 tracking-tight">
          Raporlar
        </h1>
      </header>

      {/* 14 günlük trafik */}
      <div className="bg-white border border-cream-200 rounded-2xl p-8 mb-8 animate-fade-in">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-2xl text-ink-900 tracking-tight">
            Son 14 Gün
          </h2>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-2 text-ink-500">
              <span className="w-3 h-3 rounded-full bg-moss-400" />
              Aktif Kullanıcı
            </span>
            <span className="flex items-center gap-2 text-ink-500">
              <span className="w-3 h-3 rounded-full bg-cream-400" />
              Yeni Kayıt
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={daily} margin={{ top: 8, right: 16, bottom: 8, left: -10 }}>
            <defs>
              <linearGradient id="aktifGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c9059" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#7c9059" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="yeniGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d9c07a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#d9c07a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d9a8" opacity={0.5} />
            <XAxis
              dataKey="tarih"
              tick={{ fontSize: 11, fill: '#928c79' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#928c79' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#fdfcf7',
                border: '1px solid #e8d9a8',
                borderRadius: '8px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="aktif"
              stroke="#7c9059"
              strokeWidth={2}
              fill="url(#aktifGrad)"
            />
            <Area
              type="monotone"
              dataKey="yeni"
              stroke="#d9c07a"
              strokeWidth={2}
              fill="url(#yeniGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Intent pie */}
        <div className="bg-white border border-cream-200 rounded-2xl p-8 animate-fade-in">
          <h2 className="font-display text-2xl text-ink-900 mb-6 tracking-tight">
            Niyet Dağılımı
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={intentData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
              >
                {intentData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#fdfcf7',
                  border: '1px solid #e8d9a8',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* KVKK */}
        <div className="bg-white border border-cream-200 rounded-2xl p-8 animate-fade-in">
          <h2 className="font-display text-2xl text-ink-900 mb-6 tracking-tight">
            KVKK Onay Oranı
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={kvkkData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={110}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {kvkkData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cevaplanamayan */}
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden animate-fade-in">
        <div className="px-8 py-6 border-b border-cream-200 flex items-baseline justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink-900 tracking-tight">
              Cevaplanamayan Mesajlar
            </h2>
            <p className="text-xs text-ink-500 mt-1">
              Bot anlamadı veya "other" sınıfına düştü — sistem eğitimi için
              gözden geçirin
            </p>
          </div>
          <span className="text-3xl font-display text-ember-500">
            {fallback.length}
          </span>
        </div>
        <table className="w-full">
          <thead className="bg-cream-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Telefon
              </th>
              <th className="px-6 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Müşteri Mesajı
              </th>
              <th className="px-6 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {fallback.slice(0, 20).map((s) => (
              <tr
                key={s.phone}
                className="border-t border-cream-100 hover:bg-cream-50"
              >
                <td className="px-6 py-3 font-mono text-sm text-ink-500">
                  {s.phone}
                </td>
                <td className="px-6 py-3 text-sm text-ink-700">
                  {s.musteri_yazdigi || '—'}
                </td>
                <td className="px-6 py-3 text-xs text-ink-300 font-mono">
                  {format(new Date(s.updated_at), 'd MMM HH:mm', { locale: tr })}
                </td>
              </tr>
            ))}
            {fallback.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-ink-300">
                  Cevaplanamayan mesaj yok — bot iyi durumda 🤍
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
