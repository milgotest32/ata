'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShoppingBag, Package, CheckCircle2, Truck, Search, X, RefreshCw, AlertTriangle, ChevronRight, Printer, MessageSquare, RotateCcw, MapPin, Phone, Mail, Tag } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { tr } from 'date-fns/locale'

type LineItem = { id: number; title: string; quantity: number; price: string; sku: string; variant_title: string }
type Order = {
  id: number; order_number: number; name: string; email: string; phone: string
  customer_name: string; customer_id: number; total_price: string; currency: string
  financial_status: string; fulfillment_status: string; created_at: string
  tags: string; note: string; shipping_address: any; line_items: LineItem[]
  fulfillments: any[]; has_refund: boolean; tracking_number: string; tracking_url: string
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Ödendi', pending: 'Beklemede', refunded: 'İade', partially_refunded: 'Kısmi İade',
  fulfilled: 'Teslim', unfulfilled: 'Hazırlanıyor', partial: 'Kısmi Teslim', null: 'Bekliyor'
}
const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-moss-100 text-moss-700', pending: 'bg-cream-200 text-ink-600',
  refunded: 'bg-ember-100 text-ember-700', partially_refunded: 'bg-ember-50 text-ember-600',
  fulfilled: 'bg-moss-100 text-moss-700', unfulfilled: 'bg-cream-200 text-ink-600',
  partial: 'bg-cream-300 text-ink-600'
}

