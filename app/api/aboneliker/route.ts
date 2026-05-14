import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ subs: [], error: 'Supabase yapılandırılmamış' })
  }

  const client = createClient(url, key)

  // wa_sessions tablosundan abonelik sürecindeki kullanıcıları çek
  const { data, error } = await client
    .from('wa_sessions')
    .select('phone, last_intent, pending_action, musteri_yazdigi, updated_at, kvkk_onay')
    .or('last_intent.eq.subscription,pending_action.like.sub:%')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ subs: [] })
  }

  // wa_sessions verisini abonelik formatına çevir
  const subs = (data || []).map((s: any) => {
    // pending_action'dan abonelik detaylarını parse et
    // Format: sub:step|urun_key|adet|ad|soyad|iletisim
    const pa = s.pending_action || ''
    let urun = 'Çiğ Süt 2L'
    let adet = 1
    let durum = 'bekliyor'

    if (pa.startsWith('sub:')) {
      const parts = pa.substring(4).split('|')
      const step = parts[0]
      if (parts[1]) urun = parts[1] === 'cig_sut' ? 'Çiğ Süt 2L' : parts[1]
      if (parts[2]) adet = parseInt(parts[2]) || 1
      // Ödeme tetiklendiyse aktif say
      if (step === 'done' || step === 'paid') durum = 'abone'
    } else if (s.last_intent === 'subscription') {
      durum = 'bekliyor'
    }

    return {
      id: s.phone,
      ad: s.phone,
      soyad: '',
      haftalik_adet: adet,
      iletisim: s.phone,
      urun,
      fiyat_tekil: urun.includes('Süt') ? 130 : 98,
      durum,
      submitted_at: s.updated_at,
    }
  })

  return NextResponse.json({ subs })
}
