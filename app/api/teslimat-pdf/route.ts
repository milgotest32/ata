import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, nextFriday, startOfDay, addWeeks } from 'date-fns'
import { tr } from 'date-fns/locale'

function getCuma(): Date {
  const bugun = startOfDay(new Date())
  return bugun.getDay() === 5 ? bugun : nextFriday(bugun)
}

export async function GET() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data } = await client
    .from('abonelik')
    .select('*')
    .eq('durum', 'abone')
    .order('ad')

  const aboneler = data || []
  const cuma = getCuma()
  const tarih = format(cuma, "d MMMM yyyy, EEEE", { locale: tr })
  const toplamAdet = aboneler.reduce((sum: number, a: any) => sum + (a.adet || 0), 0)
  const toplamTutar = aboneler.reduce((sum: number, a: any) => sum + ((a.adet || 0) * 130), 0)

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1916; background: white; }
    .header { border-bottom: 2px solid #1a1916; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: -1px; }
    .logo span { color: #7c9059; }
    .title { font-size: 20px; font-weight: 600; margin-top: 8px; color: #3d3a30; }
    .date { font-size: 14px; color: #928c79; margin-top: 4px; font-family: monospace; }
    .summary { display: flex; gap: 20px; margin-bottom: 30px; }
    .summary-card { background: #f5f0e8; border-radius: 12px; padding: 16px 24px; flex: 1; }
    .summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #928c79; margin-bottom: 4px; }
    .summary-card .value { font-size: 28px; font-weight: 700; color: #1a1916; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1a1916; color: white; }
    th { padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    tbody tr { border-bottom: 1px solid #e8dfc8; }
    tbody tr:nth-child(even) { background: #faf7f0; }
    td { padding: 14px 16px; font-size: 14px; }
    .check { width: 20px; height: 20px; border: 2px solid #928c79; border-radius: 4px; display: inline-block; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e8dfc8; color: #928c79; font-size: 12px; font-family: monospace; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">milgo<span>.</span></div>
    <div class="title">Cuma Teslimat Listesi</div>
    <div class="date">${tarih}</div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Toplam Abone</div>
      <div class="value">${aboneler.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Toplam Adet</div>
      <div class="value">${toplamAdet}</div>
    </div>
    <div class="summary-card">
      <div class="label">Toplam Litre</div>
      <div class="value">${toplamAdet * 2}L</div>
    </div>
    <div class="summary-card">
      <div class="label">Toplam Tutar</div>
      <div class="value">${toplamTutar.toLocaleString('tr')} TL</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Ad Soyad</th>
        <th>Telefon</th>
        <th>Adet</th>
        <th>Tutar</th>
        <th>Teslim ✓</th>
        <th>Not</th>
      </tr>
    </thead>
    <tbody>
      ${aboneler.map((a: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${a.ad || ''} ${a.soyad || ''}</strong></td>
        <td style="font-family:monospace">${a.iletisim || ''}</td>
        <td><strong>${a.adet}</strong> adet</td>
        <td style="font-family:monospace">${((a.adet || 0) * 130).toLocaleString('tr')} TL</td>
        <td><span class="check"></span></td>
        <td style="width:120px"></td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="footer">
    milgo. teslimat sistemi · ${new Date().toLocaleString('tr')} · ${aboneler.length} kayıt
  </div>

  <script>window.onload = () => window.print()</script>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  })
}
