'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Download, FileText } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { tr } from 'date-fns/locale'

export default function MuhasebePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [odemeler, setOdemeler] = useState<any[]>([])
  const [aboneler, setAboneler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [secilenAy, setSecilenAy] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [o, od, ab] = await Promise.all([
      fetch('/api/shopify/orders').then(r => r.json()),
      fetch('/api/odeme').then(r => r.json()),
      fetch('/api/aboneliker').then(r => r.json()),
    ])
    setOrders(o.orders || [])
    setOdemeler(od.odemeler || [])
    setAboneler(ab.subs || [])
    setLoading(false)
  }

  const aylikOzetler = Array.from({ length: 6 }, (_, i) => {
    const ay = subMonths(new Date(), 5 - i)
    const ayStr = format(ay, 'yyyy-MM')
    const ayBas = startOfMonth(ay)
    const ayBit = endOfMonth(ay)

    const ayOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= ayBas && d <= ayBit && o.financial_status === 'paid'
    })
    const ayOdemeler = odemeler.filter(o => {
      const d = new Date(o.created_at)
      return d >= ayBas && d <= ayBit && o.durum === 'odendi'
    })
    const aktifAboneler = aboneler.filter((a: any) => a.durum === 'abone')
    const abonelikGelir = aktifAboneler.reduce((s: number, a: any) => s + (a.haftalik_adet * (a.fiyat_tekil || 130) * 4), 0)

    return {
      ayStr, ay: format(ay, 'MMMM yyyy', { locale: tr }),
      siparisMali: ayOrders.reduce((s, o) => s + parseFloat(o.total_price), 0),
      odemeGelir: ayOdemeler.reduce((s, o) => s + o.tutar, 0),
      abonelikGelir, siparisSayisi: ayOrders.length,
      toplam: ayOrders.reduce((s, o) => s + parseFloat(o.total_price), 0) + ayOdemeler.reduce((s, o) => s + o.tutar, 0),
      orders: ayOrders, odemeler: ayOdemeler,
    }
  })

  const secilenOzet = aylikOzetler.find(a => a.ayStr === secilenAy) || aylikOzetler[aylikOzetler.length - 1]
  const maxGelir = Math.max(...aylikOzetler.map(a => a.toplam), 1)
  const buAy = aylikOzetler[aylikOzetler.length - 1]
  const gecenAy = aylikOzetler[aylikOzetler.length - 2]
  const trend = gecenAy?.toplam > 0 ? Math.round(((buAy.toplam - gecenAy.toplam) / gecenAy.toplam) * 100) : null

  function exportCSV() {
    if (!secilenOzet) return
    const rows = [
      ['Kaynak', 'Tarih', 'Müşteri', 'Telefon', 'Tutar', 'Tür', 'Durum'],
      ...secilenOzet.orders.map(o => ['Shopify', format(new Date(o.created_at), 'd MMM yyyy'), o.customer_name || '', o.phone || '', parseFloat(o.total_price), 'Sipariş', o.financial_status]),
      ...secilenOzet.odemeler.map(o => ['Manuel', format(new Date(o.created_at), 'd MMM yyyy'), o.ad, o.telefon, o.tutar, o.odeme_turu, o.durum]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `milgo-muhasebe-${secilenAy}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    if (!secilenOzet) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Muhasebe ${secilenOzet.ay}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;padding:40px;color:#1a1916}.logo{font-size:28px;font-weight:700}.logo span{color:#7c9059}.header{display:flex;justify-content:space-between;border-bottom:2px solid #1a1916;padding-bottom:20px;margin-bottom:30px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:30px}.card{background:#f5f0e8;border-radius:12px;padding:16px}.label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#928c79;margin-bottom:6px}.value{font-size:24px;font-weight:700}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#1a1916;color:white;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase}td{padding:10px 14px;border-bottom:1px solid #e8dfc8;font-size:13px}h2{font-size:18px;margin:20px 0 12px}.footer{color:#928c79;font-size:12px;font-family:monospace;border-top:1px solid #e8dfc8;padding-top:16px;margin-top:20px}</style>
    </head><body>
    <div class="header"><div class="logo">milgo<span>.</span></div><div style="text-align:right"><div style="font-size:20px;font-weight:600">Muhasebe Raporu</div><div style="color:#928c79">${secilenOzet.ay}</div></div></div>
    <div class="summary">
      <div class="card"><div class="label">Shopify Geliri</div><div class="value">${secilenOzet.siparisMali.toLocaleString('tr')} TL</div></div>
      <div class="card"><div class="label">Manuel Ödeme</div><div class="value">${secilenOzet.odemeGelir.toLocaleString('tr')} TL</div></div>
      <div class="card"><div class="label">Toplam</div><div class="value">${secilenOzet.toplam.toLocaleString('tr')} TL</div></div>
    </div>
    ${secilenOzet.orders.length > 0 ? `<h2>Shopify Siparişleri (${secilenOzet.orders.length})</h2><table><thead><tr><th>Sipariş</th><th>Tarih</th><th>Müşteri</th><th>Tutar</th></tr></thead><tbody>${secilenOzet.orders.map(o => `<tr><td>${o.name}</td><td>${format(new Date(o.created_at), 'd MMM yyyy', { locale: tr })}</td><td>${o.customer_name || '—'}</td><td>${parseFloat(o.total_price).toLocaleString('tr')} TL</td></tr>`).join('')}</tbody></table>` : ''}
    ${secilenOzet.odemeler.length > 0 ? `<h2>Manuel Ödemeler (${secilenOzet.odemeler.length})</h2><table><thead><tr><th>Tarih</th><th>Müşteri</th><th>Tutar</th><th>Tür</th></tr></thead><tbody>${secilenOzet.odemeler.map(o => `<tr><td>${format(new Date(o.created_at), 'd MMM yyyy', { locale: tr })}</td><td>${o.ad} — ${o.telefon}</td><td>${o.tutar.toLocaleString('tr')} TL</td><td>${o.odeme_turu}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="footer">milgo. · ${new Date().toLocaleString('tr')} · Toplam: ${secilenOzet.toplam.toLocaleString('tr')} TL</div>
    <script>window.onload=()=>window.print()</script></body></html>`)
    win.document.close()
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">gelir takibi</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Muhasebe</h1>
        </div>
        <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-cream-200 rounded-xl text-ink-400 hover:text-ink-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Bu Ay Toplam', value: `${buAy.toplam.toLocaleString('tr')} TL`, sub: trend !== null ? `${trend > 0 ? '+' : ''}${trend}% geçen ay` : '', color: 'bg-ink-900 border-ink-700 text-cream-50' },
          { label: 'Shopify', value: `${buAy.siparisMali.toLocaleString('tr')} TL`, sub: `${buAy.siparisSayisi} sipariş`, color: 'bg-moss-50 border-moss-200' },
          { label: 'Manuel', value: `${buAy.odemeGelir.toLocaleString('tr')} TL`, sub: `${buAy.odemeler.length} kayıt`, color: 'bg-white border-cream-200' },
          { label: 'Abonelik (tahmini)', value: `${buAy.abonelikGelir.toLocaleString('tr')} TL`, sub: '4 hafta × adet', color: 'bg-cream-100 border-cream-300' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className={`text-[10px] uppercase tracking-[0.2em] mb-3 ${color.includes('ink-900') ? 'text-ink-300' : 'text-ink-400'}`}>{label}</div>
            <div className={`font-display text-2xl md:text-3xl mb-1 ${color.includes('ink-900') ? 'text-cream-50' : 'text-ink-900'}`}>{value}</div>
            {sub && <div className={`text-[10px] font-mono ${color.includes('ink-900') ? 'text-ink-400' : 'text-ink-300'}`}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* 6 aylık bar */}
      <div className="bg-white border border-cream-200 rounded-2xl p-4 md:p-6 mb-6">
        <h2 className="font-display text-xl text-ink-900 mb-5">6 Aylık Gelir Trendi</h2>
        <div className="flex items-end gap-2 md:gap-3 h-32">
          {aylikOzetler.map((a, i) => {
            const pct = maxGelir > 0 ? (a.toplam / maxGelir) * 100 : 0
            const isSelected = a.ayStr === secilenAy
            return (
              <div key={a.ayStr} className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setSecilenAy(a.ayStr)}>
                <div className="text-[9px] font-mono text-ink-400">{a.toplam > 0 ? `${Math.round(a.toplam / 1000)}K` : '—'}</div>
                <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 4)}%`, background: isSelected ? '#1a1916' : i === aylikOzetler.length - 1 ? '#7c9059' : '#cfd9b4' }} />
                <div className={`text-[9px] font-mono text-center ${isSelected ? 'text-ink-900 font-bold' : 'text-ink-400'}`}>
                  {format(new Date(a.ayStr + '-01'), 'MMM', { locale: tr })}
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-ink-300 font-mono mt-2">Aya tıklayarak detay görüntüle</p>
      </div>

      {/* Seçilen ay detayı */}
      {secilenOzet && (
        <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-cream-200 bg-cream-50 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display text-xl text-ink-900">{secilenOzet.ay}</h2>
              <p className="text-xs text-ink-400 font-mono">{secilenOzet.siparisSayisi} sipariş · {secilenOzet.toplam.toLocaleString('tr')} TL</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-cream-200 rounded-xl text-xs text-ink-600 hover:bg-cream-50 transition-colors">
                <Download className="w-3.5 h-3.5" />CSV İndir
              </button>
              <button onClick={printReport} className="flex items-center gap-2 px-3 py-2 bg-ink-900 text-cream-50 rounded-xl text-xs font-medium hover:bg-ink-700 transition-colors">
                <FileText className="w-3.5 h-3.5" />PDF Rapor
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead className="bg-cream-50/50">
                <tr>{['Kaynak','Tarih','Müşteri','Tutar','Tür'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {secilenOzet.orders.map(o => (
                  <tr key={`o-${o.id}`} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="px-5 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-moss-100 text-moss-700 font-medium">Shopify</span></td>
                    <td className="px-5 py-3 text-xs text-ink-400 font-mono">{format(new Date(o.created_at), 'd MMM', { locale: tr })}</td>
                    <td className="px-5 py-3"><div className="text-sm text-ink-700">{o.customer_name || '—'}</div><div className="text-[10px] text-ink-400 font-mono">{o.name}</div></td>
                    <td className="px-5 py-3 font-mono text-sm font-bold text-moss-700">+{parseFloat(o.total_price).toLocaleString('tr')} TL</td>
                    <td className="px-5 py-3 text-xs text-ink-500">Sipariş</td>
                  </tr>
                ))}
                {secilenOzet.odemeler.map(o => (
                  <tr key={`od-${o.id}`} className="border-t border-cream-100 hover:bg-cream-50">
                    <td className="px-5 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-cream-200 text-ink-600 font-medium">Manuel</span></td>
                    <td className="px-5 py-3 text-xs text-ink-400 font-mono">{format(new Date(o.created_at), 'd MMM', { locale: tr })}</td>
                    <td className="px-5 py-3"><div className="text-sm text-ink-700">{o.ad}</div><div className="text-[10px] text-ink-400 font-mono">{o.telefon}</div></td>
                    <td className="px-5 py-3 font-mono text-sm font-bold text-moss-700">+{o.tutar.toLocaleString('tr')} TL</td>
                    <td className="px-5 py-3 text-xs text-ink-500">{o.odeme_turu}</td>
                  </tr>
                ))}
                {secilenOzet.orders.length === 0 && secilenOzet.odemeler.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-300 font-mono text-sm">Bu ay kayıt yok</td></tr>
                )}
              </tbody>
              {(secilenOzet.orders.length + secilenOzet.odemeler.length) > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-ink-900">
                    <td colSpan={3} className="px-5 py-3 text-sm font-medium text-ink-700">Toplam</td>
                    <td className="px-5 py-3 font-mono text-base font-bold text-ink-900">{secilenOzet.toplam.toLocaleString('tr')} TL</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
