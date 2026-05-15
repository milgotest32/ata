import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data } = await db().from('kullanicilar').select('id,ad,kullanici_adi,rol,aktif,son_giris,created_at,yetkiler').order('created_at')
  return NextResponse.json({ kullanicilar: data || [] })
}

export async function POST(req: Request) {
  const { ad, kullanici_adi, sifre_hash, rol } = await req.json()
  if (!ad || !kullanici_adi || !sifre_hash || !rol) return NextResponse.json({ ok: false, error: 'Eksik alan' })
  const { error } = await db().from('kullanicilar').insert({ ad, kullanici_adi, sifre_hash, rol })
  return NextResponse.json({ ok: !error, error: error?.message })
}

export async function PATCH(req: Request) {
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ ok: false })
  const { error } = await db().from('kullanicilar').update(updates).eq('id', id)
  return NextResponse.json({ ok: !error, error: error?.message })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ ok: false })
  const { error } = await db().from('kullanicilar').delete().eq('id', id)
  return NextResponse.json({ ok: !error })
}
