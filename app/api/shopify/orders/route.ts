import { NextResponse } from 'next/server'

const SHOP = () => process.env.SHOPIFY_STORE_URL || ''
const TOKEN = () => process.env.SHOPIFY_ACCESS_TOKEN || ''

const GQL_URL = () => `https://${SHOP()}/admin/api/2024-01/graphql.json`
const REST_URL = () => `https://${SHOP()}/admin/api/2024-01`

const HEADERS = () => ({
  'X-Shopify-Access-Token': TOKEN(),
  'Content-Type': 'application/json',
})

// GraphQL ile sipariş listesi - müşteri adı kesinlikle geliyor
const ORDERS_QUERY = `{
  orders(first: 50, reverse: true) {
    nodes {
      id
      name
      legacyResourceId
      createdAt
      tags
      note
      displayFinancialStatus
      displayFulfillmentStatus
      currentTotalPriceSet { shopMoney { amount } }
      customer {
        firstName
        lastName
        email
        phone
      }
      shippingAddress {
        name
        address1
        address2
        city
        zip
        country
        phone
      }
      lineItems(first: 10) {
        nodes {
          id
          title
          quantity
          variant { price sku title }
        }
      }
      fulfillments {
        trackingInfo { number url company }
        status
      }
      refunds { id }
    }
  }
}`

function mapGQLOrder(o: any) {
  const customerName =
    [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(' ').trim() ||
    o.shippingAddress?.name?.trim() ||
    o.customer?.email || '—'

  return {
    id: o.legacyResourceId,
    order_number: o.name.replace('#', '').replace('MİL', ''),
    name: o.name,
    email: o.customer?.email || '',
    phone: o.customer?.phone || o.shippingAddress?.phone || '',
    customer_name: customerName,
    customer_id: o.customer?.id,
    total_price: o.currentTotalPriceSet?.shopMoney?.amount || '0',
    currency: 'TRY',
    financial_status: o.displayFinancialStatus?.toLowerCase() || '',
    fulfillment_status: o.displayFulfillmentStatus?.toLowerCase() || '',
    created_at: o.createdAt,
    tags: o.tags?.join(', ') || '',
    note: o.note || '',
    shipping_address: o.shippingAddress ? {
      name: o.shippingAddress.name,
      address1: o.shippingAddress.address1,
      address2: o.shippingAddress.address2,
      city: o.shippingAddress.city,
      zip: o.shippingAddress.zip,
      country: o.shippingAddress.country,
      phone: o.shippingAddress.phone,
    } : null,
    line_items: (o.lineItems?.nodes || []).map((li: any) => ({
      id: li.id,
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

  if (!SHOP() || !TOKEN()) {
    return NextResponse.json({ orders: [], error: 'Shopify yapılandırılmamış' })
  }

  // Tek sipariş - REST kullan
  if (id) {
    const res = await fetch(`${REST_URL()}/orders/${id}.json`, { headers: HEADERS() })
    if (!res.ok) return NextResponse.json({ order: null, error: res.status })
    const data = await res.json()
    const o = data.order
    const customerName =
      [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(' ').trim() ||
      o.shipping_address?.name?.trim() ||
      o.billing_address?.name?.trim() ||
      o.customer?.email || '—'
    return NextResponse.json({
      order: {
        id: o.id, order_number: o.order_number, name: o.name,
        email: o.email || o.customer?.email || '',
        phone: o.phone || o.customer?.phone || '',
        customer_name: customerName,
        total_price: o.total_price || '0',
        currency: o.currency,
        financial_status: o.financial_status,
        fulfillment_status: o.fulfillment_status,
        created_at: o.created_at,
        tags: o.tags, note: o.note,
        shipping_address: o.shipping_address,
        billing_address: o.billing_address,
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

  // Sipariş listesi - GraphQL kullan (müşteri adı kesin geliyor)
  try {
    const res = await fetch(GQL_URL(), {
      method: 'POST',
      headers: HEADERS(),
      body: JSON.stringify({ query: ORDERS_QUERY }),
      next: { revalidate: 60 }
    })
    if (!res.ok) return NextResponse.json({ orders: [], error: res.status })
    const data = await res.json()
    const orders = (data.data?.orders?.nodes || []).map(mapGQLOrder)
    return NextResponse.json({ orders })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message })
  }
}

export async function POST(req: Request) {
  const { id, action, data } = await req.json()
  if (!SHOP() || !TOKEN()) return NextResponse.json({ ok: false })

  if (action === 'note') {
    const res = await fetch(`${REST_URL()}/orders/${id}.json`, {
      method: 'PUT', headers: HEADERS(),
      body: JSON.stringify({ order: { id, note: data.note } })
    })
    return NextResponse.json({ ok: res.ok })
  }

  if (action === 'fulfill') {
    const res = await fetch(`${REST_URL()}/orders/${id}/fulfillments.json`, {
      method: 'POST', headers: HEADERS(),
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

  return NextResponse.json({ ok: false, error: 'Bilinmeyen action' })
}
