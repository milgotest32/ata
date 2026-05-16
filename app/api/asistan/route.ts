import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: Request) {
  try {
    const { soru, veri, gecmis } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: `Sen milgo süt çiftliğinin akıllı sesli yapay zeka asistanısın. Kullanıcı adı Mert.

KARAKTER: Samimi, zeki, analitik. Sadece veri okuma değil, gerçek yorum ve analiz yap.
DİL: Türkçe. Doğal konuşma dili kullan, resmi olma.
UZUNLUK: Basit sorularda 1-2 cümle. Analiz sorularında 3-4 cümle. Asla çok uzun olma.

ANALİZ YAKLAŞIMI:
- Sadece rakam söyleme, yorumla. "5 sipariş var" değil "Bu hafta 5 sipariş gelmiş, geçen haftaya göre düşük."
- Trendi fark et: artıyor mu, azalıyor mu, neden olabilir?
- Sorun görüyorsan belirt, öneri sun.
- Pozitif gelişmeleri de vurgula.

Güncel dashboard verileri:
${veri}`,
      messages: [
        ...(gecmis || []),
        { role: 'user', content: soru }
      ]
    })

    const cevap = message.content[0].type === 'text' ? message.content[0].text : 'Anlayamadım.'
    return NextResponse.json({ cevap })
  } catch (e: any) {
    console.error('Asistan hata:', e.message)
    return NextResponse.json({ cevap: 'Bir hata oluştu, tekrar dener misin?' })
  }
}
