import { NextResponse } from 'next/server'

export async function GET() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN

  if (!domain || !token) {
    return NextResponse.json(
      { orders: [], error: 'Shopify yapılandırılmamış' },
      { status: 200 }
    )
  }

  try {
    const res = await fetch(
      `https://${domain}/admin/api/2024-10/orders.json?status=any&limit=50`,
      {
        headers: { 'X-Shopify-Access-Token': token },
        next: { revalidate: 30 },
      }
    )
    const data = await res.json()
    return NextResponse.json({ orders: data.orders || [] })
  } catch (e: any) {
    return NextResponse.json({ orders: [], error: e.message }, { status: 200 })
  }
}
