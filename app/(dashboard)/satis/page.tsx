'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'
import { TrendingUp, ShoppingBag, Package, DollarSign, Clock, MapPin, RefreshCw, AlertTriangle } from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'

const COLORS = ['#7c9059','#a8b885','#d9c07a','#c4a154','#d97757','#c4633f','#a64d2e','#928c79']
const tooltipStyle = { background: '#fdfcf7', border: '1px solid #e8d9a8', borderRadius: '8px', fontSize: '11px' }

export default function SatisPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aralik, setAralik] = useState(30)

  useEffect(() => { load() }, [aralik])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/shopify/orders')
    const data = await res.json()
    setOrders(data.orders || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="p-4 md:p-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-cream-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const sinceDate = subDays(new Date(), aralik)
  const filtered = orders.filter(o => new Date(o.created_at) >= sinceDate)
  const paid = filtered.filter(o => o.financial_status === 'paid')

  // Özet
  const toplamGelir = paid.reduce((s, o) => s + parseFloat(o.total_price), 0)
  const ortSepet = paid.length > 0 ? toplamGelir / paid.length : 0
  const iadeCount = filtered.filter(o => o.has_refund).length
  const bekleyenCount = filtered.filter(o => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled').length

  // Günlük gelir
  const gunlukMap: Record<string, number> = {}
  for (let i = Math.min(aralik, 30) - 1; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'dd MMM', { locale: tr })
    gunlukMap[d] = 0
  }
  paid.forEach(o => {
    const d = format(new Date(o.created_at), 'dd MMM', { locale: tr })
    if (gunlukMap[d] !== undefined) gunlukMap[d] += parseFloat(o.total_price)
  })
  const gunlukData = Object.entries(gunlukMap).map(([gun, gelir]) => ({ gun, gelir }))

  // En çok satan ürünler
  const urunMap: Record<string, { count: number; gelir: number }> = {}
  filtered.forEach(o => {
    o.line_items?.forEach((li: any) => {
      if (!urunMap[li.title]) urunMap[li.title] = { count: 0, gelir: 0 }
      urunMap[li.title].count += li.quantity
      urunMap[li.title].gelir += parseFloat(li.price) * li.quantity
    })
  })
  const urunData = Object.entries(urunMap).sort((a,b) => b[1].count - a[1].count).slice(0,8).map(([title, v]) => ({ title: title.slice(0,30), ...v }))

  // Sipariş yoğunluğu — gün
  const gunMap: Record<string, number> = { 'Pzt': 0, 'Sal': 0, 'Çar': 0, 'Per': 0, 'Cum': 0, 'Cmt': 0, 'Paz': 0 }
  const gunNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
  filtered.forEach(o => { const g = gunNames[new Date(o.created_at).getDay()]; if (g) gunMap[g]++ })
  const gunData = Object.entries(gunMap).map(([gun, sayi]) => ({ gun, sayi }))

  // Saat yoğunluğu
  const saatMap: Record<string, number> = {}
  for (let i = 0; i < 24; i++) saatMap[String(i).padStart(2,'0')] = 0
  filtered.forEach(o => { const h = String(new Date(o.created_at).getHours()).padStart(2,'0'); if (saatMap[h] !== undefined) saatMap[h]++ })
  const saatData = Object.entries(saatMap).map(([saat, sayi]) => ({ saat: `${saat}:00`, sayi }))
  const maxSaat = Math.max(...saatData.map(s => s.sayi))

  // Şehir bazlı
  const sehirMap: Record<string, number> = {}
  filtered.forEach(o => { const s = o.shipping_address?.city; if (s) sehirMap[s] = (sehirMap[s] || 0) + 1 })
  const sehirData = Object.entries(sehirMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([sehir, count]) => ({ sehir, count }))

  // Ort sepet trendi (haftalık)
  const haftaMap: Record<string, { total: number; count: number }> = {}
  paid.forEach(o => {
    const hafta = format(new Date(o.created_at), "'H'w yyyy", { locale: tr })
    if (!haftaMap[hafta]) haftaMap[hafta] = { total: 0, count: 0 }
    haftaMap[hafta].total += parseFloat(o.total_price)
    haftaMap[hafta].count++
  })
  const haftaData = Object.entries(haftaMap).slice(-8).map(([hafta, v]) => ({ hafta, ort: Math.round(v.total / v.count) }))

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">shopify · satış analitik</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Satış Analitik</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={aralik} onChange={e => setAralik(Number(e.target.value))}
            className="text-xs bg-white border border-cream-200 rounded-xl px-3 py-2 text-ink-600 focus:outline-none">
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-cream-200 rounded-xl text-ink-400 hover:text-ink-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Toplam Gelir', value: `${toplamGelir.toLocaleString('tr')} TL`, icon: DollarSign, color: 'bg-ink-900 border-ink-700 text-cream-50' },
          { label: 'Sipariş Sayısı', value: paid.length, icon: ShoppingBag, color: 'bg-moss-50 border-moss-200' },
          { label: 'Ort. Sepet', value: `${Math.round(ortSepet).toLocaleString('tr')} TL`, icon: TrendingUp, color: 'bg-white border-cream-200' },
          { label: 'Bekleyen', value: bekleyenCount, icon: Package, color: bekleyenCount > 0 ? 'bg-ember-50 border-ember-200' : 'bg-white border-cream-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`text-[10px] uppercase tracking-[0.2em] ${color.includes('ink-900') ? 'text-ink-300' : 'text-ink-400'}`}>{label}</span>
              <Icon className={`w-4 h-4 ${color.includes('ink-900') ? 'text-ink-400' : 'text-ink-300'}`} strokeWidth={1.5} />
            </div>
            <div className={`font-display text-2xl md:text-3xl ${color.includes('ink-900') ? 'text-cream-50' : 'text-ink-900'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* İade uyarısı */}
      {iadeCount > 0 && (
        <div className="mb-4 bg-ember-50 border border-ember-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-ember-500" strokeWidth={1.5} />
          <span className="text-sm text-ember-700 font-medium">{iadeCount} iade bu dönemde</span>
        </div>
      )}

      {/* Günlük gelir grafiği */}
      <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8 mb-4">
        <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-6">Günlük Gelir</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={gunlukData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
            <XAxis dataKey="gun" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString('tr')} TL`, 'Gelir']} />
            <Bar dataKey="gelir" fill="#7c9059" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 2 kolon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* En çok satan ürünler */}
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <h2 className="font-display text-xl text-ink-900 mb-4">🏆 En Çok Satan Ürünler</h2>
          <div className="space-y-3">
            {urunData.map((u, i) => (
              <div key={u.title} className="flex items-center gap-3">
                <span className="text-xs font-mono text-ink-300 w-4 shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-700 truncate mb-1">{u.title}</div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div className="h-full bg-moss-400 rounded-full" style={{ width: `${(u.count / urunData[0]?.count) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-mono text-ink-700 font-medium">{u.count} adet</div>
                  <div className="text-[10px] font-mono text-ink-400">{u.gelir.toLocaleString('tr')} TL</div>
                </div>
              </div>
            ))}
            {urunData.length === 0 && <p className="text-ink-300 font-mono text-sm">veri yok</p>}
          </div>
        </div>

        {/* Şehir bazlı */}
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <h2 className="font-display text-xl text-ink-900 mb-4">🌍 Şehir Bazlı Satış</h2>
          <div className="space-y-3">
            {sehirData.map((s, i) => (
              <div key={s.sehir} className="flex items-center gap-3">
                <span className="text-xs font-mono text-ink-300 w-4 shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink-700">{s.sehir}</span>
                    <span className="text-ink-400 font-mono">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.count / sehirData[0]?.count) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              </div>
            ))}
            {sehirData.length === 0 && <p className="text-ink-300 font-mono text-sm">veri yok</p>}
          </div>
        </div>
      </div>

      {/* Yoğunluk grafikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* Günlük yoğunluk */}
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <h2 className="font-display text-xl text-ink-900 mb-4">🗓️ Haftanın Günlerine Göre</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={gunData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="gun" tick={{ fontSize: 10, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} sipariş`, '']} />
              <Bar dataKey="sayi" radius={[4,4,0,0]}>
                {gunData.map((e,i) => <Cell key={i} fill={e.sayi === Math.max(...gunData.map(g => g.sayi)) ? '#c4633f' : '#7c9059'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Saatlik yoğunluk */}
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <h2 className="font-display text-xl text-ink-900 mb-4">⏰ Saate Göre Yoğunluk</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={saatData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <XAxis dataKey="saat" tick={{ fontSize: 8, fill: '#928c79' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} sipariş`, '']} />
              <Bar dataKey="sayi" radius={[3,3,0,0]}>
                {saatData.map((e,i) => <Cell key={i} fill={e.sayi === maxSaat && maxSaat > 0 ? '#c4633f' : '#a8b885'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ortalama sepet trendi */}
      {haftaData.length > 1 && (
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <h2 className="font-display text-xl text-ink-900 mb-4">💳 Ortalama Sepet Tutarı Trendi</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={haftaData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
              <XAxis dataKey="hafta" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toLocaleString('tr')} TL`, 'Ort. Sepet']} />
              <Line type="monotone" dataKey="ort" stroke="#d97757" strokeWidth={2.5} dot={{ fill: '#d97757', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
