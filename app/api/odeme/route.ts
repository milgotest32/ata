import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const telefon = searchParams.get('telefon')
  let q = client().from('odeme_log').select('*').order('created_at', { ascending: false })
  if (telefon) q = q.eq('telefon', telefon)
  const { data } = await q.limit(100)
  return NextResponse.json({ odemeler: data || [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { telefon, ad, tutar, durum, odeme_turu, aciklama, donem } = body
  if (!telefon || !tutar) return NextResponse.json({ ok: false, error: 'Eksik alan' })
  const { error } = await client().from('odeme_log').insert({ telefon, ad, tutar, durum: durum || 'odendi', odeme_turu: odeme_turu || 'nakit', aciklama, donem })
  return NextResponse.json({ ok: !error, error: error?.message })
}

export async function PATCH(req: Request) {
  const { id, durum } = await req.json()
  const { error } = await client().from('odeme_log').update({ durum }).eq('id', id)
  return NextResponse.json({ ok: !error })
}
