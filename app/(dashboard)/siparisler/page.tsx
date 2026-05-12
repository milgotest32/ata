'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, Package, CheckCircle2, Truck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

type Order = {
  id: number
  order_number: number
  name: string
  email: string | null
  phone: string | null
  total_price: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  created_at: string
  line_items: Array<{ title: string; quantity: number; price: string }>
}

export default function SiparislerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    toplam: orders.length,
    odenmis: orders.filter((o) => o.financial_status === 'paid').length,
    teslim: orders.filter((o) => o.fulfillment_status === 'fulfilled').length,
    bekleyen: orders.filter(
      (o) => o.financial_status === 'pending' || !o.fulfillment_status
    ).length,
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-3">
          shopify · son {orders.length} sipariş
        </p>
        <h1 className="font-display text-5xl text-ink-900 tracking-tight">
          Siparişler
        </h1>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 stagger">
        {[
          { l: 'Toplam', v: stats.toplam, i: ShoppingBag },
          { l: 'Ödenmiş', v: stats.odenmis, i: CheckCircle2 },
          { l: 'Hazırlanıyor', v: stats.bekleyen, i: Package },
          { l: 'Teslim Edildi', v: stats.teslim, i: Truck },
        ].map(({ l, v, i: Icon }) => (
          <div
            key={l}
            className="bg-white border border-cream-200 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-ink-300">
                {l}
              </span>
              <Icon className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
            </div>
            <div className="font-display text-4xl text-ink-900">{v}</div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream-50">
            <tr>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Sipariş No
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Müşteri
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Ürünler
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Tutar
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Ödeme
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Kargo
              </th>
              <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-t border-cream-100 hover:bg-cream-50 transition-colors"
              >
                <td className="px-6 py-4 font-mono text-sm text-ink-700">
                  #{o.order_number}
                </td>
                <td className="px-6 py-4 text-sm text-ink-700">
                  {o.email || o.phone || '—'}
                </td>
                <td className="px-6 py-4 text-xs text-ink-500 max-w-xs">
                  {o.line_items?.slice(0, 2).map((li) => (
                    <div key={li.title}>
                      {li.title} × {li.quantity}
                    </div>
                  ))}
                  {o.line_items?.length > 2 && (
                    <div className="text-ink-300">
                      +{o.line_items.length - 2} ürün
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-ink-700">
                  {o.total_price} {o.currency}
                </td>
                <td className="px-6 py-4">
                  <StatusPill status={o.financial_status} type="payment" />
                </td>
                <td className="px-6 py-4">
                  <StatusPill
                    status={o.fulfillment_status || 'unfulfilled'}
                    type="fulfillment"
                  />
                </td>
                <td className="px-6 py-4 text-xs text-ink-300 font-mono">
                  {formatDistanceToNow(new Date(o.created_at), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">
            yükleniyor...
          </div>
        )}
        {!loading && orders.length === 0 && (
          <div className="p-12 text-center text-ink-300 font-mono text-sm">
            sipariş bulunamadı
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({
  status,
  type,
}: {
  status: string
  type: 'payment' | 'fulfillment'
}) {
  const labels: Record<string, string> = {
    paid: 'Ödendi',
    pending: 'Beklemede',
    refunded: 'İade',
    fulfilled: 'Teslim',
    unfulfilled: 'Hazırlanıyor',
    partial: 'Kısmi',
  }
  const colors: Record<string, string> = {
    paid: 'bg-moss-100 text-moss-700',
    pending: 'bg-cream-200 text-ink-700',
    refunded: 'bg-ember-500/10 text-ember-600',
    fulfilled: 'bg-moss-100 text-moss-700',
    unfulfilled: 'bg-cream-200 text-ink-700',
    partial: 'bg-cream-300 text-ink-700',
  }
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wide font-medium ${
        colors[status] || 'bg-cream-100 text-ink-500'
      }`}
    >
      {labels[status] || status}
    </span>
  )
}
