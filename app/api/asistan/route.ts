import { NextResponse } from 'next/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_KEY = process.env.GROQ_API_KEY || ''

export async function POST(req: Request) {
  try {
    const { soru, veri, gecmis } = await req.json()

    const mesajlar = [
      {
        role: 'system',
        content: `Sen milgo süt çiftliğinin akıllı sesli yapay zeka asistanısın. Kullanıcı adı Mert.

KARAKTER: Samimi, zeki, analitik. Sadece veri okuma değil, gerçek yorum ve analiz yap.
DİL: Türkçe. Doğal konuşma dili kullan, resmi olma.
UZUNLUK: Basit sorularda 1-2 cümle. Analiz sorularında 3-4 cümle. Asla çok uzun olma.

ANALİZ YAKLAŞIMI:
- Sadece rakam söyleme, yorumla. "5 sipariş var" değil "Bu hafta 5 sipariş gelmiş, geçen haftaya göre düşük, dikkat etmek lazım."
- Trendi fark et: artıyor mu, azalıyor mu, neden olabilir?
- Sorun görüyorsan belirt, öneri sun.
- Pozitif gelişmeleri de vurgula.

Güncel dashboard verileri:
${veri}`
      },
      ...(gecmis || []),
      { role: 'user', content: soru }
    ]

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: mesajlar,
        max_tokens: 200,
        temperature: 0.7,
      })
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Groq hata:', err)
      return NextResponse.json({ cevap: 'Yapay zeka bağlantısı kurulamadı.' })
    }

    const data = await res.json()
    const cevap = data.choices?.[0]?.message?.content || 'Anlayamadım, tekrar söyler misin?'
    return NextResponse.json({ cevap })
  } catch (e: any) {
    console.error('Asistan hata:', e.message)
    return NextResponse.json({ cevap: 'Bir hata oluştu, tekrar dener misin?' })
  }
}
