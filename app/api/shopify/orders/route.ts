import { NextResponse } from 'next/server'

const SHOPIFY_URL = () => `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-01`
const HEADERS = () => ({
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '',
  'Content-Type': 'application/json',
})

function getCustomerName(o: any): string {
  // 1. shipping_address.name - en güvenilir kaynak
  const shipName = o.shipping_address?.name?.trim()
  if (shipName) return shipName

  // 2. customer first + last name
  const fn = (o.customer?.first_name || '').trim()
  const ln = (o.customer?.last_name || '').trim()
  const fullName = [fn, ln].filter(Boolean).join(' ')
  if (fullName) return fullName

  // 3. billing_address.name
  const billName = o.billing_address?.name?.trim()
  if (billName) return billName

  // 4. email
  if (o.customer?.email) return o.customer.email
  if (o.email) return o.email

  return '—'
}

function mapOrder(o: any) {
  return {
    id: o.id,
    order_number: o.order_number,
    name: o.name,
    email: o.email || o.customer?.email || '',
    phone: o.phone || o.customer?.phone || o.shipping_address?.phone || '',
    customer_name: getCustomerName(o),
    customer_id: o.customer?.id,
    total_price: o.total_price || '0',
    currency: o.currency,
    financial_status: o.financial_status,
    fulfillment_status: o.fulfillment_status,
    created_at: o.created_at,
    tags: o.tags,
    note: o.note,
    shipping_address: o.shipping_address,
    billing_address: o.billing_address,
    line_items: (o.line_items || []).map((li: any) => ({
      id: li.id,
      title: li.title,
      quantity: li.quantity,
      price: li.price,
      sku: li.sku,
      variant_title: li.variant_title,
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
  const shop = process.env.SHOPIFY_STORE_URL
  const token = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shop || !token) {
    return NextResponse.json({ orders: [], error: 'Shopify yapılandırılmamış' })
  }

  if (id) {
    const res = await fetch(
      `${SHOPIFY_URL()}/orders/${id}.json`,
      { headers: HEADERS() }
    )
    if (!res.ok) return NextResponse.json({ order: null, error: res.status })
    const data = await res.json()
    return NextResponse.json({ order: mapOrder(data.order) })
  }

  try {
    const res = await fetch(
      `${SHOPIFY_URL()}/orders.json?status=any&limit=50`,
      { headers: HEADERS(), next: { revalidate: 60 } }
    )
    if (!res.ok) return NextResponse.json({ orders: [], error: res.status })
    const data = await res.json()

    // Debug: ilk siparişin ham verisini logla
    if (data.orders?.[0]) {
      const first = data.orders[0]
      console.log('DEBUG order:', JSON.stringify({
        name: first.name,
        customer: first.customer,
        shipping_name: first.shipping_address?.name,
        billing_name: first.billing_address?.name,
      }))
    }

    return NextResponse.json({ orders: (data.orders || []).map(mapOrder) })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message })
  }
}

export async function POST(req: Request) {
  const { id, action, data } = await req.json()
  const shop = process.env.SHOPIFY_STORE_URL
  const token = process.env.SHOPIFY_ACCESS_TOKEN
  if (!shop || !token) return NextResponse.json({ ok: false })

  if (action === 'note') {
    const res = await fetch(`${SHOPIFY_URL()}/orders/${id}.json`, {
      method: 'PUT',
      headers: HEADERS(),
      body: JSON.stringify({ order: { id, note: data.note } })
    })
    return NextResponse.json({ ok: res.ok })
  }

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
