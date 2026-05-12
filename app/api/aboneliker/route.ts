import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ subs: [], error: 'Supabase yapılandırılmamış' })
  }

  const client = createClient(url, key)

  // 'aboneler' tablosu varsa onu kullan, yoksa boş dön
  const { data, error } = await client
    .from('aboneler')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    // Tablo yoksa boş dön (hata vermesin)
    return NextResponse.json({ subs: [] })
  }

  return NextResponse.json({ subs: data || [] })
}