export default function SiparislerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unfulfilled' | 'fulfilled' | 'refunded'>('all')
  const [selected, setSelected] = useState<Order | null>(null)
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState({ number: '', url: '', company: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selected) {
      setNote(selected.note || '')
      setTracking({ number: selected.tracking_number || '', url: selected.tracking_url || '', company: '' })
    }
  }, [selected])

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.includes(search)
    const matchFilter = filter === 'all' ||
      (filter === 'unfulfilled' && (!o.fulfillment_status || o.fulfillment_status === 'unfulfilled')) ||
      (filter === 'fulfilled' && o.fulfillment_status === 'fulfilled') ||
      (filter === 'refunded' && o.has_refund)
    return matchSearch && matchFilter
  })

  const stats = {
    toplam: orders.length,
    gelir: orders.filter(o => o.financial_status === 'paid').reduce((s, o) => s + parseFloat(o.total_price || '0'), 0),
    bekleyen: orders.filter(o => !o.fulfillment_status || o.fulfillment_status === 'unfulfilled').length,
    iade: orders.filter(o => o.has_refund).length,
  }

  async function saveNote() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/shopify/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, action: 'note', data: { note } })
    })
    setSaving(false)
    load()
  }

  async function fulfill() {
    if (!selected) return
    if (!confirm('Bu siparişi teslim edildi olarak işaretlemek istiyor musunuz?')) return
    setSaving(true)
    await fetch('/api/shopify/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id, action: 'fulfill',
        data: { tracking_number: tracking.number, tracking_url: tracking.url, tracking_company: tracking.company, notify: true }
      })
    })
    setSaving(false)
    setSelected(null)
    load()
  }

  function printInvoice(o: Order) {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fatura ${o.name}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: system-ui; padding: 40px; color: #1a1916; }
      .header { display:flex; justify-content:space-between; border-bottom: 2px solid #1a1916; padding-bottom: 20px; margin-bottom: 30px; }
      .logo { font-size: 28px; font-weight: 700; }
      .logo span { color: #7c9059; }
      h2 { font-size: 20px; margin-bottom: 20px; }
      .info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
      .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #928c79; margin-bottom: 4px; }
      table { width:100%; border-collapse:collapse; }
      th { background: #1a1916; color: white; padding: 10px 14px; text-align:left; font-size:11px; text-transform:uppercase; }
      td { padding: 12px 14px; border-bottom: 1px solid #e8dfc8; font-size: 14px; }
      .total { text-align:right; margin-top:20px; font-size:18px; font-weight:700; }
      .footer { margin-top:40px; color:#928c79; font-size:12px; font-family:monospace; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <div class="header">
      <div class="logo">milgo<span>.</span></div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:600">${o.name}</div>
        <div style="color:#928c79;font-family:monospace">${format(new Date(o.created_at), 'd MMMM yyyy', { locale: tr })}</div>
      </div>
    </div>
    <div class="info">
      <div>
        <div class="label">Müşteri</div>
        <div style="font-size:15px;font-weight:600">${o.customer_name || '—'}</div>
        <div style="color:#928c79">${o.email || ''}</div>
        <div style="color:#928c79">${o.phone || ''}</div>
      </div>
      <div>
        <div class="label">Teslimat Adresi</div>
        <div>${o.shipping_address?.address1 || '—'}</div>
        <div>${o.shipping_address?.address2 || ''}</div>
        <div>${o.shipping_address?.city || ''} ${o.shipping_address?.zip || ''}</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Ürün</th><th>SKU</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr></thead>
      <tbody>
        ${o.line_items.map(li => `<tr>
          <td>${li.title}${li.variant_title ? ` - ${li.variant_title}` : ''}</td>
          <td style="font-family:monospace;font-size:12px">${li.sku || '—'}</td>
          <td>${li.quantity}</td>
          <td>${parseFloat(li.price).toLocaleString('tr')} TL</td>
          <td>${(parseFloat(li.price) * li.quantity).toLocaleString('tr')} TL</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="total">Toplam: ${parseFloat(o.total_price).toLocaleString('tr')} TL</div>
    ${o.note ? `<div style="margin-top:20px;padding:12px;background:#f5f0e8;border-radius:8px;font-size:13px"><strong>Not:</strong> ${o.note}</div>` : ''}
    <div class="footer">milgo. · market.milgo.com.tr · ${new Date().toLocaleString('tr')}</div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`)
    win.document.close()
  }

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">shopify · {orders.length} sipariş</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Siparişler</h1>
        </div>
        <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-cream-200 rounded-xl text-ink-400 hover:text-ink-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Özet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Toplam Gelir', value: `${stats.gelir.toLocaleString('tr')} TL`, icon: ShoppingBag, color: 'bg-moss-50 border-moss-200' },
          { label: 'Toplam Sipariş', value: stats.toplam, icon: Package, color: 'bg-white border-cream-200' },
          { label: 'Hazırlanıyor', value: stats.bekleyen, icon: Truck, color: stats.bekleyen > 0 ? 'bg-cream-100 border-cream-300' : 'bg-white border-cream-200' },
          { label: 'İade', value: stats.iade, icon: RotateCcw, color: stats.iade > 0 ? 'bg-ember-50 border-ember-200' : 'bg-white border-cream-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">{label}</span>
              <Icon className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl md:text-3xl text-ink-900">{value}</div>
          </div>
        ))}
      </div>

      {/* İade uyarısı */}
      {stats.iade > 0 && (
        <div className="mb-4 bg-ember-50 border border-ember-200 rounded-2xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-ember-500 shrink-0" strokeWidth={1.5} />
          <span className="text-ember-700 text-sm font-medium">{stats.iade} iade talebi var</span>
          <button onClick={() => setFilter('refunded')} className="ml-auto text-xs text-ember-600 underline">Göster</button>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input type="text" placeholder="Sipariş no, müşteri, e-posta, telefon..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-cream-200 rounded-xl text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:border-moss-400" />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-300"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex bg-white border border-cream-200 rounded-xl p-1 gap-1">
          {[{v:'all',l:'Hepsi'},{v:'unfulfilled',l:'Hazırlanıyor'},{v:'fulfilled',l:'Teslim'},{v:'refunded',l:'İade'}].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v as any)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filter === f.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Mobil: kart listesi */}
      <div className="md:hidden space-y-2">
        {loading ? [1,2,3].map(i => <div key={i} className="h-24 bg-cream-100 rounded-2xl animate-pulse" />) :
        filtered.map(o => (
          <div key={o.id} onClick={() => setSelected(o)} className="bg-white border border-cream-200 rounded-2xl p-4 cursor-pointer hover:border-moss-300 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-mono text-sm font-medium text-ink-900">{o.name}</span>
                <span className="text-xs text-ink-400 ml-2">{o.customer_name || ""}</span>
              </div>
              <span className="font-mono text-sm font-medium text-ink-900">{parseFloat(o.total_price).toLocaleString('tr')} TL</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.financial_status] || 'bg-cream-100 text-ink-500'}`}>{STATUS_LABEL[o.financial_status]}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.fulfillment_status || 'unfulfilled'] || 'bg-cream-100 text-ink-500'}`}>{STATUS_LABEL[o.fulfillment_status || 'unfulfilled'] || 'Bekliyor'}</span>
              {o.has_refund && <span className="text-[10px] px-2 py-0.5 rounded-full bg-ember-100 text-ember-700 font-medium">İade</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Masaüstü tablo */}
      <div className="hidden md:block bg-white border border-cream-200 rounded-2xl overflow-hidden">
        {loading ? <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="animate-pulse h-12 bg-cream-100 rounded-xl" />)}</div> : (
          <table className="w-full">
            <thead className="bg-cream-50">
              <tr>{['Sipariş','Müşteri','Ürünler','Tutar','Ödeme','Kargo','Tarih',''].map(h => (
                <th key={h} className="px-5 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} onClick={() => setSelected(o)} className="border-t border-cream-100 hover:bg-cream-50 cursor-pointer transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-mono text-sm font-medium text-ink-900">{o.name}</div>
                    {o.has_refund && <span className="text-[10px] text-ember-600 font-medium">⚠ İade</span>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-ink-700">{o.customer_name || '—'}</div>
                    <div className="text-xs text-ink-400 font-mono">{o.email || o.phone || ''}</div>
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-500">
                    {o.line_items?.slice(0,2).map(li => <div key={li.id} className="truncate max-w-[160px]">{li.title} ×{li.quantity}</div>)}
                    {o.line_items?.length > 2 && <div className="text-ink-300">+{o.line_items.length - 2} ürün</div>}
                  </td>
                  <td className="px-5 py-4 font-mono text-sm font-medium text-ink-900">{parseFloat(o.total_price).toLocaleString('tr')} TL</td>
                  <td className="px-5 py-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.financial_status] || 'bg-cream-100 text-ink-500'}`}>{STATUS_LABEL[o.financial_status]}</span></td>
                  <td className="px-5 py-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[o.fulfillment_status || 'unfulfilled'] || 'bg-cream-100 text-ink-500'}`}>{STATUS_LABEL[o.fulfillment_status || 'unfulfilled'] || 'Bekliyor'}</span></td>
                  <td className="px-5 py-4 text-xs text-ink-300 font-mono">{formatDistanceToNow(new Date(o.created_at), { addSuffix: true, locale: tr })}</td>
                  <td className="px-5 py-4"><ChevronRight className="w-4 h-4 text-ink-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="p-12 text-center text-ink-300 font-mono text-sm">sipariş bulunamadı</div>}
      </div>

      {/* Sipariş Detay Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-cream-50 h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-cream-200 z-10 p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-bold text-ink-900">{selected.name}</div>
                  <div className="text-xs text-ink-400 font-mono mt-0.5">{format(new Date(selected.created_at), "d MMMM yyyy HH:mm", { locale: tr })}</div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[selected.financial_status]}`}>{STATUS_LABEL[selected.financial_status]}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[selected.fulfillment_status || 'unfulfilled']}`}>{STATUS_LABEL[selected.fulfillment_status || 'unfulfilled'] || 'Bekliyor'}</span>
                    {selected.has_refund && <span className="text-[10px] px-2 py-0.5 rounded-full bg-ember-100 text-ember-700 font-medium">İade Var</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => printInvoice(selected)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-100 text-ink-400 hover:text-ink-700 transition-colors" title="Fatura Yazdır">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelected(null)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-cream-100 text-ink-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-4">

              {/* Müşteri Bilgisi */}
              <div className="bg-white border border-cream-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-3">Müşteri</div>
                <div className="font-medium text-ink-900 mb-2">{selected.customer_name || '—'}</div>
                <div className="space-y-1.5">
                  {selected.email && <div className="flex items-center gap-2 text-sm text-ink-500"><Mail className="w-3.5 h-3.5 text-ink-300" strokeWidth={1.5} />{selected.email}</div>}
                  {selected.phone && <div className="flex items-center gap-2 text-sm text-ink-500"><Phone className="w-3.5 h-3.5 text-ink-300" strokeWidth={1.5} />{selected.phone}</div>}
                </div>
              </div>

              {/* Teslimat Adresi */}
              {selected.shipping_address && (
                <div className="bg-white border border-cream-200 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />Teslimat Adresi
                  </div>
                  <div className="text-sm text-ink-700 space-y-0.5">
                    <div>{selected.shipping_address.address1}</div>
                    {selected.shipping_address.address2 && <div>{selected.shipping_address.address2}</div>}
                    <div>{selected.shipping_address.city} {selected.shipping_address.zip}</div>
                    <div className="text-ink-400">{selected.shipping_address.country}</div>
                  </div>
                </div>
              )}

              {/* Ürünler */}
              <div className="bg-white border border-cream-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-cream-100 text-[10px] uppercase tracking-[0.2em] text-ink-300">Ürünler</div>
                <div className="divide-y divide-cream-100">
                  {selected.line_items.map(li => (
                    <div key={li.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink-700 font-medium truncate">{li.title}</div>
                        {li.variant_title && <div className="text-xs text-ink-400">{li.variant_title}</div>}
                        {li.sku && <div className="text-[10px] text-ink-300 font-mono">{li.sku}</div>}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-sm font-mono text-ink-700">{parseFloat(li.price).toLocaleString('tr')} TL</div>
                        <div className="text-xs text-ink-400">×{li.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-cream-200 flex items-center justify-between bg-cream-50">
                  <span className="text-sm font-medium text-ink-700">Toplam</span>
                  <span className="font-mono font-bold text-ink-900">{parseFloat(selected.total_price).toLocaleString('tr')} TL</span>
                </div>
              </div>

              {/* Tags */}
              {selected.tags && (
                <div className="bg-white border border-cream-200 rounded-xl p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" />Etiketler</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 bg-cream-100 text-ink-500 rounded-full font-mono">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Kargo Takip */}
              <div className="bg-white border border-cream-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-3 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" strokeWidth={1.5} />Kargo Bilgisi
                </div>
                {selected.tracking_number ? (
                  <div className="space-y-1">
                    <div className="text-sm font-mono text-ink-700 font-medium">{selected.tracking_number}</div>
                    {selected.tracking_url && <a href={selected.tracking_url} target="_blank" className="text-xs text-moss-600 underline">Takip Et →</a>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input type="text" placeholder="Takip numarası" value={tracking.number}
                      onChange={e => setTracking(t => ({ ...t, number: e.target.value }))}
                      className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-ink-700 focus:outline-none focus:border-moss-400" />
                    <input type="text" placeholder="Kargo şirketi (opsiyonel)" value={tracking.company}
                      onChange={e => setTracking(t => ({ ...t, company: e.target.value }))}
                      className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-ink-700 focus:outline-none focus:border-moss-400" />
                  </div>
                )}
              </div>

              {/* Not */}
              <div className="bg-white border border-cream-200 rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-300 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />Sipariş Notu
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Not ekle... (müşteri aradı, adres değişti vs.)"
                  className="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm text-ink-700 focus:outline-none focus:border-moss-400 resize-none" />
                <button onClick={saveNote} disabled={saving}
                  className="mt-2 px-4 py-2 bg-ink-900 text-cream-50 rounded-lg text-xs font-medium hover:bg-ink-700 transition-colors disabled:opacity-40">
                  {saving ? 'Kaydediliyor...' : 'Notu Kaydet'}
                </button>
              </div>

              {/* Aksiyonlar */}
              <div className="space-y-2 pt-2">
                {(!selected.fulfillment_status || selected.fulfillment_status === 'unfulfilled') && (
                  <button onClick={fulfill} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-moss-600 text-white rounded-xl text-sm font-medium hover:bg-moss-700 transition-colors disabled:opacity-40">
                    <CheckCircle2 className="w-4 h-4" />
                    Teslim Edildi Olarak İşaretle
                  </button>
                )}
                {selected.customer_name && (
                  <a href={`/konusmalar`}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-cream-200 text-ink-600 rounded-xl text-sm font-medium hover:bg-cream-50 transition-colors">
                    💬 Müşteri Konuşmalarına Git
                  </a>
                )}
                <button onClick={() => printInvoice(selected)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-cream-200 text-ink-600 rounded-xl text-sm font-medium hover:bg-cream-50 transition-colors">
                  <Printer className="w-4 h-4" />Fatura Yazdır
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
