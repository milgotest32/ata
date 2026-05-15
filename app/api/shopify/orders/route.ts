import { NextResponse } from 'next/server'

const SHOPIFY_URL = () => `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01`
const HEADERS = () => ({
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '',
  'Content-Type': 'application/json',
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const shop = process.env.SHOPIFY_STORE_URL
  const token = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shop || !token) {
    return NextResponse.json({ orders: [], error: 'Shopify yapılandırılmamış' })
  }

  // Tek sipariş detayı
  if (id) {
    const res = await fetch(`${SHOPIFY_URL()}/orders/${id}.json?fields=id,order_number,name,email,phone,total_price,subtotal_price,total_tax,currency,financial_status,fulfillment_status,created_at,updated_at,tags,note,line_items,shipping_address,billing_address,fulfillments,refunds,customer`, {
      headers: HEADERS()
    })
    if (!res.ok) return NextResponse.json({ order: null, error: res.status })
    const data = await res.json()
    return NextResponse.json({ order: data.order })
  }

  // Sipariş listesi
  try {
    const res = await fetch(
      `${SHOPIFY_URL()}/orders.json?status=any&limit=50&fields=id,order_number,name,email,phone,total_price,currency,financial_status,fulfillment_status,created_at,tags,note,line_items,shipping_address,fulfillments,refunds,customer`,
      { headers: HEADERS(), next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ orders: [], error: res.status })
    const data = await res.json()

    const orders = (data.orders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      name: o.name,
      email: o.email || o.customer?.email,
      phone: o.phone || o.customer?.phone,
      customer_name: o.customer ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(' ') || o.customer.email || '' : o.shipping_address?.name || '',
      customer_id: o.customer?.id,
      total_price: o.total_price,
      currency: o.currency,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      created_at: o.created_at,
      tags: o.tags,
      note: o.note,
      shipping_address: o.shipping_address,
      line_items: o.line_items?.map((li: any) => ({
        id: li.id,
        title: li.title,
        quantity: li.quantity,
        price: li.price,
        sku: li.sku,
        variant_title: li.variant_title,
      })) || [],
      fulfillments: o.fulfillments || [],
      has_refund: (o.refunds || []).length > 0,
      tracking_number: o.fulfillments?.[0]?.tracking_number || null,
      tracking_url: o.fulfillments?.[0]?.tracking_url || null,
    }))

    return NextResponse.json({ orders })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message })
  }
}

export async function POST(req: Request) {
  const { id, action, data } = await req.json()
  const shop = process.env.SHOPIFY_STORE_URL
  const token = process.env.SHOPIFY_ACCESS_TOKEN
  if (!shop || !token) return NextResponse.json({ ok: false })

  // Not güncelle
  if (action === 'note') {
    const res = await fetch(`${SHOPIFY_URL()}/orders/${id}.json`, {
      method: 'PUT',
      headers: HEADERS(),
      body: JSON.stringify({ order: { id, note: data.note } })
    })
    return NextResponse.json({ ok: res.ok })
  }

  // Fulfillment oluştur
  if (action === 'fulfill') {
    const res = await fetch(`${SHOPIFY_URL()}/orders/${id}/fulfillments.json`, {
      method: 'POST',
      headers: HEADERS(),
      body: JSON.stringify({
        fulfillment: {
          notify_customer: data.notify || false,
          tracking_info: data.tracking_number ? {
            number: data.tracking_number,
            url: data.tracking_url || '',
            company: data.tracking_company || '',
          } : undefined,
        }
      })
    })
    return NextResponse.json({ ok: res.ok })
  }

  return NextResponse.json({ ok: false, error: 'Bilinmeyen action' })
}
