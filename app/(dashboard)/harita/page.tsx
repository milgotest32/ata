'use client'

import { useEffect, useState } from 'react'
import { MapPin, Truck, RefreshCw, Package, ExternalLink } from 'lucide-react'
import { format, nextFriday, startOfDay } from 'date-fns'
import { tr } from 'date-fns/locale'

type Adres = {
  ad: string; telefon: string; adres: string; sehir: string; ilce: string
  kaynak: 'abonelik' | 'shopify'; adet?: number; siparis?: string; durum?: string
}

export default function HaritaPage() {
  const [adresler, setAdresler] = useState<Adres[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<'hepsi' | 'abonelik' | 'shopify'>('hepsi')
  const [haritaGoster, setHaritaGoster] = useState(false)

  const bugunCuma = startOfDay(new Date()).getDay() === 5
  const sonrakiCuma = bugunCuma ? new Date() : nextFriday(new Date())

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [abRes, sipRes] = await Promise.all([
      fetch('/api/aboneliker').then(r => r.json()),
      fetch('/api/shopify/orders').then(r => r.json()),
    ])

    const list: Adres[] = []

    const aboneler = (abRes.subs || []).filter((a: any) => a.durum === 'abone')
    aboneler.forEach((a: any) => {
      list.push({
        ad: `${a.ad} ${a.soyad}`.trim() || a.iletisim,
        telefon: a.iletisim,
        adres: a.adres || '—',
        sehir: a.sehir || 'İstanbul',
        ilce: a.ilce || '',
        kaynak: 'abonelik',
        adet: a.haftalik_adet,
      })
    })

    const siparisler = (sipRes.orders || [])
    siparisler.forEach((o: any) => {
      if (o.shipping_address) {
        list.push({
          ad: o.customer_name || o.shipping_address.name || '—',
          telefon: o.phone || '—',
          adres: o.shipping_address.address1 || '',
          sehir: o.shipping_address.city || '',
          ilce: o.shipping_address.address2 || '',
          kaynak: 'shopify',
          siparis: o.name,
          durum: o.fulfillment_status,
        })
      }
    })

    setAdresler(list)
    setLoading(false)
  }

  const filtered = adresler.filter(a => filtre === 'hepsi' || a.kaynak === filtre)

  const sehirMap: Record<string, Adres[]> = {}
  filtered.forEach(a => {
    const key = a.sehir || 'Bilinmiyor'
    if (!sehirMap[key]) sehirMap[key] = []
    sehirMap[key].push(a)
  })

  // Google Maps arama sorgusu oluştur
  const shopifyAdresleri = filtered.filter(a => a.kaynak === 'shopify' && a.adres !== '—')
  const mapsQuery = shopifyAdresleri.map(a => `${a.adres} ${a.sehir}`).join('|')
  const mapsUrl = shopifyAdresleri.length > 0
    ? `https://www.google.com/maps/dir/${shopifyAdresleri.map(a => encodeURIComponent(`${a.adres} ${a.sehir}`)).join('/')}`
    : `https://www.google.com/maps/search/${encodeURIComponent('İstanbul')}`

  const toplamAdet = filtered.filter(a => a.kaynak === 'abonelik').reduce((s, a) => s + (a.adet || 0), 0)

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">teslimat planlama</p>
        <div className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Teslimat Haritası</h1>
          <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-cream-200 rounded-xl text-ink-400 hover:text-ink-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Cuma özeti */}
      <div className="bg-moss-50 border border-moss-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-moss-200 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-moss-700" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-moss-600 mb-1">Sonraki Teslimat</div>
              <div className="font-medium text-moss-900">{format(sonrakiCuma, "d MMMM yyyy, EEEE", { locale: tr })}</div>
              <div className="text-sm text-moss-600 font-mono mt-0.5">{filtered.length} adres · {toplamAdet} adet · {toplamAdet * 2}L süt</div>
            </div>
          </div>
          <div className="flex gap-2">
            {shopifyAdresleri.length > 0 && (
              <a href={mapsUrl} target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-moss-600 text-white rounded-xl text-sm font-medium hover:bg-moss-700 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                Google Maps'te Aç
              </a>
            )}
            <button onClick={() => window.print()}
              className="px-4 py-2 bg-white border border-moss-300 text-moss-700 rounded-xl text-sm font-medium hover:bg-moss-50 transition-colors">
              🖨️ Yazdır
            </button>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-6">
        {[
          {v:'hepsi', l:`Hepsi (${adresler.length})`},
          {v:'abonelik', l:`Abonelik (${adresler.filter(a=>a.kaynak==='abonelik').length})`},
          {v:'shopify', l:`Sipariş (${adresler.filter(a=>a.kaynak==='shopify').length})`}
        ].map(f => (
          <button key={f.v} onClick={() => setFiltre(f.v as any)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${filtre === f.v ? 'bg-ink-900 text-cream-50' : 'bg-white border border-cream-200 text-ink-500'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Şehir bazlı gruplar */}
      <div className="space-y-4">
        {loading ? [1,2].map(i => <div key={i} className="h-40 bg-cream-100 rounded-2xl animate-pulse" />) :
        Object.entries(sehirMap).map(([sehir, adresListesi]) => (
          <div key={sehir} className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 bg-cream-50 border-b border-cream-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ink-400" strokeWidth={1.5} />
                <h2 className="font-display text-xl text-ink-900">{sehir}</h2>
                <span className="text-xs text-ink-400 font-mono">{adresListesi.length} adres</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-ink-400 font-mono">
                  {adresListesi.filter(a => a.kaynak === 'abonelik').reduce((s, a) => s + (a.adet || 0), 0)} litre
                </span>
                {adresListesi.some(a => a.adres !== '—') && (
                  <a href={`https://www.google.com/maps/search/${encodeURIComponent(sehir + ' ' + adresListesi.filter(a=>a.adres!=='—').map(a=>a.adres).join(', '))}`}
                    target="_blank"
                    className="text-xs text-moss-600 flex items-center gap-1 hover:text-moss-700">
                    <ExternalLink className="w-3 h-3" />Harita
                  </a>
                )}
              </div>
            </div>
            <div className="divide-y divide-cream-100">
              {adresListesi.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${a.kaynak === 'abonelik' ? 'bg-moss-100 text-moss-700' : 'bg-cream-200 text-ink-600'}`}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink-900">{a.ad}</div>
                      <div className="text-xs text-ink-400 truncate">
                        {a.adres && a.adres !== '—' ? `${a.adres}${a.ilce ? `, ${a.ilce}` : ''}` : a.telefon}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.kaynak === 'abonelik' && a.adet && (
                      <span className="text-xs font-mono text-moss-600 font-medium">{a.adet} adet</span>
                    )}
                    {a.siparis && <span className="text-xs font-mono text-ink-400">{a.siparis}</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.kaynak === 'abonelik' ? 'bg-moss-100 text-moss-700' : 'bg-cream-200 text-ink-600'}`}>
                      {a.kaynak === 'abonelik' ? 'Abone' : 'Sipariş'}
                    </span>
                    {a.adres !== '—' && (
                      <a href={`https://www.google.com/maps/search/${encodeURIComponent(a.adres + ' ' + a.sehir)}`}
                        target="_blank"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-cream-100 text-ink-500 hover:bg-moss-100 hover:text-moss-700 transition-colors">
                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="p-12 text-center bg-white border border-cream-200 rounded-2xl">
            <Truck className="w-10 h-10 mx-auto text-cream-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-ink-500">Teslimat adresi bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  )
}
