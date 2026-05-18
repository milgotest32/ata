'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, TrendingUp, TrendingDown, MousePointer, Eye, DollarSign, Target, Smartphone, Monitor, Tablet } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'
import { format, subDays } from 'date-fns'
import { tr } from 'date-fns/locale'

type Genel = { tarih: string; gosterim: number; tiklama: number; ctr: number; cpc: number; harcama: number; donusum: number }
type Kampanya = { kampanya: string; gosterim: number; tiklama: number; ctr: number; cpc: number; harcama: number; donusum: number; roas: number }
type Keyword = { keyword: string; esleme_turu: string; tiklama: number; ctr: number; cpc: number; harcama: number; kalite_skoru: number }
type Cihaz = { cihaz: string; gosterim: number; tiklama: number; harcama: number }

const COLORS = ['#7c9059', '#c4633f', '#d9c07a', '#928c79']

export default function ReklamlarPage() {
  const [genel, setGenel] = useState<Genel[]>([])
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([])
  const [keywordler, setKeywordler] = useState<Keyword[]>([])
  const [cihazlar, setCihazlar] = useState<Cihaz[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'genel' | 'kampanya' | 'keyword' | 'cihaz'>('genel')
  const [aralik, setAralik] = useState(30)
  const [bosVeri, setBosVeri] = useState(false)

  useEffect(() => { load() }, [aralik])

  async function load() {
    setLoading(true)
    const since = format(subDays(new Date(), aralik), 'yyyy-MM-dd')

    const [g, k, kw, c] = await Promise.all([
      supabase.from('ads_genel').select('*').gte('tarih', since).order('tarih'),
      supabase.from('ads_kampanya').select('*').gte('tarih', since).order('harcama', { ascending: false }),
      supabase.from('ads_keyword').select('*').gte('tarih', since).order('tiklama', { ascending: false }).limit(20),
      supabase.from('ads_cihaz').select('*').gte('tarih', since),
    ])

    const genelData = (g.data || []) as Genel[]
    const kampanyaData = (k.data || []) as Kampanya[]
    const keywordData = (kw.data || []) as Keyword[]
    const cihazData = (c.data || []) as Cihaz[]

    setGenel(genelData)
    setKampanyalar(kampanyaData)
    setKeywordler(keywordData)
    setCihazlar(cihazData)
    setBosVeri(genelData.length === 0)
    setLoading(false)
  }

  // Özet hesapla
  const toplamHarcama = genel.reduce((s, g) => s + g.harcama, 0)
  const toplamTiklama = genel.reduce((s, g) => s + g.tiklama, 0)
  const toplamGosterim = genel.reduce((s, g) => s + g.gosterim, 0)
  const toplamDonusum = genel.reduce((s, g) => s + g.donusum, 0)
  const ortCtr = toplamGosterim > 0 ? (toplamTiklama / toplamGosterim * 100) : 0
  const ortCpc = toplamTiklama > 0 ? toplamHarcama / toplamTiklama : 0
  const roas = toplamHarcama > 0 ? toplamDonusum / toplamHarcama : 0

  // Cihaz gruplaması
  const cihazGrup: Record<string, { gosterim: number; tiklama: number; harcama: number }> = {}
  cihazlar.forEach(c => {
    if (!cihazGrup[c.cihaz]) cihazGrup[c.cihaz] = { gosterim: 0, tiklama: 0, harcama: 0 }
    cihazGrup[c.cihaz].gosterim += c.gosterim
    cihazGrup[c.cihaz].tiklama += c.tiklama
    cihazGrup[c.cihaz].harcama += c.harcama
  })
  const cihazData = Object.entries(cihazGrup).map(([name, v]) => ({ name, ...v }))

  const tooltipStyle = { background: '#fdfcf7', border: '1px solid #e8d9a8', borderRadius: '8px', fontSize: '11px' }

  if (bosVeri && !loading) {
    return (
      <div className="p-4 md:p-10 max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">google ads</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Reklam Raporları</h1>
        </header>
        <div className="bg-white border border-cream-200 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-cream-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-ink-300" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-2xl text-ink-900 mb-2">Henüz veri yok</h2>
          <p className="text-ink-400 text-sm mb-6 max-w-md mx-auto">Google Ads raporlarını Google Sheets'e aktarıp n8n workflow'unu aktif ettiğinde veriler buraya otomatik gelecek.</p>
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-xs font-mono text-ink-500 mb-2 font-medium">Kurulum adımları:</p>
            <ol className="space-y-1.5">
              {[
                'Google Ads → Reports → Kampanyalar',
                '⋮ → Schedule → Google Sheets "milgo-ads"',
                'Aynısını Keyword, Cihaz için yap',
                'n8n\'de google_ads_workflow.json import et',
                'SHEETS_DOSYA_ID\'yi güncelle → Aktif et',
              ].map((s, i) => (
                <li key={i} className="text-xs text-ink-500 flex gap-2">
                  <span className="font-mono text-ink-300 shrink-0">{i+1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">google ads</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Reklam Raporları</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Toplam Harcama', value: `${toplamHarcama.toLocaleString('tr')} TL`, icon: DollarSign, sub: `${aralik} gün`, color: 'bg-ink-900 border-ink-700 text-cream-50' },
          { label: 'Tıklama', value: toplamTiklama.toLocaleString('tr'), icon: MousePointer, sub: `ORT CPC: ${ortCpc.toFixed(2)} TL`, color: 'bg-white border-cream-200' },
          { label: 'Gösterim', value: toplamGosterim.toLocaleString('tr'), icon: Eye, sub: `ORT CTR: %${ortCtr.toFixed(2)}`, color: 'bg-white border-cream-200' },
          { label: 'Dönüşüm', value: toplamDonusum.toLocaleString('tr'), icon: Target, sub: `ROAS: ${roas.toFixed(2)}x`, color: 'bg-moss-50 border-moss-200' },
        ].map(({ label, value, icon: Icon, sub, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`text-[10px] uppercase tracking-[0.2em] ${color.includes('ink-900') ? 'text-ink-300' : 'text-ink-400'}`}>{label}</span>
              <Icon className={`w-4 h-4 ${color.includes('ink-900') ? 'text-ink-400' : 'text-ink-300'}`} strokeWidth={1.5} />
            </div>
            <div className={`font-display text-2xl md:text-3xl mb-1 ${color.includes('ink-900') ? 'text-cream-50' : 'text-ink-900'}`}>{value}</div>
            <div className={`text-[10px] font-mono ${color.includes('ink-900') ? 'text-ink-400' : 'text-ink-300'}`}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Tablar */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-white border border-cream-200 rounded-xl p-1">
        {[{v:'genel',l:'📈 Genel Trend'},{v:'kampanya',l:'🎯 Kampanyalar'},{v:'keyword',l:'🔑 Keywordler'},{v:'cihaz',l:'📱 Cihazlar'}].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all ${tab === t.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Genel Trend */}
      {tab === 'genel' && (
        <div className="space-y-4">
          <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
            <h2 className="font-display text-xl md:text-2xl text-ink-900 mb-6">Günlük Tıklama Trendi</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={genel} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <XAxis dataKey="tarih" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false}
                  tickFormatter={v => format(new Date(v), 'd MMM', { locale: tr })} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={v => format(new Date(v), 'd MMMM', { locale: tr })} />
                <Line type="monotone" dataKey="tiklama" stroke="#7c9059" strokeWidth={2} dot={false} name="Tıklama" />
                <Line type="monotone" dataKey="gosterim" stroke="#d9c07a" strokeWidth={1.5} dot={false} name="Gösterim" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
              <h2 className="font-display text-xl text-ink-900 mb-6">Günlük Harcama</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={genel} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="tarih" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false}
                    tickFormatter={v => format(new Date(v), 'd MMM', { locale: tr })} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${Number(v).toFixed(2)} TL`, 'Harcama']} />
                  <Bar dataKey="harcama" fill="#c4633f" radius={[4,4,0,0]} name="Harcama" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
              <h2 className="font-display text-xl text-ink-900 mb-6">CTR Trendi</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={genel} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="tarih" tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false}
                    tickFormatter={v => format(new Date(v), 'd MMM', { locale: tr })} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#928c79' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`%${Number(v).toFixed(2)}`, 'CTR']} />
                  <Line type="monotone" dataKey="ctr" stroke="#d97757" strokeWidth={2} dot={false} name="CTR" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Kampanyalar */}
      {tab === 'kampanya' && (
        <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-cream-50">
                <tr>{['Kampanya','Gösterim','Tıklama','CTR','CPC','Harcama','Dönüşüm','ROAS'].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {kampanyalar.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-ink-300 font-mono text-sm">veri yok</td></tr>
                ) : kampanyalar.map((k, i) => (
                  <tr key={i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-ink-700 font-medium max-w-[200px] truncate">{k.kampanya}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-500">{k.gosterim?.toLocaleString('tr')}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-700 font-medium">{k.tiklama?.toLocaleString('tr')}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-500">%{k.ctr?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-500">{k.cpc?.toFixed(2)} TL</td>
                    <td className="px-4 py-3 font-mono text-sm text-ember-600 font-medium">{k.harcama?.toLocaleString('tr')} TL</td>
                    <td className="px-4 py-3 font-mono text-sm text-moss-600">{k.donusum?.toFixed(0)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm font-medium ${k.roas >= 2 ? 'text-moss-600' : k.roas >= 1 ? 'text-ink-500' : 'text-ember-500'}`}>
                        {k.roas?.toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Keywordler */}
      {tab === 'keyword' && (
        <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-cream-50">
                <tr>{['Keyword','Eşleme','Tıklama','CTR','CPC','Harcama','Kalite'].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {keywordler.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-ink-300 font-mono text-sm">veri yok</td></tr>
                ) : keywordler.map((k, i) => (
                  <tr key={i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-ink-700 font-medium">{k.keyword}</td>
                    <td className="px-4 py-3"><span className="text-[10px] bg-cream-100 text-ink-500 px-2 py-0.5 rounded-full font-mono">{k.esleme_turu}</span></td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-700 font-medium">{k.tiklama?.toLocaleString('tr')}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-500">%{k.ctr?.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-sm text-ink-500">{k.cpc?.toFixed(2)} TL</td>
                    <td className="px-4 py-3 font-mono text-sm text-ember-600">{k.harcama?.toLocaleString('tr')} TL</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-cream-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-moss-400" style={{ width: `${(k.kalite_skoru || 0) * 10}%` }} />
                        </div>
                        <span className="font-mono text-xs text-ink-400">{k.kalite_skoru}/10</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cihazlar */}
      {tab === 'cihaz' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
            <h2 className="font-display text-xl text-ink-900 mb-6">Cihaz Dağılımı</h2>
            {cihazData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-ink-300 font-mono text-sm">veri yok</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={cihazData} dataKey="tiklama" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} %${(percent*100).toFixed(0)}`}>
                    {cihazData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} tıklama`, '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-8">
            <h2 className="font-display text-xl text-ink-900 mb-6">Cihaz Detayı</h2>
            <div className="space-y-4">
              {cihazData.map((c, i) => {
                const Icon = c.name?.toLowerCase().includes('mobile') ? Smartphone : c.name?.toLowerCase().includes('tablet') ? Tablet : Monitor
                const total = cihazData.reduce((s, d) => s + d.tiklama, 0)
                const pct = total > 0 ? Math.round(c.tiklama / total * 100) : 0
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
                        <span className="text-sm text-ink-700 font-medium">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-ink-400">{c.tiklama?.toLocaleString('tr')} tık</span>
                        <span className="text-xs font-mono text-ember-500">{c.harcama?.toLocaleString('tr')} TL</span>
                        <span className="text-xs font-mono text-ink-300">%{pct}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
              {cihazData.length === 0 && <p className="text-ink-300 font-mono text-sm">veri yok</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
