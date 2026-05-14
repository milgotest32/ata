import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { mesaj, telefonlar } = await req.json()

  if (!mesaj || !telefonlar || telefonlar.length === 0) {
    return NextResponse.json({ ok: false, mesaj: 'Mesaj veya alıcı listesi eksik.' })
  }

  const webhookUrl = process.env.N8N_BILDIRIM_WEBHOOK_URL

  if (!webhookUrl) {
    return NextResponse.json({ ok: false, mesaj: 'N8N_BILDIRIM_WEBHOOK_URL env variable tanımlı değil. Vercel Settings\'e ekleyin.' })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaj, telefonlar })
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, mesaj: `n8n hatası: ${res.status}` })
    }

    return NextResponse.json({
      ok: true,
      mesaj: `${telefonlar.length} kişiye bildirim gönderildi.`
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, mesaj: `Bağlantı hatası: ${e.message}` })
  }
}
