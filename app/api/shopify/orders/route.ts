import { NextResponse } from 'next/server'

const SHOP = () => process.env.SHOPIFY_STORE_URL || ''
const TOKEN = () => process.env.SHOPIFY_ACCESS_TOKEN || ''
const REST = () => `https://${SHOP()}/admin/api/2024-01`
const H = () => ({ 'X-Shopify-Access-Token': TOKEN(), 'Content-Type': 'application/json' })

function getName(o: any): string {
  // REST API'de isim kaynakları
  const sources = [
    o.shipping_address?.name,
    o.billing_address?.name,
    o.customer ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(' ') : '',
    o.customer?.email,
    o.email,
  ]
  return sources.map(s => (s || '').trim()).find(s => s.length > 0) || '—'
}

function mapOrder(o: any) {
  return {
    id: o.id,
    order_number: o.order_number,
    name: o.name,
    email: o.email || o.customer?.email || '',
    phone: o.phone || o.customer?.phone || o.shipping_address?.phone || '',
    customer_name: getName(o),
    customer_id: o.customer?.id,
    total_price: o.total_price || '0',
    currency: o.currency || 'TRY',
    financial_status: o.financial_status || '',
    fulfillment_status: o.fulfillment_status || '',
    created_at: o.created_at,
    tags: o.tags || '',
    note: o.note || '',
    shipping_address: o.shipping_address || null,
    billing_address: o.billing_address || null,
    line_items: (o.line_items || []).map((li: any) => ({
      id: li.id, title: li.title, quantity: li.quantity,
      price: li.price, sku: li.sku, variant_title: li.variant_title,
    })),
    fulfillments: o.fulfillments || [],
    has_refund: (o.refunds || []).length > 0,
    tracking_number: o.fulfillments?.[0]?.tracking_number || null,
    tracking_url: o.fulfillments?.[0]?.tracking_url || null,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!SHOP() || !TOKEN()) return NextResponse.json({ orders: [], error: 'Shopify eksik' })

  if (id) {
    const res = await fetch(`${REST()}/orders/${id}.json`, { headers: H() })
    if (!res.ok) return NextResponse.json({ order: null })
    const { order } = await res.json()
    return NextResponse.json({ order: mapOrder(order) })
  }

  try {
    const res = await fetch(
      `${REST()}/orders.json?status=any&limit=50&fields=id,order_number,name,email,phone,total_price,currency,financial_status,fulfillment_status,created_at,tags,note,customer,shipping_address,billing_address,line_items,fulfillments,refunds`,
      { headers: H(), cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ orders: [], error: res.status })
    const { orders } = await res.json()
    return NextResponse.json({ orders: (orders || []).map(mapOrder) })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message })
  }
}

export async function POST(req: Request) {
  const { id, action, data } = await req.json()
  if (!SHOP() || !TOKEN()) return NextResponse.json({ ok: false })

  if (action === 'note') {
    const res = await fetch(`${REST()}/orders/${id}.json`, {
      method: 'PUT', headers: H(),
      body: JSON.stringify({ order: { id, note: data.note } })
    })
    return NextResponse.json({ ok: res.ok })
  }

  if (action === 'fulfill') {
    const res = await fetch(`${REST()}/orders/${id}/fulfillments.json`, {
      method: 'POST', headers: H(),
      body: JSON.stringify({
        fulfillment: {
          notify_customer: data.notify || false,
          tracking_info: data.tracking_number ? {
            number: data.tracking_number, url: data.tracking_url || '',
            company: data.tracking_company || '',
          } : undefined,
        }
      })
    })
    return NextResponse.json({ ok: res.ok })
  }

  return NextResponse.json({ ok: false })
}
