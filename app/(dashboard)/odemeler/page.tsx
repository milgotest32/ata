'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Plus, Check, Clock, X, RefreshCw, TrendingUp, CreditCard } from 'lucide-react'
import { format, differenceInWeeks } from 'date-fns'
import { tr } from 'date-fns/locale'

type Odeme = {
  id: number; telefon: string; ad: string; tutar: number
  durum: string; odeme_turu: string; aciklama: string; donem: string; created_at: string
}
type Abonelik = {
  id: string; ad: string; soyad: string; iletisim: string
  haftalik_adet: number; fiyat_tekil: number; created_at: string; durum: string
}

export default function OdemelerPage() {
  const [odemeler, setOdemeler] = useState<Odeme[]>([])
  const [aboneler, setAboneler] = useState<Abonelik[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ show: false, telefon: '', ad: '', tutar: '', odeme_turu: 'nakit', aciklama: '', donem: '' })
  const [tab, setTab] = useState<'odemeler' | 'clv' | 'kayip'>('odemeler')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [o, a] = await Promise.all([
      fetch('/api/odeme').then(r => r.json()),
      fetch('/api/aboneliker').then(r => r.json())
    ])
    setOdemeler(o.odemeler || [])
    setAboneler(a.subs || [])
    setLoading(false)
  }

  async function odemeEkle() {
    if (!form.telefon || !form.tutar) return
    await fetch('/api/odeme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tutar: parseFloat(form.tutar) })
    })
    setForm({ show: false, telefon: '', ad: '', tutar: '', odeme_turu: 'nakit', aciklama: '', donem: '' })
    load()
  }

  async function durumDegistir(id: number, durum: string) {
    await fetch('/api/odeme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, durum })
    })
    load()
  }

  // Özet
  const toplamTahsilat = odemeler.filter(o => o.durum === 'odendi').reduce((s, o) => s + o.tutar, 0)
  const bekleyen = odemeler.filter(o => o.durum === 'bekliyor').reduce((s, o) => s + o.tutar, 0)
  const buAy = odemeler.filter(o => {
    const d = new Date(o.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && o.durum === 'odendi'
  }).reduce((s, o) => s + o.tutar, 0)

  // CLV hesaplama
  const aktifAboneler = aboneler.filter(a => a.durum === 'abone')
  const clvData = aktifAboneler.map(a => {
    const baslangic = new Date(a.created_at)
    const haftalar = differenceInWeeks(new Date(), baslangic) + 4 // min 4 hafta
    const aylar = haftalar / 4
    const haftalikGelir = a.haftalik_adet * (a.fiyat_tekil || 130)
    const toplamGelir = haftalikGelir * haftalar
    const tahminAylikGelir = haftalikGelir * 4
    return { ...a, haftalar, aylar, haftalikGelir, toplamGelir, tahminAylikGelir }
  }).sort((a, b) => b.toplamGelir - a.toplamGelir)

  // Kayıp analizi — bitti durumundakiler
  function hesaplaTeslimat(sub: Abonelik) {
    const baslangic = new Date(sub.created_at)
    const haftalar = differenceInWeeks(new Date(), baslangic) + 1
    return { durum: haftalar > 4 ? 'bitti' : 'devam' }
  }

  const kayiplar = aboneler.filter(a => {
    const bilgi = hesaplaTeslimat(a)
    return bilgi.durum === 'bitti'
  })

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-300 mb-2">ödeme & analiz</p>
          <h1 className="font-display text-3xl md:text-5xl text-ink-900 tracking-tight">Ödemeler</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setForm(f => ({ ...f, show: true }))}
            className="flex items-center gap-2 px-4 py-2 bg-ink-900 text-cream-50 rounded-xl text-sm font-medium hover:bg-ink-700 transition-colors">
            <Plus className="w-4 h-4" />Ödeme Ekle
          </button>
          <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-cream-200 rounded-xl text-ink-400 hover:text-ink-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Özet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Bu Ay Tahsilat', value: `${buAy.toLocaleString('tr')} TL`, icon: TrendingUp, color: 'bg-moss-50 border-moss-200 text-moss-700' },
          { label: 'Toplam Tahsilat', value: `${toplamTahsilat.toLocaleString('tr')} TL`, icon: DollarSign, color: 'bg-white border-cream-200 text-ink-900' },
          { label: 'Bekleyen', value: `${bekleyen.toLocaleString('tr')} TL`, icon: Clock, color: bekleyen > 0 ? 'bg-ember-50 border-ember-200 text-ember-700' : 'bg-white border-cream-200 text-ink-900' },
          { label: 'Toplam Kayıt', value: odemeler.length, icon: CreditCard, color: 'bg-white border-cream-200 text-ink-900' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`border rounded-2xl p-4 md:p-6 ${color}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400">{label}</span>
              <Icon className="w-4 h-4 text-ink-300" strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl md:text-3xl">{value}</div>
          </div>
        ))}
      </div>

      {/* Tablar */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-white border border-cream-200 rounded-xl p-1">
        {[
          { v: 'odemeler', l: '💳 Ödeme Listesi' },
          { v: 'clv', l: '💰 Müşteri Değeri (CLV)' },
          { v: 'kayip', l: '📉 Kayıp Analizi' },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v as any)}
            className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all ${tab === t.v ? 'bg-ink-900 text-cream-50' : 'text-ink-500 hover:text-ink-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* Ödeme listesi */}
      {tab === 'odemeler' && (
        <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-cream-50">
                <tr>{['Tarih','Müşteri','Tutar','Tür','Dönem','Açıklama','Durum',''].map(h => (
                  <th key={h} className="px-5 py-4 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {odemeler.map(o => (
                  <tr key={o.id} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3 text-xs text-ink-400 font-mono">{format(new Date(o.created_at), 'd MMM yyyy', { locale: tr })}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-ink-700">{o.ad}</div>
                      <div className="text-xs text-ink-400 font-mono">{o.telefon}</div>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm font-medium text-ink-900">{o.tutar.toLocaleString('tr')} TL</td>
                    <td className="px-5 py-3"><span className="text-xs bg-cream-100 text-ink-500 px-2 py-0.5 rounded-full font-mono">{o.odeme_turu}</span></td>
                    <td className="px-5 py-3 text-xs text-ink-400 font-mono">{o.donem || '—'}</td>
                    <td className="px-5 py-3 text-xs text-ink-500 max-w-[150px] truncate">{o.aciklama || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        o.durum === 'odendi' ? 'bg-moss-100 text-moss-700' :
                        o.durum === 'bekliyor' ? 'bg-cream-200 text-ink-600' :
                        'bg-ember-100 text-ember-700'
                      }`}>
                        {o.durum === 'odendi' ? <Check className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                        {o.durum}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {o.durum === 'bekliyor' && (
                        <button onClick={() => durumDegistir(o.id, 'odendi')}
                          className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded-lg hover:bg-moss-200 transition-colors">
                          Ödendi ✓
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {odemeler.length === 0 && !loading && (
              <div className="p-12 text-center">
                <CreditCard className="w-10 h-10 mx-auto text-cream-300 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-ink-500">Henüz ödeme kaydı yok</p>
                <p className="text-xs text-ink-300 mt-1">Sağ üstteki "Ödeme Ekle" butonunu kullan</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLV */}
      {tab === 'clv' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-moss-50 border border-moss-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-moss-600 mb-3">Ortalama CLV</p>
              <div className="font-display text-4xl text-moss-700">
                {clvData.length > 0 ? Math.round(clvData.reduce((s, a) => s + a.toplamGelir, 0) / clvData.length).toLocaleString('tr') : 0} TL
              </div>
              <p className="text-xs text-moss-500 font-mono mt-1">müşteri başına ortalama</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">En Değerli Müşteri</p>
              {clvData[0] ? (
                <>
                  <div className="font-display text-2xl text-ink-900">{clvData[0].ad} {clvData[0].soyad}</div>
                  <div className="font-mono text-lg text-moss-600 mt-1">{clvData[0].toplamGelir.toLocaleString('tr')} TL</div>
                  <div className="text-xs text-ink-300 font-mono">{Math.round(clvData[0].aylar)} ay · {clvData[0].haftalar} teslimat</div>
                </>
              ) : <p className="text-ink-300 font-mono text-sm">veri yok</p>}
            </div>
            <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-300 mb-3">Toplam Müşteri Değeri</p>
              <div className="font-display text-3xl text-cream-50">
                {clvData.reduce((s, a) => s + a.toplamGelir, 0).toLocaleString('tr')} TL
              </div>
              <p className="text-xs text-ink-400 font-mono mt-1">{clvData.length} aktif abone</p>
            </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-cream-100 bg-cream-50">
              <h2 className="font-display text-xl text-ink-900">Müşteri Yaşam Boyu Değeri</h2>
              <p className="text-xs text-ink-400 font-mono mt-0.5">Kayıt tarihinden bugüne kadar toplam getiri</p>
            </div>
            <table className="w-full">
              <thead>
                <tr>{['Sıra','Müşteri','Telefon','Üyelik','Haftalık','Toplam Getiri','Aylık Getiri'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {clvData.map((a, i) => (
                  <tr key={a.iletisim} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-ink-900 text-cream-50' : i === 1 ? 'bg-moss-200 text-moss-800' : i === 2 ? 'bg-cream-300 text-ink-600' : 'bg-cream-100 text-ink-400'
                      }`}>{i + 1}</div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-ink-900">{a.ad} {a.soyad}</td>
                    <td className="px-5 py-3 font-mono text-xs text-ink-500">{a.iletisim}</td>
                    <td className="px-5 py-3 text-xs text-ink-500 font-mono">{Math.round(a.aylar)} ay</td>
                    <td className="px-5 py-3 font-mono text-sm text-ink-700">{a.haftalik_adet} adet</td>
                    <td className="px-5 py-3">
                      <div className="font-mono text-sm font-bold text-moss-600">{a.toplamGelir.toLocaleString('tr')} TL</div>
                      <div className="h-1 bg-cream-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-moss-400 rounded-full" style={{ width: `${(a.toplamGelir / (clvData[0]?.toplamGelir || 1)) * 100}%` }} />
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-ink-500">{a.tahminAylikGelir.toLocaleString('tr')} TL</td>
                  </tr>
                ))}
                {clvData.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-ink-300 font-mono text-sm">aktif abone yok</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kayıp analizi */}
      {tab === 'kayip' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-ember-50 border border-ember-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ember-600 mb-3">Kayıp Abone</p>
              <div className="font-display text-4xl text-ember-700">{kayiplar.length}</div>
              <p className="text-xs text-ember-500 font-mono mt-1">yenileme yapmadı</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">Kayıp Gelir</p>
              <div className="font-display text-3xl text-ink-900">
                {kayiplar.reduce((s, a) => s + ((a as any).haftalik_adet || 0) * ((a as any).fiyat_tekil || 130) * 4, 0).toLocaleString('tr')} TL
              </div>
              <p className="text-xs text-ink-300 font-mono mt-1">aylık potansiyel</p>
            </div>
            <div className="bg-white border border-cream-200 rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">Elde Tutma Oranı</p>
              <div className="font-display text-3xl text-ink-900">
                %{aboneler.length > 0 ? Math.round(((aboneler.length - kayiplar.length) / aboneler.length) * 100) : 0}
              </div>
              <p className="text-xs text-ink-300 font-mono mt-1">retention rate</p>
            </div>
          </div>

          <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-cream-100 bg-cream-50">
              <h2 className="font-display text-xl text-ink-900">Yenileme Yapmayan Aboneler</h2>
              <p className="text-xs text-ink-400 font-mono mt-0.5">4 haftasını tamamlayıp yenileme yapmayan müşteriler</p>
            </div>
            {kayiplar.length === 0 ? (
              <div className="p-12 text-center">
                <Check className="w-10 h-10 mx-auto text-moss-300 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-ink-500 font-medium">Harika! Kayıp abone yok</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>{['Müşteri','Telefon','Kayıt Tarihi','Ürün','Haftalık Adet','Kayıp Gelir','Aksiyon'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.2em] text-ink-300">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {kayiplar.map((a: any, i) => (
                    <tr key={i} className="border-t border-cream-100 hover:bg-cream-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-ink-900">{a.ad} {a.soyad}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{a.iletisim}</td>
                      <td className="px-5 py-3 text-xs text-ink-400 font-mono">{a.created_at ? format(new Date(a.created_at), 'd MMM yyyy', { locale: tr }) : '—'}</td>
                      <td className="px-5 py-3 text-sm text-ink-500">{a.urun || 'Çiğ Süt'}</td>
                      <td className="px-5 py-3 font-mono text-sm text-ink-700">{a.haftalik_adet} adet</td>
                      <td className="px-5 py-3 font-mono text-sm text-ember-600">{(a.haftalik_adet * (a.fiyat_tekil || 130) * 4).toLocaleString('tr')} TL/ay</td>
                      <td className="px-5 py-3">
                        <a href={`https://wa.me/${a.iletisim}?text=Merhaba ${a.ad}! Aboneliğinizi yenilemek ister misiniz?`}
                          target="_blank"
                          className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded-lg hover:bg-moss-200 transition-colors">
                          WhatsApp →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Ödeme ekleme modal */}
      {form.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setForm(f => ({ ...f, show: false }))}>
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-ink-900">Ödeme Ekle</h2>
              <button onClick={() => setForm(f => ({ ...f, show: false }))} className="text-ink-300 hover:text-ink-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Telefon', key: 'telefon', placeholder: '905xxxxxxxxx' },
                { label: 'Ad Soyad', key: 'ad', placeholder: 'Mert İlker' },
                { label: 'Tutar (TL)', key: 'tutar', placeholder: '520' },
                { label: 'Dönem', key: 'donem', placeholder: 'Mayıs 2026 - 1. Dönem' },
                { label: 'Açıklama', key: 'aciklama', placeholder: 'İsteğe bağlı not' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] uppercase tracking-[0.2em] text-ink-300 block mb-1">{label}</label>
                  <input type="text" placeholder={placeholder} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-xl text-sm text-ink-700 focus:outline-none focus:border-moss-400" />
                </div>
              ))}
              <div>
                <label className="text-[10px] uppercase tracking-[0.2em] text-ink-300 block mb-1">Ödeme Türü</label>
                <select value={form.odeme_turu} onChange={e => setForm(f => ({ ...f, odeme_turu: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-cream-50 border border-cream-200 rounded-xl text-sm text-ink-700 focus:outline-none">
                  <option value="nakit">Nakit</option>
                  <option value="havale">Havale/EFT</option>
                  <option value="kart">Kredi Kartı</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>
            </div>
            <button onClick={odemeEkle} className="w-full mt-6 py-3 bg-ink-900 text-cream-50 rounded-xl text-sm font-medium hover:bg-ink-700 transition-colors">
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
