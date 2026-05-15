import { NextResponse } from 'next/server'

export async function GET() {
  const shop = process.env.SHOPIFY_STORE_URL
  const token = process.env.SHOPIFY_ACCESS_TOKEN

  if (!shop || !token) {
    return NextResponse.json({
      orders: [],
      error: 'SHOPIFY_STORE_URL veya SHOPIFY_ACCESS_TOKEN Vercel\'e eklenmemiş.'
    })
  }

  try {
    const res = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&limit=50`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }
      }
    )

    if (!res.ok) {
      return NextResponse.json({ orders: [], error: `Shopify API hatası: ${res.status}` })
    }

    const data = await res.json()
    const orders = (data.orders || []).map((o: any) => ({
      id: o.id,
      order_number: o.order_number,
      name: o.name,
      email: o.email,
      phone: o.phone,
      total_price: o.total_price,
      currency: o.currency,
      financial_status: o.financial_status,
      fulfillment_status: o.fulfillment_status,
      created_at: o.created_at,
      line_items: o.line_items?.map((li: any) => ({
        title: li.title,
        quantity: li.quantity,
        price: li.price,
      })) || [],
    }))

    return NextResponse.json({ orders })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message })
  }
}
