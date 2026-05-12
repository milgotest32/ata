import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json({ ok: false, error: 'Sunucu yapılandırılmamış' }, { status: 500 })
  }
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'Şifre yanlış' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('milgo-admin-auth', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 hafta
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('milgo-admin-auth')
  return res
}
