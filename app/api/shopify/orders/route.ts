import { NextResponse } from 'next/server'

const SHOP = () => process.env.SHOPIFY_STORE_URL || ''
const TOKEN = () => process.env.SHOPIFY_ACCESS_TOKEN || ''
const REST = () => `https://${SHOP()}/admin/api/2024-01`
const H = () => ({
  'X-Shopify-Access-Token': TOKEN(),
  'Content-Type': 'application/json',
})

// GraphQL - müşteri adını kesin çeker
const GQL = () => `https://${SHOP()}/admin/api/2024-01/graphql.json`
const QUERY = `{
  orders(first: 50, reverse: true) {
    nodes {
      legacyResourceId
      name
      createdAt
      tags
      note
      displayFinancialStatus
      displayFulfillmentStatus
      email
      phone
      currentTotalPriceSet { shopMoney { amount } }
      customer { firstName lastName email phone }
      shippingAddress { address1 address2 city zip country phone }
      lineItems(first: 10) {
        nodes {
          title
          quantity
          variant { price sku title }
        }
      }
      fulfillments {
        trackingInfo { number url }
        status
      }
      refunds { id }
    }
  }
}`

function gqlMap(o: any) {
  const fn = (o.customer?.firstName || '').trim()
  const ln = (o.customer?.lastName || '').trim()
  const name = [fn, ln].filter(Boolean).join(' ') || o.customer?.email || o.email || '—'
  return {
    id: o.legacyResourceId,
    order_number: o.name?.replace('#', ''),
    name: o.name,
    email: o.email || o.customer?.email || '',
    phone: o.phone || o.customer?.phone || o.shippingAddress?.phone || '',
    customer_name: name,
    customer_id: o.customer?.id,
    total_price: o.currentTotalPriceSet?.shopMoney?.amount || '0',
    currency: 'TRY',
    financial_status: (o.displayFinancialStatus || '').toLowerCase(),
    fulfillment_status: (o.displayFulfillmentStatus || '').toLowerCase(),
    created_at: o.createdAt,
    tags: Array.isArray(o.tags) ? o.tags.join(', ') : (o.tags || ''),
    note: o.note || '',
    shipping_address: o.shippingAddress || null,
    line_items: (o.lineItems?.nodes || []).map((li: any) => ({
      id: Math.random(),
      title: li.title,
      quantity: li.quantity,
      price: li.variant?.price || '0',
      sku: li.variant?.sku || '',
      variant_title: li.variant?.title || '',
    })),
    fulfillments: o.fulfillments || [],
    has_refund: (o.refunds || []).length > 0,
    tracking_number: o.fulfillments?.[0]?.trackingInfo?.[0]?.number || null,
    tracking_url: o.fulfillments?.[0]?.trackingInfo?.[0]?.url || null,
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!SHOP() || !TOKEN()) return NextResponse.json({ orders: [], error: 'Shopify eksik' })

  // Tek sipariş - REST
  if (id) {
    const res = await fetch(`${REST()}/orders/${id}.json`, { headers: H() })
    if (!res.ok) return NextResponse.json({ order: null })
    const { order: o } = await res.json()
    const fn = (o.customer?.first_name || '').trim()
    const ln = (o.customer?.last_name || '').trim()
    return NextResponse.json({
      order: {
        id: o.id, order_number: o.order_number, name: o.name,
        email: o.email || o.customer?.email || '',
        phone: o.phone || o.customer?.phone || '',
        customer_name: [fn, ln].filter(Boolean).join(' ') || o.customer?.email || '—',
        total_price: o.total_price || '0', currency: o.currency,
        financial_status: o.financial_status, fulfillment_status: o.fulfillment_status,
        created_at: o.created_at, tags: o.tags || '', note: o.note || '',
        shipping_address: o.shipping_address, billing_address: o.billing_address,
        line_items: (o.line_items || []).map((li: any) => ({
          id: li.id, title: li.title, quantity: li.quantity,
          price: li.price, sku: li.sku, variant_title: li.variant_title,
        })),
        fulfillments: o.fulfillments || [],
        has_refund: (o.refunds || []).length > 0,
        tracking_number: o.fulfillments?.[0]?.tracking_number || null,
        tracking_url: o.fulfillments?.[0]?.tracking_url || null,
      }
    })
  }

  // Liste - GraphQL (müşteri adı kesin geliyor)
  try {
    const res = await fetch(GQL(), {
      method: 'POST',
      headers: H(),
      body: JSON.stringify({ query: QUERY }),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const { data, errors } = await res.json()
    if (errors) throw new Error(errors[0]?.message)
    return NextResponse.json({ orders: (data?.orders?.nodes || []).map(gqlMap) })
  } catch (e: any) {
    console.error('Shopify GQL hata:', e.message)
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
            number: data.tracking_number,
            url: data.tracking_url || '',
            company: data.tracking_company || '',
          } : undefined,
        }
      })
    })
    return NextResponse.json({ ok: res.ok })
  }

  return NextResponse.json({ ok: false })
}
