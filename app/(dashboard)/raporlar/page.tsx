'use client'

import { useEffect, useState } from 'react'
import { supabase, Session } from '@/lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { AlertCircle, ShoppingCart, RefreshCw, Users, Bot, Headphones, Package, TrendingUp, Clock } from 'lucide-react'
import { format, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'

const INTENT_LABEL: Record<string, string> = {
  greeting: 'Selamlama', products: 'Ürün Listesi', product_detail: 'Ürün Detay',
  order_status: 'Sipariş Durumu', order_create: 'Sipariş Oluştur', subscription: 'Abonelik',
  human_handover: 'Canlı Destek', complaint: 'Şikayet', brand_info: 'Marka Bilgi',
  usage_question: 'Kullanım Sorusu', menu: 'Menü', smalltalk: 'Sohbet', other: 'Diğer',
}
const COLORS = ['#7c9059','#a8b885','#d9c07a','#c4a154','#d97757','#c4633f','#a64d2e','#928c79','#cfd9b4','#e8d9a8','#3d3a30','#5a7041']
const RADIAN = Math.PI / 180
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>
}

export default function RaporlarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  async function load() {
    const { data } = await supabase.from('wa_sessions').select('*').order('updated_at', { ascending: false }).limit(1000)
    setSessions((data || []) as Session[])
    setLoading(false)
  }

  if (loading) return (
    <div className="p-4 md:p-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-cream-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  const now = new Date()
  const today = startOfDay(now)
  const intentMap: Record<string, number> = {}
  sessions.forEach(s => { const i = s.last_intent || 'other'; intentMap[i] = (intentMap[i] || 0) + 1 })
  const intentData = Object.entries(intentMap).sort((a,b) => b[1]-a[1]).map(([intent, value]) => ({ name: INTENT_LABEL[intent] || intent, value, intent }))
  const botCount = sessions.filter(s => !['canli','kvkk'].includes(s.bulundugu_menu)).length
  const canliCount = sessions.filter(s => s.bulundugu_menu === 'canli' || s.last_intent === 'human_handover').length
  const kvkkCount = sessions.filter(s => s.bulundugu_menu === 'kvkk').length
  const botVsCanli = [
    { name: 'Bot Çözdü', value: botCount, color: '#7c9059' },
    { name: 'Canlı Destek', value: canliCount, color: '#c4633f' },
    { name: 'KVKK Bekliyor', value: kvkkCount, color: '#d9c07a' },
  ].filter(d => d.value > 0)
  const hourMap: Record<string, number> = {}
  for (let i = 0; i < 24; i++) hourMap[String(i).padStart(2,'0')] = 0
  sessions.forEach(s => { const h = String(new Date(s.updated_at).getHours()).padStart(2,'0'); if (hourMap[h] !== undefined) hourMap[h]++ })
  const hourData = Object.entries(hourMap).map(([h, sayi]) => ({ saat: `${h}`, sayi }))
  const maxHour = Math.max(...hourData.map(h => h.sayi))
  const kvkkHayir = sessions.filter(s => s.kvkk_onay === false)
  const sepetler = sessions.filter(s => s.pending_action && (String(s.pending_action).includes('order:') || s.bulundugu_menu === 'order_cart'))
  const bugunAktif = sessions.filter(s => new Date(s.updated_at) >= today)
  const eskiAktif = sessions.filter(s => new Date(s.updated_at) < today)
  const tekrarlar = bugunAktif.filter(s => eskiAktif.find(e => e.phone === s.phone))
  const urunMap: Record<string, number> = {}
  sessions.forEach(s => {
    if (!s.last_products) return
    try {
      const prods = typeof s.last_products === 'string' ? JSON.parse(s.last_products) : s.last_products
      const items = Array.isArray(prods) ? prods : (prods.items || prods.products || [])
      items.forEach((p: any) => { const ad = p.title || p.ad || p.name || ''; if (ad) urunMap[ad] = (urunMap[ad] || 0) + 1 })
    } catch {}
  })
  const urunData = Object.entries(urunMap).sort((a,b) => b[1]-a[1]).slice(0,8).map(([ad, count]) => ({ ad, count }))
  const kvkkOnay = sessions.filter(s => s.kvkk_onay).length
  const kvkkOran = sessions.length ? Math.round(kvkkOnay / sessions.length * 100) : 0
  const tooltipStyle = { background: '#fdfcf7', border: '1px solid #e8d9a8', borderRadius: '8px', fontSize: '11px' }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 md:mb-10 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">{format(now, "d MMMM yyyy", { locale: tr })}</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Raporlar</h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-xs text-ink-400 hover:text-ink-700">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Toplam', value: sessions.length, icon: Users, sub: `${bugunAktif.length} bugün`, color: 'bg-white border-cream-200' },
          { label: 'Bot Çözdü', value: botCount, icon: Bot, sub: `%${sessions.length ? Math.round(botCount/sessions.length*100) : 0}`, color: 'bg-moss-50 border-moss-200' },
          { label: 'Canlı Destek', value: canliCount, icon: Headphones, sub: 'human_handover', color: 'bg-ember-50 border-ember-200' },
          { label: 'KVKK', value: `%${kvkkOran}`, icon: AlertCircle, sub: `${kvkkOnay} onaylı`, color: 'bg-cream-100 border-cream-300' },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <span className="text-[10px] uppercase tracking-[0.15em] text-ink-400">{label}</span>
              <Icon className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl md:text-4xl text-ink-900 mb-0.5">{value}</div>
            <div className="text-[10px] text-ink-300 font-mono">{sub}</div>
          </div>
        ))}
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
          <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-4">Intent Dağılımı</h2>
          {intentData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-ink-300 font-mono text-sm">veri yok</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={intentData} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false} label={PieLabel}>
                    {intentData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v:any) => [`${v} kişi`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 w-full sm:w-auto sm:min-w-[140px]">
                {intentData.slice(0,6).map((d,i) => (
                  <div key={d.intent} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-ink-600 truncate flex-1">{d.name}</span>
                    <span className="text-xs font-mono text-ink-400">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
          <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-4">Bot vs Canlı</h2>
          {botVsCanli.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-ink-300 font-mono text-sm">veri yok</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={botVsCanli} cx="50%" cy="50%" outerRadius={75} dataKey="value" labelLine={false} label={PieLabel}>
                    {botVsCanli.map((d,i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v:any) => [`${v} kişi`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 w-full sm:w-auto sm:min-w-[160px]">
                {botVsCanli.map(d => {
                  const total = botVsCanli.reduce((a,b) => a+b.value, 0)
                  const pct = total ? Math.round(d.value/total*100) : 0
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                        <span className="text-ink-400 font-mono">{d.value}</span>
                      </div>
                      <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Yoğun saatler */}
      <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl md:text-2xl text-ink-900">En Yoğun Saatler</h2>
          <span className="text-xs font-mono text-ink-300 flex items-center gap-1"><Clock className="w-3 h-3" />tüm zamanlar</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourData} margin={{ top: 4, right: 4, bottom: 4, left: -25 }}>
            <XAxis dataKey="saat" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v:any) => [`${v} mesaj`, '']} />
            <Bar dataKey="sayi" radius={[3,3,0,0]}>
              {hourData.map((e,i) => <Cell key={i} fill={e.sayi === maxHour && maxHour > 0 ? '#c4633f' : '#7c9059'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Alt kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="col-span-2 bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
            <h2 className="font-display text-lg md:text-xl text-ink-900">En Çok Sorulan Ürünler</h2>
          </div>
          {urunData.length === 0 ? <p className="text-ink-300 font-mono text-sm">veri yok</p> : (
            <div className="space-y-2.5">
              {urunData.map((u,i) => (
                <div key={u.ad} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-ink-300 w-4 shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-ink-700 truncate mb-1">{u.ad}</div>
                    <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-full bg-moss-400 rounded-full" style={{ width: `${(u.count/urunData[0].count)*100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-mono text-ink-400 shrink-0">{u.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-moss-500" strokeWidth={1.5} />
            <h2 className="font-display text-lg text-ink-900">Tekrar</h2>
          </div>
          <div className="font-display text-3xl md:text-4xl text-moss-700 mb-1">{tekrarlar.length}</div>
          <p className="text-xs text-ink-300 font-mono">tekrar yazan</p>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-3.5 h-3.5 text-moss-600" strokeWidth={1.5} />
              <h2 className="font-display text-base text-ink-900">Sepet</h2>
            </div>
            <div className="font-display text-3xl text-moss-700">{sepetler.length}</div>
          </div>
          <div className="bg-white border border-cream-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5 text-ember-500" strokeWidth={1.5} />
              <h2 className="font-display text-base text-ink-900">KVKK Yok</h2>
            </div>
            <div className="font-display text-3xl text-ember-600">{kvkkHayir.length}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
