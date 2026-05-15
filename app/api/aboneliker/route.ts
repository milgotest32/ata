import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ subs: [], error: 'Supabase yapılandırılmamış' })
  }

  const client = createClient(url, key)

  const { data, error } = await client
    .from('abonelik')
    .select('id, ad, soyad, adet, durum, iletisim, created_at, adres, ilce, sehir')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Abonelik fetch error:', error)
    return NextResponse.json({ subs: [], error: error.message })
  }

  const subs = (data || []).map((s: any) => ({
    id: s.id,
    ad: s.ad || '',
    soyad: s.soyad || '',
    haftalik_adet: s.adet || 1,
    iletisim: s.iletisim || '',
    urun: 'Çiğ Süt 2L',
    fiyat_tekil: 130,
    durum: s.durum || 'bekliyor',
    created_at: s.created_at,
    adres: s.adres || '',
    ilce: s.ilce || '',
    sehir: s.sehir || 'İstanbul',
  }))

  return NextResponse.json({ subs })
}
